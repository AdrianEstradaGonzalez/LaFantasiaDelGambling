/**
 * SERVICIO DE ESTADÍSTICAS DE JUGADORES
 *
 * Responsable de:
 * - Consultar estadísticas de la API Football
 * - Calcular puntos según DreamLeague
 * - Almacenar estadísticas reales en BD
 * - Proporcionar datos al frontend (sin cálculos)
 */
import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';
import { AppError } from '../utils/errors.js';
import { calculatePlayerPoints, normalizeRole, } from '../shared/pointsCalculator.js';
const prisma = new PrismaClient();
const API_BASE = 'https://v3.football.api-sports.io';
const FALLBACK_APISPORTS_KEY = '099ef4c6c0803639d80207d4ac1ad5da';
const DEFAULT_CACHE_TTL_MS = Number(process.env.FOOTBALL_API_CACHE_TTL_MS ?? 60000);
const DEFAULT_REQUEST_DELAY_MS = Number(process.env.FOOTBALL_API_DELAY_MS ?? 350);
function buildHeaders() {
    const candidates = [
        process.env.FOOTBALL_API_KEY,
        process.env.APISPORTS_API_KEY,
        process.env.API_FOOTBALL_KEY,
        process.env.APISPORTS_KEY,
    ].filter(Boolean);
    if (candidates.length > 0)
        return { 'x-apisports-key': candidates[0] };
    const rapidCandidates = [
        process.env.RAPIDAPI_KEY,
        process.env.RAPIDAPI_FOOTBALL_KEY,
        process.env.API_FOOTBALL_RAPID_KEY,
    ].filter(Boolean);
    if (rapidCandidates.length > 0)
        return { 'x-rapidapi-key': rapidCandidates[0], 'x-rapidapi-host': 'v3.football.api-sports.io' };
    return { 'x-apisports-key': FALLBACK_APISPORTS_KEY };
}
const api = axios.create({ baseURL: API_BASE, timeout: 15000, headers: buildHeaders() });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
// ✨ NUEVO: Función auxiliar para reintentar peticiones a la API
async function retryApiCall(callFn, maxRetries = 3, delayMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await callFn();
        }
        catch (error) {
            lastError = error;
            console.warn(`[playerStats] Intento ${attempt}/${maxRetries} falló:`, error.message);
            if (attempt < maxRetries) {
                console.log(`[playerStats] Reintentando en ${delayMs}ms...`);
                await delay(delayMs);
                // Aumentar el delay para el siguiente intento (backoff exponencial)
                delayMs *= 1.5;
            }
        }
    }
    throw lastError;
}
function getFromCache(cache, key) {
    const entry = cache.get(key);
    if (!entry)
        return undefined;
    if (entry.expiresAt < Date.now()) {
        cache.delete(key);
        return undefined;
    }
    return entry.data;
}
function setInCache(cache, key, data) {
    if (DEFAULT_CACHE_TTL_MS <= 0)
        return;
    cache.set(key, { data, expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS });
}
const fixturesCache = new Map();
const playerInfoCache = new Map();
const fixturePlayersCache = new Map();
const fixtureEventsCache = new Map();
/**
 * Obtiene los eventos de un partido (sustituciones, goles, tarjetas, etc.)
 */
async function fetchFixtureEvents(fixtureId) {
    const cacheKey = String(fixtureId);
    const cached = getFromCache(fixtureEventsCache, cacheKey);
    if (cached !== undefined)
        return cached;
    await delay(DEFAULT_REQUEST_DELAY_MS);
    const response = await api.get('/fixtures/events', { params: { fixture: fixtureId } });
    const events = response.data?.response ?? [];
    setInCache(fixtureEventsCache, cacheKey, events);
    return events;
}
/**
 * Calcula los minutos reales jugados sin tiempo de descuento
 * basándose en los eventos de sustitución del partido
 *
 * @param playerId - ID del jugador
 * @param playerName - Nombre del jugador
 * @param fixtureId - ID del partido
 * @param rawMinutes - Minutos reportados por la API (pueden incluir descuento)
 * @param wasSubstitute - Si el jugador empezó como suplente
 * @returns Minutos sin descuento (máximo 90)
 */
async function calculateMinutesWithoutInjuryTime(playerId, playerName, fixtureId, rawMinutes, wasSubstitute) {
    // ✨ IMPORTANTE: Si el jugador no jugó ningún minuto según la API, devolver 0 directamente
    if (rawMinutes === 0) {
        console.log(`[playerStats] ⏱️  Jugador ${playerName}: 0 min (no jugó)`);
        return 0;
    }
    try {
        const events = await fetchFixtureEvents(fixtureId);
        // Normalizar nombre para comparación
        const normalizeName = (name) => {
            return name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[.]/g, '')
                .trim()
                .toLowerCase();
        };
        const normalizedPlayerName = normalizeName(playerName);
        // Buscar evento de entrada (si fue suplente)
        let entryMinute = 0;
        if (wasSubstitute) {
            const entryEvent = events.find((e) => e.type === 'subst' &&
                e.assist?.id === playerId ||
                (e.assist?.name && normalizeName(e.assist.name) === normalizedPlayerName));
            if (entryEvent) {
                // El minuto puede ser "45+2" o "90", extraer solo el número base
                const minuteStr = String(entryEvent.time?.elapsed ?? 0);
                entryMinute = parseInt(minuteStr.split('+')[0]);
                console.log(`[playerStats] 🔄 Jugador ${playerName} entró en minuto ${entryMinute}`);
            }
            else if (wasSubstitute && rawMinutes > 0) {
                // Si fue suplente pero no se encontró evento de entrada y jugó minutos,
                // probablemente entró muy tarde. Calcular basándonos en rawMinutes.
                entryMinute = 90 - rawMinutes;
                console.log(`[playerStats] ⚠️  No se encontró evento de entrada para ${playerName}, calculando: entró en min ${entryMinute}`);
            }
        }
        // Buscar evento de salida (si fue sustituido)
        let exitMinute = 90; // Por defecto, asumimos que jugó hasta el final
        const exitEvent = events.find((e) => e.type === 'subst' &&
            (e.player?.id === playerId ||
                (e.player?.name && normalizeName(e.player.name) === normalizedPlayerName)));
        if (exitEvent) {
            const minuteStr = String(exitEvent.time?.elapsed ?? 90);
            exitMinute = parseInt(minuteStr.split('+')[0]);
            console.log(`[playerStats] 🔄 Jugador ${playerName} salió en minuto ${exitMinute}`);
        }
        // Calcular minutos sin descuento
        let minutesWithoutInjuryTime = Math.min(exitMinute - entryMinute, 90);
        // ✨ IMPORTANTE: Si el jugador participó (rawMinutes > 0) pero el cálculo da 0
        // (por ejemplo, salió en el minuto 90+5), registrar al menos 1 minuto
        if (rawMinutes > 0 && minutesWithoutInjuryTime === 0) {
            minutesWithoutInjuryTime = 1;
            console.log(`[playerStats] ⚠️  Jugador ${playerName} jugó en descuento, registrando 1 minuto mínimo`);
        }
        // Si el cálculo da más minutos de los que reporta la API, usar el valor de la API (limitado a 90)
        if (minutesWithoutInjuryTime > rawMinutes) {
            minutesWithoutInjuryTime = Math.min(rawMinutes, 90);
            console.log(`[playerStats] ⚠️  Ajustando minutos de ${playerName} a ${minutesWithoutInjuryTime} (API reporta ${rawMinutes})`);
        }
        console.log(`[playerStats] ⏱️  Jugador ${playerName}: ${rawMinutes} min (API) → ${minutesWithoutInjuryTime} min (sin descuento)`);
        return minutesWithoutInjuryTime;
    }
    catch (error) {
        console.warn(`[playerStats] ⚠️  No se pudieron obtener eventos del partido ${fixtureId}, usando cálculo básico:`, error);
        // Fallback: usar el método anterior (límite de 90)
        const fallbackMinutes = Math.min(rawMinutes, 90);
        // También aplicar el mínimo de 1 minuto en el fallback
        return rawMinutes > 0 && fallbackMinutes === 0 ? 1 : fallbackMinutes;
    }
}
/**
 * Extrae estadísticas de un objeto stats de API-Football
 */
function extractStats(stats) {
    const games = stats.games || {};
    const goals = stats.goals || {};
    const shots = stats.shots || {};
    const passes = stats.passes || {};
    const tackles = stats.tackles || {};
    const duels = stats.duels || {};
    const dribbles = stats.dribbles || {};
    const fouls = stats.fouls || {};
    const cards = stats.cards || {};
    const penalty = stats.penalty || {};
    return {
        // Games
        minutes: Number(games.minutes ?? 0),
        position: games.position ?? null,
        rating: games.rating ?? null,
        captain: Boolean(games.captain),
        substitute: Boolean(games.substitute),
        // Goals
        goals: Number(goals.total ?? 0),
        assists: Number(goals.assists ?? 0),
        conceded: Number(goals.conceded ?? stats.goalkeeper?.conceded ?? 0),
        saves: Number(stats.goalkeeper?.saves ?? goals.saves ?? 0),
        // Shots
        shotsTotal: Number(shots.total ?? 0),
        shotsOn: Number(shots.on ?? 0),
        // Passes
        passesTotal: Number(passes.total ?? 0),
        passesKey: Number(passes.key ?? 0),
        passesAccuracy: passes.accuracy != null ? Number(passes.accuracy) : null,
        // Tackles
        tacklesTotal: Number(tackles.total ?? 0),
        tacklesBlocks: Number(tackles.blocks ?? 0),
        tacklesInterceptions: Number(tackles.interceptions ?? 0),
        // Duels
        duelsTotal: Number(duels.total ?? 0),
        duelsWon: Number(duels.won ?? 0),
        // Dribbles
        dribblesAttempts: Number(dribbles.attempts ?? 0),
        dribblesSuccess: Number(dribbles.success ?? 0),
        dribblesPast: Number(dribbles.past ?? 0),
        // Fouls
        foulsDrawn: Number(fouls.drawn ?? 0),
        foulsCommitted: Number(fouls.committed ?? 0),
        // Cards
        yellowCards: Number(cards.yellow ?? 0),
        redCards: Number(cards.red ?? 0),
        // Penalty
        penaltyWon: Number(penalty.won ?? 0),
        penaltyCommitted: Number(penalty.committed ?? 0),
        penaltyScored: Number(penalty.scored ?? 0),
        penaltyMissed: Number(penalty.missed ?? 0),
        penaltySaved: Number(penalty.saved ?? stats.goalkeeper?.saved ?? 0),
    };
}
async function fetchMatchdayFixtures(matchday) {
    const season = Number(process.env.FOOTBALL_API_SEASON ?? 2025);
    const cacheKey = `${season}:${matchday}`;
    const cached = getFromCache(fixturesCache, cacheKey);
    if (cached !== undefined)
        return cached;
    const response = await api.get('/fixtures', {
        params: {
            league: 140,
            season,
            round: `Regular Season - ${matchday}`,
        },
    });
    const fixtures = response.data?.response ?? [];
    setInCache(fixturesCache, cacheKey, fixtures);
    return fixtures;
}
async function fetchFixturePlayers(fixtureId) {
    const cacheKey = String(fixtureId);
    const cached = getFromCache(fixturePlayersCache, cacheKey);
    if (cached !== undefined)
        return cached;
    const response = await api.get('/fixtures/players', { params: { fixture: fixtureId } });
    const players = response.data?.response ?? [];
    setInCache(fixturePlayersCache, cacheKey, players);
    return players;
}
/**
 * Obtiene o calcula las estadísticas de un jugador en una jornada
 * - Busca primero en BD
 * - Si no existe, consulta API, calcula puntos y guarda
 * - Retorna estadísticas completas + puntos calculados
 */
export async function getPlayerStatsForJornada(playerId, jornada, options = {}) {
    const season = options.season ?? Number(process.env.FOOTBALL_API_SEASON ?? 2025);
    // ✨ MEJORADO: Solo forzar refresh si es explícitamente solicitado
    // NO forzar automáticamente por el estado de la jornada para evitar sobrescribir datos buenos
    let shouldForceRefresh = options.forceRefresh || false;
    // 1. Buscar en BD primero (incluso si la jornada está cerrada)
    const existing = await prisma.playerStats.findUnique({
        where: {
            playerId_jornada_season: {
                playerId,
                jornada,
                season,
            },
        },
    });
    // Si existe en BD y NO se fuerza refresh explícitamente, usar datos de BD
    if (existing && !shouldForceRefresh) {
        console.log(`[playerStats] 💾 Usando datos de BD para jugador ${playerId} jornada ${jornada} (${existing.totalPoints} puntos)`);
        return existing;
    }
    // Si se fuerza refresh o no hay datos, consultar API
    if (shouldForceRefresh && existing) {
        console.log(`[playerStats] 🔄 Refresh solicitado para jugador ${playerId} jornada ${jornada} - intentando actualizar desde API`);
    }
    else if (shouldForceRefresh) {
        console.log(`[playerStats] 🔄 Refresh solicitado para jugador ${playerId} jornada ${jornada} (sin datos previos)`);
    }
    else {
        console.log(`[playerStats] 🆕 No hay datos en BD para jugador ${playerId} jornada ${jornada}, consultando API`);
    }
    // 2. Consultar API Football con la nueva lógica
    try {
        const fixtures = await fetchMatchdayFixtures(jornada);
        // Paso 1: Obtener el nombre del jugador desde nuestra BD
        const playerFromDb = await prisma.player.findUnique({ where: { id: playerId } });
        if (!playerFromDb) {
            throw new AppError(404, 'PLAYER_NOT_FOUND_IN_DB', 'Jugador no encontrado en la base de datos local');
        }
        // Función para normalizar nombres (eliminar tildes, puntos, etc.)
        const normalizeName = (name) => {
            return name
                .normalize('NFD') // Descomponer caracteres con tildes
                .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos (tildes)
                .replace(/[.]/g, '') // Eliminar puntos
                .trim()
                .toLowerCase();
        };
        // Paso 2: Buscar en la API - Estrategia optimizada
        await delay(DEFAULT_REQUEST_DELAY_MS);
        let allPlayerVersions = [];
        // ✨ OPTIMIZACIÓN: Primero intentar búsqueda directa por ID (más rápido y preciso)
        try {
            const playerIdResponse = await retryApiCall(async () => {
                await delay(DEFAULT_REQUEST_DELAY_MS);
                return await api.get('/players', {
                    params: {
                        id: playerId,
                        season: season,
                    },
                });
            }, 3, 1000);
            allPlayerVersions = playerIdResponse.data?.response || [];
            if (allPlayerVersions.length > 0) {
                console.log(`[playerStats] ✓ Jugador ${playerId} encontrado por ID directo`);
            }
        }
        catch (error) {
            console.warn(`[playerStats] Búsqueda por ID falló para ${playerId} después de reintentos, intentando por nombre...`);
        }
        // Fallback: Si la búsqueda por ID falla, buscar por nombre (para casos edge)
        if (allPlayerVersions.length === 0) {
            console.log(`[playerStats] Fallback: Buscando por nombre "${playerFromDb.name}"`);
            try {
                // Extraer el apellido principal para búsquedas más flexibles
                const nameParts = playerFromDb.name.split(' ');
                const searchTerm = nameParts.length > 1 ? nameParts[nameParts.length - 1] : playerFromDb.name;
                const playerSearchResponse = await retryApiCall(async () => {
                    await delay(DEFAULT_REQUEST_DELAY_MS);
                    return await api.get('/players', {
                        params: {
                            search: searchTerm,
                            league: 140,
                            season: season,
                        },
                    });
                }, 3, 1000);
                const candidates = playerSearchResponse.data?.response || [];
                // ✅ BÚSQUEDA MEJORADA: Por ID del jugador, excepto para Etta Eyong (búsqueda por nombre)
                const normalizedPlayerName = normalizeName(playerFromDb.name);
                const isEttaEyong = normalizedPlayerName.includes('eyong') || normalizedPlayerName.includes('etta');
                if (isEttaEyong) {
                    // Para Etta Eyong: búsqueda por nombre (como antes)
                    console.log(`[playerStats] 🔍 Búsqueda especial por nombre para ${playerFromDb.name}`);
                    allPlayerVersions = candidates.filter((candidate) => {
                        const candidateName = normalizeName(candidate.player?.name || '');
                        const candidateLastname = normalizeName(candidate.player?.lastname || '');
                        return candidateName === normalizedPlayerName ||
                            normalizedPlayerName.includes(candidateLastname);
                    });
                }
                else {
                    // Para todos los demás: búsqueda por ID exacto
                    console.log(`[playerStats] 🔍 Búsqueda por ID exacto para ${playerFromDb.name} (${playerId})`);
                    allPlayerVersions = candidates.filter((candidate) => {
                        return candidate.player?.id === playerId;
                    });
                }
                console.log(`[playerStats] Búsqueda por nombre encontró ${allPlayerVersions.length} coincidencias`);
            }
            catch (error) {
                console.warn(`[playerStats] Búsqueda por nombre también falló para ${playerFromDb.name}`);
            }
        }
        if (allPlayerVersions.length === 0) {
            throw new AppError(404, 'PLAYER_NOT_FOUND_IN_API', 'No se encontró ninguna versión del jugador en la API');
        }
        // Paso 3: Extraer TODOS los IDs de equipo únicos del array completo de statistics
        const teamIds = new Set();
        allPlayerVersions.forEach((playerVersion) => {
            if (playerVersion.statistics && Array.isArray(playerVersion.statistics)) {
                playerVersion.statistics.forEach((stat) => {
                    if (stat?.team?.id) {
                        teamIds.add(stat.team.id);
                    }
                });
            }
        });
        const teamIdsToQuery = [...teamIds];
        if (teamIdsToQuery.length === 0) {
            throw new AppError(404, 'NO_TEAMS_FOR_PLAYER', 'No se encontraron equipos para el jugador en la API');
        }
        console.log(`[playerStats] Equipos encontrados para ${playerFromDb.name} (${playerId}): [${teamIdsToQuery.join(', ')}]`);
        let playerStats = null;
        let teamFixture = null;
        let playerTeamId = null;
        // Paso 4: Iterar sobre los equipos para encontrar el partido de la jornada
        for (const teamId of teamIdsToQuery) {
            const fixtureForThisTeam = fixtures.find((f) => f?.teams?.home?.id === teamId || f?.teams?.away?.id === teamId);
            if (fixtureForThisTeam) {
                // Encontramos un partido, ahora buscamos las stats del jugador original (por ID)
                const fixtureId = fixtureForThisTeam.fixture.id;
                const teamsData = await fetchFixturePlayers(fixtureId);
                for (const teamData of teamsData) {
                    const found = teamData?.players?.find((p) => p?.player?.id === playerId);
                    if (found?.statistics?.[0]) {
                        playerStats = found.statistics[0];
                        teamFixture = fixtureForThisTeam;
                        playerTeamId = teamId;
                        break;
                    }
                }
            }
            if (playerStats)
                break;
        }
        if (!teamFixture || !playerTeamId) {
            // No jugó en esta jornada con ninguno de sus equipos
            // ✅ PROTECCIÓN: Si hay datos previos y fue refresh, NO sobrescribir con 0
            if (shouldForceRefresh && existing) {
                console.log(`[playerStats] ⚠️ Jugador ${playerId} no encontrado en API, pero hay datos previos (${existing.totalPoints} pts) - manteniendo datos anteriores`);
                return existing;
            }
            // Solo guardar 0 si es primera vez (no hay datos previos)
            console.log(`[playerStats] ℹ️ Jugador ${playerId} no jugó en jornada ${jornada} - guardando 0 puntos`);
            const emptyStats = await prisma.playerStats.upsert({
                where: { playerId_jornada_season: { playerId, jornada, season } },
                create: {
                    playerId,
                    jornada,
                    season,
                    fixtureId: 0,
                    teamId: playerFromDb.teamId ?? 0,
                    totalPoints: 0,
                    minutes: 0,
                },
                update: { totalPoints: 0, minutes: 0, updatedAt: new Date() },
            });
            return emptyStats;
        }
        const fixtureId = teamFixture.fixture.id;
        // Extraer goles del equipo desde el fixture
        const isHome = teamFixture.teams?.home?.id === playerTeamId;
        const teamGoalsConceded = isHome
            ? Number(teamFixture.goals?.away ?? 0)
            : Number(teamFixture.goals?.home ?? 0);
        if (!playerStats) {
            // No se encontraron estadísticas del jugador en el partido
            // ✅ PROTECCIÓN: Si hay datos previos y fue refresh, NO sobrescribir con 0
            if (shouldForceRefresh && existing) {
                console.log(`[playerStats] ⚠️ Jugador ${playerId} sin stats en partido pero hay datos previos (${existing.totalPoints} pts) - manteniendo datos anteriores`);
                return existing;
            }
            // Solo guardar 0 si es primera vez
            console.log(`[playerStats] ℹ️ Jugador ${playerId} sin participación en partido - guardando 0 puntos`);
            const emptyStats = await prisma.playerStats.upsert({
                where: { playerId_jornada_season: { playerId, jornada, season } },
                create: {
                    playerId,
                    jornada,
                    season,
                    fixtureId,
                    teamId: playerTeamId,
                    totalPoints: 0,
                    pointsBreakdown: Prisma.JsonNull,
                    minutes: 0,
                },
                update: {
                    totalPoints: 0,
                    pointsBreakdown: Prisma.JsonNull,
                    minutes: 0,
                    updatedAt: new Date(),
                },
            });
            return emptyStats;
        }
        // ✨ NUEVO: Calcular minutos sin tiempo de descuento
        const rawMinutes = Number(playerStats?.games?.minutes ?? 0);
        const wasSubstitute = Boolean(playerStats?.games?.substitute);
        const minutesWithoutInjuryTime = await calculateMinutesWithoutInjuryTime(playerId, playerFromDb.name, fixtureId, rawMinutes, wasSubstitute);
        // ✨ IMPORTANTE: Sobrescribir los minutos en playerStats con los minutos sin descuento
        playerStats = {
            ...playerStats,
            games: {
                ...playerStats.games,
                minutes: minutesWithoutInjuryTime,
            },
        };
        // Calcular puntos
        const role = normalizeRole(playerFromDb?.position ?? playerStats?.games?.position);
        // ✨ IMPORTANTE: Solo inyectar goles del equipo para DEFENSAS
        // Los porteros usan sus propios goles encajados (goalkeeper.conceded o goals.conceded)
        const statsWithTeamGoals = {
            ...playerStats,
            goals: {
                ...playerStats.goals,
                // Solo sobrescribir para defensas, NO para porteros
                conceded: role === 'Defender' ? teamGoalsConceded : playerStats.goals?.conceded,
            },
        };
        const pointsResult = calculatePlayerPoints(statsWithTeamGoals, role);
        const totalPoints = pointsResult.total;
        const pointsBreakdown = pointsResult.breakdown;
        // Extraer y guardar estadísticas
        const extractedStats = extractStats(statsWithTeamGoals);
        const savedStats = await prisma.playerStats.upsert({
            where: { playerId_jornada_season: { playerId, jornada, season } },
            create: {
                playerId,
                jornada,
                season,
                fixtureId,
                teamId: playerTeamId,
                totalPoints,
                pointsBreakdown,
                ...extractedStats,
            },
            update: {
                totalPoints,
                pointsBreakdown,
                ...extractedStats,
                updatedAt: new Date(),
            },
        });
        // Actualizar cache en Player
        await prisma.player.update({
            where: { id: playerId },
            data: {
                lastJornadaPoints: totalPoints,
                lastJornadaNumber: jornada,
            },
        });
        return savedStats;
    }
    catch (error) {
        const status = error?.response?.status;
        if (status === 403) {
            throw new AppError(502, 'FOOTBALL_API_FORBIDDEN', 'La API de Fútbol rechazó la petición. Revisa la API key configurada.');
        }
        if (status === 429) {
            await delay(2000);
            return getPlayerStatsForJornada(playerId, jornada, options);
        }
        throw error;
    }
}
/**
 * Obtiene estadísticas de un jugador para múltiples jornadas
 * OPTIMIZADO: Solo consulta API para jornada actual si está abierta
 */
export async function getPlayerStatsForMultipleJornadas(playerId, jornadas, options = {}) {
    const results = [];
    // ✨ OPTIMIZACIÓN: Obtener jornada actual y su estado UNA SOLA VEZ
    const currentJornadaInfo = await prisma.league.findFirst({
        select: { currentJornada: true, jornadaStatus: true },
    });
    const currentJornada = currentJornadaInfo?.currentJornada;
    const isCurrentJornadaOpen = currentJornadaInfo?.jornadaStatus === 'open';
    console.log(`[playerStats] Consultando ${jornadas.length} jornadas - Jornada actual: ${currentJornada} (${isCurrentJornadaOpen ? 'ABIERTA' : 'CERRADA'})`);
    for (const jornada of jornadas) {
        try {
            // ✨ DECISIÓN INTELIGENTE: Solo forzar refresh en jornada actual abierta
            const shouldForceThisJornada = options.forceRefresh ||
                (jornada === currentJornada && isCurrentJornadaOpen);
            if (shouldForceThisJornada) {
                console.log(`[playerStats] ⚡ Jornada ${jornada}: Consultando API (tiempo real)`);
            }
            else {
                console.log(`[playerStats] 💾 Jornada ${jornada}: Usando BD (cerrada)`);
            }
            const stats = await getPlayerStatsForJornada(playerId, jornada, {
                ...options,
                forceRefresh: shouldForceThisJornada,
            });
            results.push(stats);
            // Respetar rate limit SOLO si consultamos API
            if (shouldForceThisJornada && DEFAULT_REQUEST_DELAY_MS > 0) {
                await delay(DEFAULT_REQUEST_DELAY_MS);
            }
        }
        catch (error) {
            console.error(`Error obteniendo stats para jugador ${playerId} jornada ${jornada}:`, error);
            results.push(null);
        }
    }
    return results;
}
/**
 * Actualiza estadísticas de todos los jugadores para una jornada
 * (útil para jobs automáticos después de cada jornada)
 */
export async function updateAllPlayersStatsForJornada(jornada) {
    console.log(`[STATS] Actualizando estadísticas de todos los jugadores para jornada ${jornada}`);
    const players = await prisma.player.findMany({
        select: { id: true, name: true, position: true },
    });
    let successCount = 0;
    let errorCount = 0;
    for (const player of players) {
        try {
            await getPlayerStatsForJornada(player.id, jornada, { forceRefresh: true });
            successCount++;
            console.log(`[OK] ${player.name} - Jornada ${jornada}`);
            if (DEFAULT_REQUEST_DELAY_MS > 0) {
                await delay(DEFAULT_REQUEST_DELAY_MS);
            }
        }
        catch (error) {
            errorCount++;
            console.error(`[ERROR] ${player.name}:`, error.message);
            if (error?.response?.status === 429) {
                console.log('[RATE LIMIT] Esperando 2 segundos...');
                await delay(2000);
            }
        }
    }
    console.log(`[STATS] Actualización completada: ${successCount} éxitos, ${errorCount} errores`);
    return {
        jornada,
        totalPlayers: players.length,
        successCount,
        errorCount,
    };
}
export const PlayerStatsService = {
    getPlayerStatsForJornada,
    getPlayerStatsForMultipleJornadas,
    updateAllPlayersStatsForJornada,
};
