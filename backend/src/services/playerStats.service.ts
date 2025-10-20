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
} from '../../../shared/pointsCalculator.js';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const FALLBACK_APISPORTS_KEY = '099ef4c6c0803639d80207d4ac1ad5da';
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

async function fetchMatchdayFixtures(matchday: number) {
  const season = Number(process.env.FOOTBALL_API_SEASON ?? 2025);
  const cacheKey = `${season}:${matchday}`;
  const cached = getFromCache(fixturesCache, cacheKey);
  if (cached !== undefined) return cached;

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

  // 1. Buscar en BD si no es refresh forzado
  if (!options.forceRefresh) {
    const existing = await prisma.playerStats.findUnique({
      where: {
        playerId_jornada_season: {
          playerId,
          jornada,
          season,
        },
      },
    });

    if (existing) {
      return existing;
    }
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
      const playerIdResponse = await api.get('/players', {
        params: {
          id: playerId,
          season: season,
        },
      });
      allPlayerVersions = playerIdResponse.data?.response || [];
      
      if (allPlayerVersions.length > 0) {
        console.log(`[playerStats] ✓ Jugador ${playerId} encontrado por ID directo`);
      }
    } catch (error) {
      console.warn(`[playerStats] Búsqueda por ID falló para ${playerId}, intentando por nombre...`);
    }

    // Fallback: Si la búsqueda por ID falla, buscar por nombre (para casos edge)
    if (allPlayerVersions.length === 0) {
      console.log(`[playerStats] Fallback: Buscando por nombre "${playerFromDb.name}"`);
      
      try {
        // Extraer el apellido principal para búsquedas más flexibles
        const nameParts = playerFromDb.name.split(' ');
        const searchTerm = nameParts.length > 1 ? nameParts[nameParts.length - 1] : playerFromDb.name;
        
        await delay(DEFAULT_REQUEST_DELAY_MS);
        const playerSearchResponse = await api.get('/players', {
          params: {
            search: searchTerm,
            league: 140,
            season: season,
          },
        });
        
        const candidates = playerSearchResponse.data?.response || [];
        
        // Filtrar resultados por similitud de nombre normalizado
        const normalizedPlayerName = normalizeName(playerFromDb.name);
        allPlayerVersions = candidates.filter((candidate: any) => {
          const candidateName = normalizeName(candidate.player?.name || '');
          const candidateLastname = normalizeName(candidate.player?.lastname || '');
          
          // Coincidencia si el nombre completo o apellido coinciden
          return candidateName === normalizedPlayerName || 
                 normalizedPlayerName.includes(candidateLastname);
        });
        
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
 */
export async function getPlayerStatsForMultipleJornadas(
  playerId: number,
  jornadas: number[],
  options: { season?: number; forceRefresh?: boolean } = {}
) {
  const results = [];

  for (const jornada of jornadas) {
    try {
      const stats = await getPlayerStatsForJornada(playerId, jornada, options);
      results.push(stats);
      
      // Respetar rate limit
      if (DEFAULT_REQUEST_DELAY_MS > 0) {
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

export const PlayerStatsService = {
  getPlayerStatsForJornada,
  getPlayerStatsForMultipleJornadas,
  updateAllPlayersStatsForJornada,
};
