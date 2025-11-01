import axios from "axios";
import { calculatePlayerPointsTotal, normalizeRole as normalizeRoleShared } from "../shared/pointsCalculator.js";

const API_BASE = "https://v3.football.api-sports.io";
const FALLBACK_APISPORTS_KEY = "07bc9c707fe2d6169fff6e17d4a9e6fd";
const DEFAULT_CACHE_TTL_MS = Number(process.env.FOOTBALL_API_CACHE_TTL_MS ?? 60_000);
const DEFAULT_REFRESH_INTERVAL_MS = Number(process.env.REALTIME_REFRESH_MS ?? 60_000);
const DEFAULT_REQUEST_DELAY_MS = Number(process.env.FOOTBALL_API_DELAY_MS ?? 250);

// Active window defaults: start at 13:00, end at 01:00 (wraps past midnight)
const DEFAULT_ACTIVE_START_HOUR = Number(process.env.REALTIME_ACTIVE_START_HOUR ?? 13);
const DEFAULT_ACTIVE_END_HOUR = Number(process.env.REALTIME_ACTIVE_END_HOUR ?? 1);

function isWithinActiveWindow(now: Date = new Date()) {
  const start = Number(process.env.REALTIME_ACTIVE_START_HOUR ?? DEFAULT_ACTIVE_START_HOUR);
  const end = Number(process.env.REALTIME_ACTIVE_END_HOUR ?? DEFAULT_ACTIVE_END_HOUR);
  const hour = now.getHours(); // 0-23 server local time

  if (start === end) {
    // equal means full-day active
    return true;
  }
  if (start < end) {
    // e.g. 9 -> 21
    return hour >= start && hour < end;
  }
  // wrap-around e.g. 13 -> 1 (means 13..23 and 0..0)
  return hour >= start || hour < end;
}

function buildHeaders() {
  const candidates = [
    process.env.FOOTBALL_API_KEY,
    process.env.APISPORTS_API_KEY,
    process.env.API_FOOTBALL_KEY,
    process.env.APISPORTS_KEY,
  ].filter(Boolean) as string[];

  if (candidates.length > 0) return { "x-apisports-key": candidates[0] };

  const rapidCandidates = [
    process.env.RAPIDAPI_KEY,
    process.env.RAPIDAPI_FOOTBALL_KEY,
    process.env.API_FOOTBALL_RAPID_KEY,
  ].filter(Boolean) as string[];

  if (rapidCandidates.length > 0)
    return { "x-rapidapi-key": rapidCandidates[0], "x-rapidapi-host": "v3.football.api-sports.io" };

  return { "x-apisports-key": FALLBACK_APISPORTS_KEY };
}

const api = axios.create({ baseURL: API_BASE, timeout: 15000, headers: buildHeaders() });

type CachedLeaguePoints = {
  lastUpdate: number;
  players: Array<{
    playerId: number;
    name: string;
    team: string;
    fixtureId: number;
    points: number | null;
    rawStats?: any;
  }>;
};

// Cache: leagueId -> CachedLeaguePoints
const cache = new Map<string, CachedLeaguePoints>();

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchLiveFixtures() {
  const res = await api.get("/fixtures", { params: { live: "all" } });
  return res.data?.response ?? [];
}

// Track fixtures status to detect transitions from live -> finished
const seenFixtures = new Map<number, string>(); // fixtureId -> statusShort

function isFinishedStatus(statusShort: string | undefined) {
  if (!statusShort) return false;
  return ["FT", "AET", "FT_PEN", "PEN", "ABAN", "AWD", "WO"].includes(statusShort);
}

import { getPlayerStatsForJornada } from "../services/playerStats.service.js";

async function fetchPlayerStats(playerId: number) {
  // Use season if provided by env
  const params: any = { id: playerId };
  if (process.env.FOOTBALL_API_SEASON) params.season = process.env.FOOTBALL_API_SEASON;
  try {
    const res = await api.get("/players", { params });
    return res.data?.response?.[0] ?? null;
  } catch (err) {
    return null;
  }
}

export async function refreshRealtimeCache() {
  try {
    // Check active window: skip fetching outside configured hours to avoid unnecessary calls
    if (!isWithinActiveWindow()) {
      // skip actual API calls outside the active window
      // keep existing cache untouched
      // eslint-disable-next-line no-console
      console.log(`[realtimeCache] Outside active window. Skipping refresh at ${new Date().toISOString()}`);
      return;
    }

    const fixtures = await fetchLiveFixtures();

    if (!fixtures || fixtures.length === 0) {
      // nothing live, clear cache
      cache.clear();
      return;
    }

    // For each fixture, collect players with minutes > 0 (or present in lineup)
    const perLeaguePlayers = new Map<string, Array<{ playerId: number; name: string; team: string; fixtureId: number; raw?: any }>>();

    for (const fixture of fixtures) {
      const leagueId = String(fixture.league?.id ?? fixture.league?.name ?? "unknown");
      const teams = fixture?.players || [];
      const statusShort = fixture?.fixture?.status?.short;
      const fixtureId = fixture.fixture?.id;

      // detect transition: if we saw it live before and now it's finished, persist stats for that fixture
      if (fixtureId && statusShort && isFinishedStatus(statusShort)) {
        const prev = seenFixtures.get(fixtureId);
        if (prev && prev !== statusShort) {
          // fixture transitioned to finished -> persist stats for players in this fixture
          (async () => {
            try {
              // determine matchday from round string e.g. 'Regular Season - 5'
              const round = fixture.league?.round || '';
              const m = String(round).match(/(\d+)/);
              const matchday = m ? Number(m[1]) : undefined;

              if (matchday) {
                // iterate all players and persist their stats for this jornada
                for (const team of teams) {
                  for (const p of (team.players || [])) {
                    try {
                      await getPlayerStatsForJornada(Number(p.player.id), matchday, { forceRefresh: true });
                    } catch (err) {
                      // ignore per-player errors
                    }
                  }
                }
              }
            } catch (err) {
              // ignore
            }
          })();
        }
      }
      if (fixtureId && statusShort) {
        seenFixtures.set(fixtureId, statusShort);
      }
      for (const team of teams) {
        const players = team.players || [];
        for (const p of players) {
          // consider players who have played minutes or appear in statistics
          const mins = Number(p?.statistics?.[0]?.games?.minutes ?? 0);
          if (mins > 0 || p?.statistics?.[0]) {
            if (!perLeaguePlayers.has(leagueId)) perLeaguePlayers.set(leagueId, []);
            perLeaguePlayers.get(leagueId)!.push({
              playerId: p.player.id,
              name: p.player.name,
              team: team.team?.name ?? "",
              fixtureId: fixture.fixture.id,
              raw: p.statistics?.[0],
            });
          }
        }
      }
    }

    // For each league group, fetch individual player stats and calculate points
    for (const [leagueId, players] of perLeaguePlayers.entries()) {
      const outPlayers: CachedLeaguePoints["players"] = [];

      for (const p of players) {
        // small delay to avoid bursting the API
        await delay(DEFAULT_REQUEST_DELAY_MS);
        const statsResp = await fetchPlayerStats(p.playerId);
        let points: number | null = null;
        try {
          const role = normalizeRoleShared(statsResp?.statistics?.[0]?.games?.position ?? p.raw?.games?.position ?? null);
          points = statsResp ? calculatePlayerPointsTotal(statsResp.statistics?.[0] ?? statsResp, role as any) : null;
        } catch (err) {
          points = null;
        }

        outPlayers.push({
          playerId: p.playerId,
          name: p.name,
          team: p.team,
          fixtureId: p.fixtureId,
          points,
          rawStats: statsResp?.statistics?.[0] ?? p.raw,
        });
      }

      cache.set(leagueId, { lastUpdate: Date.now(), players: outPlayers });
    }
  } catch (err) {
    // keep previous cache on error
    // console.error handled by caller when starting interval
    throw err;
  }
}

export function getCachedPointsForLeague(leagueId: string) {
  const entry = cache.get(leagueId);
  if (!entry) return null;
  return entry;
}

let intervalRef: any = null;

export function startRealtimeCache() {
  // run immediately and then on interval
  (async () => {
    try {
      // only run immediate refresh if we're within active window
      if (isWithinActiveWindow()) {
        await refreshRealtimeCache();
      } else {
        // eslint-disable-next-line no-console
        console.log('[realtimeCache] Immediate refresh skipped (outside active window)');
      }
    } catch (err) {
      // ignore
    }
  })();

  if (intervalRef) clearInterval(intervalRef);
  intervalRef = setInterval(async () => {
    try {
      if (isWithinActiveWindow()) {
        await refreshRealtimeCache();
        // eslint-disable-next-line no-console
        console.log('[realtimeCache] refreshed');
      } else {
        // eslint-disable-next-line no-console
        console.log('[realtimeCache] periodic refresh skipped (outside active window)');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[realtimeCache] refresh error:', err instanceof Error ? err.message : String(err));
    }
  }, DEFAULT_REFRESH_INTERVAL_MS);
}

export function stopRealtimeCache() {
  if (intervalRef) clearInterval(intervalRef);
  intervalRef = null;
}

export default {
  refreshRealtimeCache,
  getCachedPointsForLeague,
  startRealtimeCache,
  stopRealtimeCache,
};
