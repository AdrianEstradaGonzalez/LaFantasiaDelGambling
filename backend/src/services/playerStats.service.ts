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
import {
  calculatePlayerPoints,
  normalizeRole,
  Role,
} from '../shared/pointsCalculator.js';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const FALLBACK_APISPORTS_KEY = '07bc9c707fe2d6169fff6e17d4a9e6fd';
const DEFAULT_CACHE_TTL_MS = Number(process.env.FOOTBALL_API_CACHE_TTL_MS ?? 60_000);
const DEFAULT_REQUEST_DELAY_MS = Number(process.env.FOOTBALL_API_DELAY_MS ?? 350);

function buildHeaders() {
  const candidates = [
    process.env.FOOTBALL_API_KEY,
    process.env.APISPORTS_API_KEY,
    process.env.API_FOOTBALL_KEY,
    process.env.APISPORTS_KEY,
  ].filter(Boolean) as string[];

  if (candidates.length > 0) return { 'x-apisports-key': candidates[0] };

  const rapidCandidates = [
    process.env.RAPIDAPI_KEY,
    process.env.RAPIDAPI_FOOTBALL_KEY,
    process.env.API_FOOTBALL_RAPID_KEY,
  ].filter(Boolean) as string[];

  if (rapidCandidates.length > 0)
    return { 'x-rapidapi-key': rapidCandidates[0], 'x-rapidapi-host': 'v3.football.api-sports.io' };

  return { 'x-apisports-key': FALLBACK_APISPORTS_KEY };
}

const api = axios.create({ baseURL: API_BASE, timeout: 15000, headers: buildHeaders() });
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ✨ NUEVO: Función auxiliar para reintentar peticiones a la API
async function retryApiCall<T>(
  callFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callFn();
    } catch (error: any) {
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

type CacheEntry<T> = { data: T; expiresAt: number };

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setInCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T) {
  if (DEFAULT_CACHE_TTL_MS <= 0) return;
  cache.set(key, { data, expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS });
}

const fixturesCache = new Map<string, CacheEntry<any[]>>();
const playerInfoCache = new Map<string, CacheEntry<any | null>>();
const fixturePlayersCache = new Map<string, CacheEntry<any[]>>();
const fixtureEventsCache = new Map<string, CacheEntry<any[]>>();

/**
 * Obtiene los eventos de un partido (sustituciones, goles, tarjetas, etc.)
 */
async function fetchFixtureEvents(fixtureId: number) {
  const cacheKey = String(fixtureId);
  const cached = getFromCache(fixtureEventsCache, cacheKey);
  if (cached !== undefined) return cached;

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
async function calculateMinutesWithoutInjuryTime(
  playerId: number,
  playerName: string,
  fixtureId: number,
  rawMinutes: number,
  wasSubstitute: boolean
): Promise<number> {
  // ✨ IMPORTANTE: Si el jugador no jugó ningún minuto según la API, devolver 0 directamente
  if (rawMinutes === 0) {
    console.log(`[playerStats] ⏱️  Jugador ${playerName}: 0 min (no jugó)`);
    return 0;
  }

  try {
    const events = await fetchFixtureEvents(fixtureId);
    
    // Normalizar nombre para comparación
    const normalizeName = (name: string): string => {
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
      const entryEvent = events.find((e: any) => 
        e.type === 'subst' && 
        e.assist?.id === playerId || 
        (e.assist?.name && normalizeName(e.assist.name) === normalizedPlayerName)
      );
      
      if (entryEvent) {
        // El minuto puede ser "45+2" o "90", extraer solo el número base
        const minuteStr = String(entryEvent.time?.elapsed ?? 0);
        entryMinute = parseInt(minuteStr.split('+')[0]);
        console.log(`[playerStats] 🔄 Jugador ${playerName} entró en minuto ${entryMinute}`);
      } else if (wasSubstitute && rawMinutes > 0) {
        // Si fue suplente pero no se encontró evento de entrada y jugó minutos,
        // probablemente entró muy tarde. Calcular basándonos en rawMinutes.
        entryMinute = 90 - rawMinutes;
        console.log(`[playerStats] ⚠️  No se encontró evento de entrada para ${playerName}, calculando: entró en min ${entryMinute}`);
      }
    }
    
    // Buscar evento de salida (si fue sustituido)
    let exitMinute = 90; // Por defecto, asumimos que jugó hasta el final
    const exitEvent = events.find((e: any) => 
      e.type === 'subst' && 
      (e.player?.id === playerId || 
       (e.player?.name && normalizeName(e.player.name) === normalizedPlayerName))
    );
    
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
    
  } catch (error) {
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
function extractStats(stats: any) {
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

async function fetchMatchdayFixtures(matchday: number, leagueId: number = 140) {
  const season = Number(process.env.FOOTBALL_API_SEASON ?? 2025);
  const cacheKey = `${leagueId}:${season}:${matchday}`;
  const cached = getFromCache(fixturesCache, cacheKey);
  if (cached !== undefined) return cached;

  const response = await api.get('/fixtures', {
    params: {
      league: leagueId,
      season,
      round: `Regular Season - ${matchday}`,
    },
  });
  const fixtures = response.data?.response ?? [];
  setInCache(fixturesCache, cacheKey, fixtures);
  return fixtures;
}

async function fetchFixturePlayers(fixtureId: number) {
  const cacheKey = String(fixtureId);
  const cached = getFromCache(fixturePlayersCache, cacheKey);
  if (cached !== undefined) return cached;

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
export async function getPlayerStatsForJornada(
  playerId: number,
  jornada: number,
  options: { season?: number; forceRefresh?: boolean } = {}
) {
  const season = options.season ?? Number(process.env.FOOTBALL_API_SEASON ?? 2025);

  // ✨ MEJORADO: Solo forzar refresh si es explícitamente solicitado
  // NO forzar automáticamente por el estado de la jornada para evitar sobrescribir datos buenos
  let shouldForceRefresh = options.forceRefresh || false;

  // 1. Determinar si es jugador de Primera o Segunda División
  let playerFromDb = await prisma.player.findUnique({ where: { id: playerId } });
  let isSegundaDivision = false;
  
  if (!playerFromDb) {
    playerFromDb = await (prisma as any).playerSegunda.findUnique({ where: { id: playerId } });
    isSegundaDivision = true;
  }

  if (!playerFromDb) {
    throw new AppError(404, 'PLAYER_NOT_FOUND_IN_DB', 'Jugador no encontrado en la base de datos local');
  }

  // 2. Buscar en la tabla correcta según la división
  const statsTable = isSegundaDivision ? (prisma as any).playerSegundaStats : prisma.playerStats;
  
  const existing = await statsTable.findUnique({
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
    console.log(`[playerStats] 💾 Usando datos de BD para jugador ${playerId} jornada ${jornada} (${existing.totalPoints} puntos) - ${isSegundaDivision ? 'Segunda' : 'Primera'} División`);
    return existing;
  }
  
  // Si se fuerza refresh o no hay datos, consultar API
  if (shouldForceRefresh && existing) {
    console.log(`[playerStats] 🔄 Refresh solicitado para jugador ${playerId} jornada ${jornada} - intentando actualizar desde API (${isSegundaDivision ? 'Segunda' : 'Primera'} División)`);
  } else if (shouldForceRefresh) {
    console.log(`[playerStats] 🔄 Refresh solicitado para jugador ${playerId} jornada ${jornada} (sin datos previos) - ${isSegundaDivision ? 'Segunda' : 'Primera'} División`);
  } else {
    console.log(`[playerStats] 🆕 No hay datos en BD para jugador ${playerId} jornada ${jornada}, consultando API (${isSegundaDivision ? 'Segunda' : 'Primera'} División)`);
  }

  // 3. Consultar API Football con la nueva lógica
  try {
    // Determinar qué liga consultar (140 = La Liga, 141 = Segunda División)
    const leagueId = isSegundaDivision ? 141 : 140;
    console.log(`[playerStats] 🔍 Buscando estadísticas para ${playerFromDb.name} en ${isSegundaDivision ? 'Segunda' : 'Primera'} División (Liga ${leagueId})`);

    const fixtures = await fetchMatchdayFixtures(jornada, leagueId);

    // Función para normalizar nombres (eliminar tildes, puntos, etc.)
    const normalizeName = (name: string): string => {
      return name
        .normalize('NFD') // Descomponer caracteres con tildes
        .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos (tildes)
        .replace(/[.]/g, '') // Eliminar puntos
        .trim()
        .toLowerCase();
    };

    // Paso 2: Buscar en la API - Estrategia optimizada
    await delay(DEFAULT_REQUEST_DELAY_MS);
    let allPlayerVersions: any[] = [];
    
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
    } catch (error) {
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
          allPlayerVersions = candidates.filter((candidate: any) => {
            const candidateName = normalizeName(candidate.player?.name || '');
            const candidateLastname = normalizeName(candidate.player?.lastname || '');
            
            return candidateName === normalizedPlayerName || 
                   normalizedPlayerName.includes(candidateLastname);
          });
        } else {
          // Para todos los demás: búsqueda por ID exacto
          console.log(`[playerStats] 🔍 Búsqueda por ID exacto para ${playerFromDb.name} (${playerId})`);
          allPlayerVersions = candidates.filter((candidate: any) => {
            return candidate.player?.id === playerId;
          });
        }
        
        console.log(`[playerStats] Búsqueda por nombre encontró ${allPlayerVersions.length} coincidencias`);
      } catch (error) {
        console.warn(`[playerStats] Búsqueda por nombre también falló para ${playerFromDb.name}`);
      }
    }

    if (allPlayerVersions.length === 0) {
      throw new AppError(404, 'PLAYER_NOT_FOUND_IN_API', 'No se encontró ninguna versión del jugador en la API');
    }

    // Paso 3: Extraer TODOS los IDs de equipo únicos del array completo de statistics
    const teamIds = new Set<number>();
    allPlayerVersions.forEach((playerVersion: any) => {
      if (playerVersion.statistics && Array.isArray(playerVersion.statistics)) {
        playerVersion.statistics.forEach((stat: any) => {
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

    let playerStats: any = null;
    let teamFixture: any = null;
    let playerTeamId: number | null = null;

    // Paso 4: Iterar sobre los equipos para encontrar el partido de la jornada
    for (const teamId of teamIdsToQuery) {
      const fixtureForThisTeam = fixtures.find((f: any) => f?.teams?.home?.id === teamId || f?.teams?.away?.id === teamId);

      if (fixtureForThisTeam) {
        // Encontramos un partido, ahora buscamos las stats del jugador original (por ID)
        const fixtureId = fixtureForThisTeam.fixture.id;
        const teamsData = await fetchFixturePlayers(fixtureId);

        for (const teamData of teamsData) {
          const found = teamData?.players?.find((p: any) => p?.player?.id === playerId);
          if (found?.statistics?.[0]) {
            playerStats = found.statistics[0];
            teamFixture = fixtureForThisTeam;
            playerTeamId = teamId;
            break;
          }
        }
      }
      if (playerStats) break;
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
      const emptyStats = await statsTable.upsert({
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
      const emptyStats = await statsTable.upsert({
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
    const minutesWithoutInjuryTime = await calculateMinutesWithoutInjuryTime(
      playerId,
      playerFromDb.name,
      fixtureId,
      rawMinutes,
      wasSubstitute
    );
    
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
    const pointsBreakdown = pointsResult.breakdown as any;

    // Extraer y guardar estadísticas en la tabla correcta
    const extractedStats = extractStats(statsWithTeamGoals);
    const savedStats = await statsTable.upsert({
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

    // Actualizar cache en la tabla correcta según la división
    const playerTable = isSegundaDivision ? (prisma as any).playerSegunda : prisma.player;
    await playerTable.update({
      where: { id: playerId },
      data: {
        lastJornadaPoints: totalPoints,
        lastJornadaNumber: jornada,
      },
    });

    return savedStats;
  } catch (error: any) {
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
export async function getPlayerStatsForMultipleJornadas(
  playerId: number,
  jornadas: number[],
  options: { season?: number; forceRefresh?: boolean } = {}
) {
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
      } else {
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
    } catch (error) {
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
export async function updateAllPlayersStatsForJornada(jornada: number) {
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
    } catch (error: any) {
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

/**
 * Calcular promedios por posición basados en todas las estadísticas de la BD
 */
async function calculateAveragesByPosition() {
  console.log('[PlayerStatsService] Calculando promedios por posición...');

  // Obtener todas las estadísticas con información del jugador
  const allStats = await prisma.playerStats.findMany({
    where: {
      minutes: { gt: 0 }, // Solo partidos jugados
    },
    include: {
      player: {
        select: {
          position: true,
        },
      },
    },
  });

  console.log(`[PlayerStatsService] ${allStats.length} registros de estadísticas encontrados`);

  // Agrupar por posición
  const statsByPosition: Record<string, typeof allStats> = {
    Goalkeeper: [],
    Defender: [],
    Midfielder: [],
    Attacker: [],
  };

  allStats.forEach((stat) => {
    const position = stat.player?.position;
    if (position && statsByPosition[position]) {
      statsByPosition[position].push(stat);
    }
  });

  const averages: any = {};

  // Calcular promedios para cada posición
  for (const [position, stats] of Object.entries(statsByPosition)) {
    if (stats.length === 0) continue;

    const totalMatches = stats.length;
    let totalGoals = 0;
    let totalAssists = 0;
    let totalShots = 0;
    let totalKeyPasses = 0;
    let totalCleanSheets = 0;
    let totalGoalsAgainst = 0;
    let totalSaves = 0;
    let totalMinutes = 0;

    stats.forEach((stat) => {
      totalGoals += stat.goals || 0;
      totalAssists += stat.assists || 0;
      totalShots += stat.shotsOn || 0;
      totalKeyPasses += stat.passesKey || 0;
      totalMinutes += stat.minutes || 0;

      // Clean sheets (solo si jugó más de 60 minutos)
      if ((stat.minutes || 0) >= 60 && (stat.conceded || 0) === 0) {
        totalCleanSheets++;
      }

      totalGoalsAgainst += stat.conceded || 0;
      totalSaves += stat.saves || 0;
    });

    const matchesCompleted = totalMinutes / 90;

    if (position === 'Attacker' || position === 'Midfielder') {
      // Calcular tasas de conversión reales
      const conversionRate = totalShots > 0 ? totalGoals / totalShots : 0;
      const assistRate = totalKeyPasses > 0 ? totalAssists / totalKeyPasses : 0;

      averages[position] = {
        goalsPerMatch: totalGoals / matchesCompleted,
        assistsPerMatch: totalAssists / matchesCompleted,
        shotsPerMatch: totalShots / matchesCompleted,
        keyPassesPerMatch: totalKeyPasses / matchesCompleted,
        conversionRate, // % de tiros que se convierten en gol
        assistRate, // % de pases clave que se convierten en asistencia
        totalPlayers: new Set(stats.map(s => s.playerId)).size,
        totalMatches: matchesCompleted,
      };
    } else if (position === 'Defender') {
      averages[position] = {
        cleanSheetsPerMatch: totalCleanSheets / matchesCompleted,
        goalsAgainstPerMatch: totalGoalsAgainst / matchesCompleted,
        totalPlayers: new Set(stats.map(s => s.playerId)).size,
        totalMatches: matchesCompleted,
      };
    } else if (position === 'Goalkeeper') {
      const totalShotsAgainst = totalSaves + totalGoalsAgainst;
      const savePercentage = totalShotsAgainst > 0 ? (totalSaves / totalShotsAgainst) * 100 : 70;

      averages[position] = {
        cleanSheetsPerMatch: totalCleanSheets / matchesCompleted,
        savePercentage,
        savesPerMatch: totalSaves / matchesCompleted,
        goalsAgainstPerMatch: totalGoalsAgainst / matchesCompleted,
        totalPlayers: new Set(stats.map(s => s.playerId)).size,
        totalMatches: matchesCompleted,
      };
    }
  }

  console.log('[PlayerStatsService] Promedios calculados:', JSON.stringify(averages, null, 2));

  return averages;
}

/**
 * Obtener análisis del próximo rival para un jugador
 * Incluye estadísticas del equipo rival y predicción de rendimiento
 */
async function getNextOpponentAnalysis(playerId: number, currentJornada: number) {
  console.log(`[PlayerStatsService] Analizando próximo rival para jugador ${playerId}, jornada actual: ${currentJornada}`);

  // Obtener información del jugador
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, teamId: true, teamName: true, position: true },
  });

  if (!player) {
    throw new AppError(404, 'PLAYER_NOT_FOUND', 'Jugador no encontrado');
  }

  const nextJornada = currentJornada + 1;
  
  // Obtener el próximo partido del equipo del jugador desde la API
  const headers = buildHeaders();
  const season = 2025;
  const leagueId = 140; // La Liga

  try {
    // Obtener fixtures de la próxima jornada
    const response = await api.get('/fixtures', {
      params: {
        league: leagueId,
        season,
        round: `Regular Season - ${nextJornada}`,
      },
      headers,
    });

    const fixtures = response.data?.response || [];
    
    // Buscar el partido del equipo del jugador
    const nextMatch = fixtures.find((f: any) => 
      f.teams.home.id === player.teamId || f.teams.away.id === player.teamId
    );

    if (!nextMatch) {
      return {
        hasNextMatch: false,
        message: 'No hay próximo partido disponible',
      };
    }

    const isHome = nextMatch.teams.home.id === player.teamId;
    const opponentTeam = isHome ? nextMatch.teams.away : nextMatch.teams.home;
    const playerTeam = isHome ? nextMatch.teams.home : nextMatch.teams.away;

    // Obtener estadísticas históricas del equipo rival (últimas 5 jornadas)
    const opponentStats = await getTeamRecentStats(opponentTeam.id, currentJornada, 5);
    const playerTeamStats = await getTeamRecentStats(player.teamId, currentJornada, 5);

    // Obtener estadísticas promedio del jugador
    const playerAvgStats = await getPlayerAverageStats(playerId, currentJornada);

    // CALCULAR ÍNDICES DE RENDIMIENTO
    // 1. Índice de Fortaleza del Rival (0-100, mayor = más difícil)
    const opponentStrength = calculateTeamStrength(opponentStats);
    
    // 2. Índice de Forma del Jugador (0-100, mayor = mejor forma)
    const playerForm = calculatePlayerForm(playerAvgStats);

    // 3. Predicción de rendimiento basada en:
    //    - Fortaleza defensiva rival (para atacantes/medios)
    //    - Fortaleza ofensiva rival (para defensas/porteros)
    //    - Forma actual del jugador
    //    - Ventaja de local/visitante
    const prediction = calculatePerformancePrediction(
      player.position,
      playerAvgStats,
      opponentStats,
      playerTeamStats,
      isHome
    );

    return {
      hasNextMatch: true,
      match: {
        jornada: nextJornada,
        date: nextMatch.fixture.date,
        venue: nextMatch.fixture.venue.name,
        isHome,
        playerTeam: {
          id: playerTeam.id,
          name: playerTeam.name,
          logo: playerTeam.logo,
        },
        opponent: {
          id: opponentTeam.id,
          name: opponentTeam.name,
          logo: opponentTeam.logo,
        },
      },
      opponentStats: {
        strength: opponentStrength,
        wins: opponentStats.wins,
        draws: opponentStats.draws,
        losses: opponentStats.losses,
        goalsScored: opponentStats.goalsScored,
        goalsConceded: opponentStats.goalsConceded,
        cleanSheets: opponentStats.cleanSheets,
        avgGoalsScored: opponentStats.avgGoalsScored,
        avgGoalsConceded: opponentStats.avgGoalsConceded,
        form: opponentStats.form,
      },
      playerStats: {
        form: playerForm,
        avgPoints: playerAvgStats.avgPoints,
        avgGoals: playerAvgStats.avgGoals,
        avgAssists: playerAvgStats.avgAssists,
        avgMinutes: playerAvgStats.avgMinutes,
        matchesPlayed: playerAvgStats.matchesPlayed,
      },
      prediction: {
        expectedPoints: prediction.expectedPoints,
        confidence: prediction.confidence,
        difficulty: prediction.difficulty, // 'Fácil', 'Medio', 'Difícil'
        factors: prediction.factors,
      },
    };
  } catch (error: any) {
    console.error('[PlayerStatsService] Error obteniendo análisis del próximo rival:', error);
    return {
      hasNextMatch: false,
      error: error.message,
    };
  }
}

/**
 * Obtener estadísticas recientes de un equipo
 */
async function getTeamRecentStats(teamId: number, currentJornada: number, numMatches: number) {
  const startJornada = Math.max(1, currentJornada - numMatches + 1);
  
  // Obtener todas las estadísticas de jugadores de este equipo en el rango de jornadas
  const stats = await prisma.playerStats.findMany({
    where: {
      teamId,
      jornada: { gte: startJornada, lte: currentJornada },
    },
  });

  if (stats.length === 0) {
    return {
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      cleanSheets: 0,
      avgGoalsScored: 0,
      avgGoalsConceded: 0,
      matchesPlayed: 0,
      form: 0,
    };
  }

  // Agrupar por jornada para calcular estadísticas del equipo
  const matchesByJornada: Record<number, typeof stats> = {};
  stats.forEach(stat => {
    if (!matchesByJornada[stat.jornada]) {
      matchesByJornada[stat.jornada] = [];
    }
    matchesByJornada[stat.jornada].push(stat);
  });

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let totalGoalsScored = 0;
  let totalGoalsConceded = 0;
  let cleanSheets = 0;

  Object.values(matchesByJornada).forEach(matchStats => {
    // Goles marcados por el equipo
    const goalsScored = matchStats.reduce((sum, s) => sum + (s.goals || 0), 0);
    totalGoalsScored += goalsScored;

    // Goles encajados (tomamos el del portero o el máximo)
    const goalsConceded = Math.max(...matchStats.map(s => s.conceded || 0));
    totalGoalsConceded += goalsConceded;

    if (goalsConceded === 0) cleanSheets++;

    // Determinar resultado (simplificado)
    if (goalsScored > goalsConceded) wins++;
    else if (goalsScored < goalsConceded) losses++;
    else draws++;
  });

  const matchesPlayed = Object.keys(matchesByJornada).length;
  const form = ((wins * 3 + draws) / (matchesPlayed * 3)) * 100; // % de puntos obtenidos

  return {
    wins,
    draws,
    losses,
    goalsScored: totalGoalsScored,
    goalsConceded: totalGoalsConceded,
    cleanSheets,
    avgGoalsScored: totalGoalsScored / matchesPlayed,
    avgGoalsConceded: totalGoalsConceded / matchesPlayed,
    matchesPlayed,
    form,
  };
}

/**
 * Obtener estadísticas promedio de un jugador
 */
async function getPlayerAverageStats(playerId: number, currentJornada: number) {
  const stats = await prisma.playerStats.findMany({
    where: {
      playerId,
      jornada: { lte: currentJornada },
      minutes: { gt: 0 },
    },
    orderBy: { jornada: 'desc' },
    take: 5, // Últimos 5 partidos
  });

  if (stats.length === 0) {
    return {
      avgPoints: 0,
      avgGoals: 0,
      avgAssists: 0,
      avgMinutes: 0,
      matchesPlayed: 0,
    };
  }

  const totalPoints = stats.reduce((sum, s) => sum + s.totalPoints, 0);
  const totalGoals = stats.reduce((sum, s) => sum + (s.goals || 0), 0);
  const totalAssists = stats.reduce((sum, s) => sum + (s.assists || 0), 0);
  const totalMinutes = stats.reduce((sum, s) => sum + (s.minutes || 0), 0);

  return {
    avgPoints: totalPoints / stats.length,
    avgGoals: totalGoals / stats.length,
    avgAssists: totalAssists / stats.length,
    avgMinutes: totalMinutes / stats.length,
    matchesPlayed: stats.length,
  };
}

/**
 * Calcular índice de fortaleza del equipo (0-100)
 */
function calculateTeamStrength(teamStats: any): number {
  if (teamStats.matchesPlayed === 0) return 50;

  // Factores:
  // - Forma reciente (40%)
  // - Goles a favor vs goles en contra (30%)
  // - Porterías a cero (30%)
  
  const formScore = teamStats.form; // Ya es 0-100
  
  const goalDiff = teamStats.goalsScored - teamStats.goalsConceded;
  const goalScore = Math.min(100, Math.max(0, 50 + (goalDiff * 10)));
  
  const cleanSheetRate = (teamStats.cleanSheets / teamStats.matchesPlayed) * 100;
  
  const strength = (formScore * 0.4) + (goalScore * 0.3) + (cleanSheetRate * 0.3);
  
  return Math.round(Math.min(100, Math.max(0, strength)));
}

/**
 * Calcular índice de forma del jugador (0-100)
 */
function calculatePlayerForm(playerStats: any): number {
  if (playerStats.matchesPlayed === 0) return 50;
  
  // Basado en puntos promedio
  // Escala: 0 pts = 0, 10+ pts = 100
  const form = Math.min(100, (playerStats.avgPoints / 10) * 100);
  
  return Math.round(form);
}

/**
 * Calcular predicción de rendimiento
 */
function calculatePerformancePrediction(
  position: string,
  playerStats: any,
  opponentStats: any,
  playerTeamStats: any,
  isHome: boolean
) {
  const opponentStrength = calculateTeamStrength(opponentStats);
  const playerForm = calculatePlayerForm(playerStats);
  
  // Factor local/visitante (+10% / -5%)
  const homeAdvantage = isHome ? 1.10 : 0.95;
  
  // Para atacantes/medios: más difícil contra defensas fuertes
  // Para defensas/porteros: más difícil contra ataques fuertes
  let difficultyMultiplier = 1.0;
  
  if (position === 'Attacker' || position === 'Midfielder') {
    // Defensas fuertes = menos goles esperados
    difficultyMultiplier = 1 - ((opponentStrength - 50) / 100) * 0.5;
  } else if (position === 'Defender' || position === 'Goalkeeper') {
    // Ataques fuertes = más difícil mantener portería a cero
    difficultyMultiplier = 1 - ((opponentStrength - 50) / 100) * 0.5;
  }
  
  // Puntos esperados = promedio * forma * local/visitante * dificultad
  const basePoints = playerStats.avgPoints;
  const formFactor = playerForm / 100;
  const expectedPoints = basePoints * formFactor * homeAdvantage * difficultyMultiplier;
  
  // Confianza basada en consistencia (más partidos = más confianza)
  const confidence = Math.min(100, (playerStats.matchesPlayed / 5) * 100);
  
  // Clasificación de dificultad
  let difficulty = 'Medio';
  if (opponentStrength < 40) difficulty = 'Fácil';
  else if (opponentStrength > 65) difficulty = 'Difícil';
  
  // Factores explicativos
  const factors = [];
  
  if (isHome) {
    factors.push({ label: 'Ventaja de local', impact: '+10%', type: 'positive' });
  } else {
    factors.push({ label: 'Juega como visitante', impact: '-5%', type: 'neutral' });
  }
  
  if (opponentStrength > 65) {
    factors.push({ label: 'Rival muy fuerte', impact: '-25%', type: 'negative' });
  } else if (opponentStrength < 40) {
    factors.push({ label: 'Rival débil', impact: '+25%', type: 'positive' });
  }
  
  if (playerForm > 70) {
    factors.push({ label: 'Excelente forma reciente', impact: `+${Math.round((playerForm - 50) / 2)}%`, type: 'positive' });
  } else if (playerForm < 40) {
    factors.push({ label: 'Forma baja', impact: `-${Math.round((50 - playerForm) / 2)}%`, type: 'negative' });
  }
  
  if (position === 'Attacker' || position === 'Midfielder') {
    if (opponentStats.avgGoalsConceded > 1.5) {
      factors.push({ label: 'Defensa rival vulnerable', impact: '+15%', type: 'positive' });
    } else if (opponentStats.avgGoalsConceded < 0.8) {
      factors.push({ label: 'Defensa rival sólida', impact: '-15%', type: 'negative' });
    }
  } else {
    if (opponentStats.avgGoalsScored > 2.0) {
      factors.push({ label: 'Ataque rival potente', impact: '-20%', type: 'negative' });
    } else if (opponentStats.avgGoalsScored < 1.0) {
      factors.push({ label: 'Ataque rival débil', impact: '+20%', type: 'positive' });
    }
  }
  
  return {
    expectedPoints: Math.round(expectedPoints * 10) / 10,
    confidence: Math.round(confidence),
    difficulty,
    factors,
  };
}

export const PlayerStatsService = {
  getPlayerStatsForJornada,
  getPlayerStatsForMultipleJornadas,
  updateAllPlayersStatsForJornada,
  calculateAveragesByPosition,
  getNextOpponentAnalysis,
};
