import axios from 'axios';
import { AppError } from '../utils/errors.js';
// Importar el sistema centralizado de puntos
import {
  calculatePlayerPointsTotal,
  normalizeRole as normalizeRoleShared,
  Role,
} from '../../../shared/pointsCalculator.js';

const API_BASE = 'https://v3.football.api-sports.io';
const FALLBACK_APISPORTS_KEY = '099ef4c6c0803639d80207d4ac1ad5da';
const DEFAULT_CACHE_TTL_MS = Number(process.env.FOOTBALL_API_CACHE_TTL_MS ?? 60_000);

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

// Exportar la función de normalización centralizada
export const normalizeRole = normalizeRoleShared;

// Exportar la función de cálculo de puntos centralizada
export function calculatePlayerPoints(stats: any, role: Role): number {
  return calculatePlayerPointsTotal(stats, role);
}

export function createEmptyStats() {
  return {
    games: {
      minutes: 0,
      position: null,
      number: null,
      rating: null,
      captain: false,
      substitute: false,
    },
    shots: { total: 0, on: 0 },
    goals: { total: 0, assists: 0, conceded: 0 },
    passes: { total: 0, key: 0 },
    tackles: { total: 0, interceptions: 0 },
    duels: { total: 0, won: 0 },
    dribbles: { attempts: 0, success: 0 },
    fouls: { drawn: 0, committed: 0 },
    cards: { yellow: 0, red: 0 },
    penalty: { won: 0, committed: 0, scored: 0, missed: 0, saved: 0 },
    goalkeeper: { saves: 0, conceded: 0, cleanSheets: 0, savedPenalties: 0 },
  } as const;
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

async function fetchPlayerSeasonInfo(playerId: number) {
  const cacheKey = String(playerId);
  const cached = getFromCache(playerInfoCache, cacheKey);
  if (cached !== undefined) return cached;

  const response = await api.get('/players', {
    params: {
      id: playerId,
      season: process.env.FOOTBALL_API_SEASON ?? 2025,
      league: 140,
    },
  });
  const info = response.data?.response?.[0] ?? null;
  setInCache(playerInfoCache, cacheKey, info);
  return info;
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

export async function getPlayerMatchdayStats(playerId: number, matchday: number, roleInput?: string | null) {
  if (!matchday || matchday < 1) {
    throw new AppError(400, 'INVALID_MATCHDAY', 'La jornada debe ser un número positivo');
  }

  try {
    const fixtures = await fetchMatchdayFixtures(matchday);
    const playerInfo = await fetchPlayerSeasonInfo(playerId);
    if (!playerInfo) return { matchday, points: null, stats: null };

    const statsArray = Array.isArray(playerInfo.statistics) ? playerInfo.statistics : [];
    const preferredStats = statsArray.filter((s: any) => s?.league?.id === 140);
    const statsSource = preferredStats.length ? preferredStats : statsArray;

    const playerTeamIds = statsSource.map((s: any) => s?.team?.id).filter((id: any) => typeof id === 'number');
    if (!playerTeamIds.length) return { matchday, points: null, stats: null };

    let teamFixture: any = null;
    for (const teamId of playerTeamIds) {
      teamFixture = fixtures.find((f: any) => f?.teams?.home?.id === teamId || f?.teams?.away?.id === teamId);
      if (teamFixture) break;
    }

    if (!teamFixture) return { matchday, points: 0, stats: createEmptyStats() };

    const teamsData = await fetchFixturePlayers(teamFixture.fixture.id);

    let playerStats: any = null;
    for (const teamData of teamsData) {
      const players = teamData?.players || [];
      const found = players.find((p: any) => p?.player?.id === playerId);
      if (found?.statistics?.[0]) {
        playerStats = found.statistics[0];
        break;
      }
    }

    

// Fallback 1: coincidencia por nombre (normalizado) cuando el ID no aparece
if (!playerStats && (playerInfo as any)?.player?.name) {
  const target = String((playerInfo as any).player.name)
    .normalize('NFD')
    .replace(/̀-ͯ/g, '')
    .toLowerCase();
  for (const teamData of teamsData) {
    const players = teamData?.players || [];
    const foundByName = players.find((p: any) => {
      const name = String(p?.player?.name || '')
        .normalize('NFD')
        .replace(/̀-ͯ/g, '')
        .toLowerCase();
      return name && name === target && p?.statistics?.[0];
    });
    if (foundByName?.statistics?.[0]) {
      playerStats = foundByName.statistics[0];
      break;
    }
  }
}

// Fallback 2: si el rol esperado es portero, tomar el portero con minutos > 0
const expectedRole = normalizeRole(roleInput ?? (playerInfo as any)?.statistics?.[0]?.games?.position);
if (!playerStats && expectedRole === 'Goalkeeper') {
  for (const teamData of teamsData) {
    const players = teamData?.players || [];
    const gk = players.find((p: any) => {
      const pos = String(p?.statistics?.[0]?.games?.position || '')
        .trim()
        .toLowerCase();
      const mins = Number(p?.statistics?.[0]?.games?.minutes || 0);
      return mins > 0 && (pos === 'g' || pos === 'gk' || pos.includes('goal'));
    });
    if (gk?.statistics?.[0]) {
      playerStats = gk.statistics[0];
      break;
    }
  }
}

if (!playerStats) return { matchday, points: 0, stats: createEmptyStats() };



    const role = normalizeRole(roleInput ?? playerStats?.games?.position);
    const points = calculatePlayerPoints(playerStats, role);

    return { matchday, points, stats: playerStats };
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 403) {
      throw new AppError(502, 'FOOTBALL_API_FORBIDDEN', 'La API de Fútbol rechazó la petición. Revisa la API key configurada.');
    }
    if (status === 429) {
      await delay(2000);
      return getPlayerMatchdayStats(playerId, matchday, roleInput);
    }
    throw error;
  }
}      
