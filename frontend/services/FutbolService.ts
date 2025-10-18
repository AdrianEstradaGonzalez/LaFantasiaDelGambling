// FootballService.ts
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import EncryptedStorage from 'react-native-encrypted-storage';
import { LigaService } from './LigaService';
import { ApuestasEvaluator } from './ApuestasEvaluator';
import { PresupuestoService } from './PresupuestoService';
import { BetOptionService, BetOption } from './BetOptionService';

// API-FOOTBALL (API-Sports v3)
const API_BASE = "https://v3.football.api-sports.io";
const LA_LIGA_LEAGUE_ID = 140; // La Liga ID en API-FOOTBALL
const SEASON_DEFAULT = 2025;
const CLEAN_SHEET_MINUTES = 60;

// Nota: por simplicidad usamos la key proporcionada; idealmente cargar desde .env o almacenamiento seguro
export const HEADERS = {
  "x-apisports-key": "66ba89a63115cb5dc1155294ad753e09"
};

export type Partido = {
  localCrest: string | undefined;
  visitanteCrest: string | undefined;
  id: number;
  local: string;
  visitante: string;
  fecha?: string;
  hora?: string;
  notStarted: boolean;
  started: boolean;
  finished: boolean;
  resultado?: string;
  jornada: number;
};

export type TeamMinimal = {
  id: number;
  name: string;
  crest?: string;
};

export type Player = {
  id: number;
  name: string;
  position?: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker' | string;
  nationality?: string;
  shirtNumber?: number;
  dateOfBirth?: string;
  photo?: string;
  teamId: number;
  teamName: string;
  teamCrest?: string;
};

type PointsBreakdownEntry = {
  label: string;
  amount: number | string;
  points: number;
};

function fmtFechaHoraES(isoUtc?: string) {
  if (!isoUtc) return { fecha: undefined, hora: undefined };
  const d = new Date(isoUtc);
  const fecha = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "2-digit", timeZone: "Europe/Madrid"
  }).format(d);
  const hora = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid"
  }).format(d);
  return { fecha, hora };
}

// Mapea los status de API-FOOTBALL (fixture.status.short)
function flags(short: string) {
  const ns = ["TBD", "NS", "PST", "CANC", "ABD", "AWD", "WO"];
  const live = ["1H", "2H", "ET", "BT", "HT", "P", "SUSP", "INT"]; // en juego/pausas
  const done = ["FT", "AET", "PEN"];
  const notStarted = ns.includes(short);
  const started = live.includes(short);
  const finished = done.includes(short);
  return { notStarted, started, finished };
}

// Persistencia con EncryptedStorage
async function loadState() {
  try {
    const raw = await EncryptedStorage.getItem("matchday_state");
    if (!raw) return { season: 2025, currentMatchday: 9 };
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Error loading matchday state:', error);
    return { season: 2025, currentMatchday: 9 };
  }
}

async function saveState(state: { season: number; currentMatchday: number }) {
  try {
    await EncryptedStorage.setItem("matchday_state", JSON.stringify(state));
  } catch (error) {
    console.warn('Error saving matchday state:', error);
  }
}

export default class FootballService {
  private static season = SEASON_DEFAULT;
  private static startMatchday = 9;
  // Simple caches to avoid hitting API repeatedly
  private static teamsCache: TeamMinimal[] | null = null;
  private static playersCache: Player[] | null = null;
  private static teamsPromise: Promise<TeamMinimal[]> | null = null;
  private static playersPromise: Promise<Player[]> | null = null;
  private static prefetchInProgress: Promise<void> | null = null;
  private static readonly TEAMS_CACHE_KEY = 'laLiga_teams_v2';
  private static readonly PLAYERS_CACHE_KEY = 'laLiga_players_v3';
  private static matchesCache: Partido[] | null = null;
  private static matchesPromise: Promise<Partido[]> | null = null;
  private static readonly MATCHES_CACHE_KEY = 'laLiga_matches_v2';
  private static readonly TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
  private static readonly STATS_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

  private static matchdayFixturesCache = new Map<number, { ts: number; data: any[] }>();
  private static matchdayFixturesPromises = new Map<number, Promise<any[]>>();

  private static fixturePlayersCache = new Map<number, { ts: number; data: any[] }>();
  private static fixturePlayersPromises = new Map<number, Promise<any[]>>();

  private static playerInfoCache = new Map<number, { ts: number; data: any | null }>();
  private static playerInfoPromises = new Map<number, Promise<any | null>>();

  private static playerStatsCache = new Map<string, { ts: number; data: any | null }>();
  private static playerStatsPromises = new Map<string, Promise<any | null>>();

  static async setMatchday(jornada: number, season = FootballService.season) {
    await saveState({ season, currentMatchday: jornada });
  }

  // ---------- Cache helpers ----------
  private static async loadFromStorage<T>(key: string): Promise<T | null> {
    try {
      const raw = await EncryptedStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const { ts, data } = parsed || {};
      if (!ts || !data) return null;
      if (Date.now() - ts > FootballService.TTL_MS) return null; // expirado
      return data as T;
    } catch {
      return null;
    }
  }

  private static async saveToStorage<T>(key: string, data: T) {
    try {
      const payload = JSON.stringify({ ts: Date.now(), data });
      await EncryptedStorage.setItem(key, payload);
    } catch {
      // ignore storage errors
    }
  }

  private static getCachedValue<T>(store: Map<any, { ts: number; data: T }>, key: any, ttl: number): T | null {
    const entry = store.get(key);
    if (entry && Date.now() - entry.ts < ttl) {
      return entry.data;
    }
    return null;
  }

  private static setCachedValue<T>(store: Map<any, { ts: number; data: T }>, key: any, data: T) {
    store.set(key, { ts: Date.now(), data });
  }

  private static async fetchWithRetry<T>(config: AxiosRequestConfig, retries = 3, backoffMs = 700): Promise<AxiosResponse<T>> {
    let lastError: any;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await axios.request<T>({ method: 'GET', ...config });
        return response;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        if (status === 429 || status === 408 || (status >= 500 && status < 600)) {
          const delayMs = backoffMs * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  private static async fetchMatchdayFixtures(matchday: number): Promise<any[]> {
    const cached = this.getCachedValue(this.matchdayFixturesCache, matchday, this.TTL_MS);
    if (cached) return cached;

    let promise = this.matchdayFixturesPromises.get(matchday);
    if (!promise) {
      promise = (async () => {
        const response = await this.fetchWithRetry<{ response: any[] }>({
          url: `${API_BASE}/fixtures`,
          headers: HEADERS,
          params: {
            league: LA_LIGA_LEAGUE_ID,
            season: this.season,
            round: `Regular Season - ${matchday}`,
          },
          timeout: 10000,
        });
        const fixtures = response?.data?.response ?? [];
        this.setCachedValue(this.matchdayFixturesCache, matchday, fixtures);
        return fixtures;
      })().finally(() => this.matchdayFixturesPromises.delete(matchday));

      this.matchdayFixturesPromises.set(matchday, promise);
    }

    return promise;
  }

  private static async fetchFixturePlayers(fixtureId: number): Promise<any[]> {
    const cached = this.getCachedValue(this.fixturePlayersCache, fixtureId, this.TTL_MS);
    if (cached) return cached;

    let promise = this.fixturePlayersPromises.get(fixtureId);
    if (!promise) {
      promise = (async () => {
        const response = await this.fetchWithRetry<{ response: any[] }>({
          url: `${API_BASE}/fixtures/players`,
          headers: HEADERS,
          params: { fixture: fixtureId },
          timeout: 10000,
        });
        const data = response?.data?.response ?? [];
        this.setCachedValue(this.fixturePlayersCache, fixtureId, data);
        return data;
      })().finally(() => this.fixturePlayersPromises.delete(fixtureId));

      this.fixturePlayersPromises.set(fixtureId, promise);
    }

    return promise;
  }

  private static async fetchPlayerSeasonInfo(playerId: number): Promise<any | null> {
    const cached = this.getCachedValue(this.playerInfoCache, playerId, this.TTL_MS);
    if (cached !== null) return cached;

    let promise = this.playerInfoPromises.get(playerId);
    if (!promise) {
      promise = (async () => {
        try {
          const response = await this.fetchWithRetry<{ response: any[] }>({
            url: `${API_BASE}/players`,
            headers: HEADERS,
            params: {
              id: playerId,
              season: this.season,
              league: LA_LIGA_LEAGUE_ID,
            },
            timeout: 10000,
          });
          const info = response?.data?.response?.[0] ?? null;
          if (info) {
            this.setCachedValue(this.playerInfoCache, playerId, info);
          }
          return info;
        } catch (error: any) {
          console.warn('FootballService.fetchPlayerSeasonInfo error:', error?.message || error);
          return null;
        }
      })().finally(() => this.playerInfoPromises.delete(playerId));

      this.playerInfoPromises.set(playerId, promise);
    }

    return promise;
  }

  private static createEmptyStats() {
    return {
      games: { appearances: 0, lineups: 0, minutes: 0, position: '' },
      goals: { total: 0, assists: 0, conceded: 0 },
      passes: { total: 0, key: 0, accuracy: '0%' },
      shots: { total: 0, on: 0 },
      dribbles: { attempts: 0, success: 0 },
      tackles: { total: 0, blocks: 0, interceptions: 0 },
      duels: { total: 0, won: 0 },
      cards: { yellow: 0, red: 0 },
      fouls: { drawn: 0, committed: 0 },
      penalty: { won: 0, committed: 0, scored: 0, missed: 0, saved: 0 },
      rating: undefined,
      goalkeeper: {
        saves: 0,
        conceded: 0,
        cleanSheets: 0,
        savedPenalties: 0,
      },
    };
  }

  static async getLaLigaTeamsCached(): Promise<TeamMinimal[]> {
    if (this.teamsCache) return this.teamsCache;
    // try storage first
    const fromStore = await this.loadFromStorage<TeamMinimal[]>(this.TEAMS_CACHE_KEY);
    if (fromStore && fromStore.length) {
      this.teamsCache = fromStore;
      return fromStore;
    }
    // Do not hit network here; if prefetch in progress, await it and retry cache.
    if (this.prefetchInProgress) {
      try { await this.prefetchInProgress; } catch {}
      const fromStoreAfter = await this.loadFromStorage<TeamMinimal[]>(this.TEAMS_CACHE_KEY);
      if (fromStoreAfter && fromStoreAfter.length) {
        this.teamsCache = fromStoreAfter;
        return fromStoreAfter;
      }
    }
    // No cache available
    return [];
  }

  static async getAllPlayersCached(): Promise<Player[]> {
    if (this.playersCache) return this.playersCache;
    // try storage first
    const fromStore = await this.loadFromStorage<Player[]>(this.PLAYERS_CACHE_KEY);
    if (fromStore && fromStore.length) {
      this.playersCache = fromStore;
      return fromStore;
    }
    // No cache available - return empty array (PlayersList will handle progressive loading)
    return [];
  }

  // New method for progressive loading in PlayersList
  static async getAllPlayersProgressive(
    onTeamLoaded?: (players: Player[], teamName: string, progress: { done: number; total: number }) => void
  ): Promise<Player[]> {
    const teams = await this.getLaLigaTeamsCached();
    if (teams.length === 0) {
      // Fallback: fetch teams directly if cache is empty
      const freshTeams = await this.getLaLigaTeams();
      if (freshTeams.length === 0) return [];
      // Persist fresh teams so dropdowns use correct IDs
      this.teamsCache = freshTeams;
      await this.saveToStorage(this.TEAMS_CACHE_KEY, freshTeams);
      
      // En lugar de consultar equipo por equipo (problemas con cedidos), traemos todos los jugadores de la liga
      const allPlayers = await this.getAllLeaguePlayers();
      // Emitir progresos por equipos (aproximado): distribuimos por nombre de equipo
      const playersByTeam = new Map<number, Player[]>();
      for (const p of allPlayers) {
        const arr = playersByTeam.get(p.teamId) ?? [];
        arr.push(p);
        playersByTeam.set(p.teamId, arr);
      }
      let done = 0;
      for (const team of freshTeams) {
        done += 1;
        onTeamLoaded?.(allPlayers.slice(), team.name, { done, total: freshTeams.length });
        await new Promise(r => setTimeout(r, 20));
      }
      return allPlayers;
    }

    // Cuando hay equipos en caché, igualmente usamos el fetch por liga para evitar problemas de cesiones
    const allPlayers: Player[] = await this.getAllLeaguePlayers();
    // Simular callbacks de progreso por equipo
    let done = 0;
    for (const t of teams) {
      done += 1;
      onTeamLoaded?.(allPlayers.slice(), t.name, { done, total: teams.length });
      await new Promise(r => setTimeout(r, 20));
    }
    
    // Cache the result for future use
    if (allPlayers.length > 0) {
      this.playersCache = allPlayers;
      await this.saveToStorage(this.PLAYERS_CACHE_KEY, allPlayers);
    }
    
    return allPlayers;
  }

  // Trae todos los jugadores de LaLiga en la temporada actual, asignados a su equipo ACTUAL
  private static async getAllLeaguePlayers(): Promise<Player[]> {
    const all: Player[] = [];
    let page = 1;
    let totalPages = 1;
    const seen = new Set<number>();
    do {
      try {
        const { data } = await axios.get(`${API_BASE}/players`, {
          headers: HEADERS,
          timeout: 15000,
          params: { league: LA_LIGA_LEAGUE_ID, season: FootballService.season, page },
        });
        const list = data?.response ?? [];
        totalPages = Math.min(data?.paging?.total ?? 1, 20); // seguridad
        for (const item of list) {
          const player = item?.player;
          const stats = item?.statistics?.[0];
          if (!player?.id) continue;
          if (seen.has(player.id)) continue;
          seen.add(player.id);
          all.push({
            id: player.id,
            name: player.name,
            position: (stats?.games?.position) ?? player.position,
            nationality: player.nationality,
            shirtNumber: stats?.games?.number,
            dateOfBirth: player.birth?.date,
            photo: player.photo,
            teamId: stats?.team?.id,
            teamName: stats?.team?.name,
            teamCrest: stats?.team?.logo,
          });
        }
        page += 1;
        await new Promise(r => setTimeout(r, 80));
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 429 || status === 403) break;
        console.warn('getAllLeaguePlayers error:', e?.message ?? e);
        break;
      }
    } while (page <= totalPages);
    return all;
  }

  // ---------- Matches cached ----------
  static async getAllMatchesCached(): Promise<Partido[]> {
    if (this.matchesCache) return this.matchesCache;
    if (this.matchesPromise) return this.matchesPromise;
    const fromStore = await this.loadFromStorage<Partido[]>(this.MATCHES_CACHE_KEY);
    if (fromStore && fromStore.length) {
      this.matchesCache = fromStore;
      return fromStore;
    }
    this.matchesPromise = (async () => {
      const matches = await this.getAllMatchesWithJornadas();
      this.matchesCache = matches;
      this.matchesPromise = null;
      if (matches.length) this.saveToStorage(this.MATCHES_CACHE_KEY, matches);
      return matches;
    })();
    return this.matchesPromise;
  }

  static async prefetchAllData(force = false) {
    if (this.prefetchInProgress && !force) {
      // another prefetch is in progress; reuse it
      try { await this.prefetchInProgress; } catch {}
      return;
    }
    this.prefetchInProgress = (async () => {
      try {
        // If already in memory and not forced, skip
        if (!force && this.teamsCache && this.playersCache) return;
        // Always fetch fresh teams for prefetch to ensure completeness
        const teams = await this.getLaLigaTeams();
        this.teamsCache = teams;
        if (teams.length) await this.saveToStorage(this.TEAMS_CACHE_KEY, teams);
        // fetch all players sequentially
        const players = await (async () => {
          const all: Player[] = [];
          for (const t of teams) {
            const squad = await this.getTeamSquad(t.id, t.name, t.crest);
            all.push(...squad);
            await new Promise(r => setTimeout(r, 200)); // un poco más de margen
          }
          return all;
        })();
        // Solo sobreescribir cache si obtuvimos un dataset razonable (evita clavar cache parcial)
        if (players.length >= Math.floor((teams.length || 1) * 10)) { // ~10 jugadores por equipo
          this.playersCache = players;
          await this.saveToStorage(this.PLAYERS_CACHE_KEY, players);
        } else {
          console.warn(`prefetchAllData: jugadores parciales (${players.length}) — mantengo cache previa`);
        }

        // Prefetch matches (toda la temporada)
        const matches = await this.getAllMatchesWithJornadas();
        if (matches.length) {
          this.matchesCache = matches;
          await this.saveToStorage(this.MATCHES_CACHE_KEY, matches);
        }
      } catch (e) {
        console.warn('prefetchAllData failed', e);
      }
    })();
    try { await this.prefetchInProgress; } finally { this.prefetchInProgress = null; }
  }

  static async waitForPrefetch(): Promise<void> {
    if (this.prefetchInProgress) {
      try { await this.prefetchInProgress; } catch {}
    }
  }

  static async getAllMatchesWithJornadas(matchdayNum?: number): Promise<Partido[]> {
    try {
      const params: Record<string, string | number> = {
        league: LA_LIGA_LEAGUE_ID,
        season: FootballService.season,
      };
      if (matchdayNum != null) {
        // En API-FOOTBALL las jornadas van por round string "Regular Season - X"
        params["round"] = `Regular Season - ${matchdayNum}`;
      }
      const url = `${API_BASE}/fixtures`;
      const { data } = await axios.get(url, {
        headers: HEADERS,
        timeout: 10000,
        params,
      });

      const fixtures = data?.response ?? [];
      return fixtures.map((f: any) => {
        const short = f?.fixture?.status?.short as string | undefined;
        const { notStarted, started, finished } = flags(short ?? "");
        const { fecha, hora } = fmtFechaHoraES(f?.fixture?.date);
        const h = f?.goals?.home;
        const a = f?.goals?.away;
        // jornada desde league.round tipo "Regular Season - 9"
        const roundStr = (f?.league?.round as string | undefined) ?? "";
        const jd = (() => {
          const m = roundStr.match(/(\d+)/);
          return m ? parseInt(m[1], 10) : undefined;
        })();
        return {
          id: f.fixture.id,
          local: f.teams?.home?.name,
          visitante: f.teams?.away?.name,
          fecha,
          hora,
          notStarted,
          started,
          finished,
          resultado: finished && h != null && a != null ? `${h} - ${a}` : undefined,
          localCrest: f.teams?.home?.logo,
          visitanteCrest: f.teams?.away?.logo,
          jornada: jd ?? FootballService.startMatchday,
        } as Partido;
      });
    } catch (error) {
      console.error('Error fetching matches:', error);
      return []; // Return empty array on error
    }
  }

  static async getMatchesForCurrentAndAdvance(): Promise<{ jornada: number; partidos: Partido[] }> {
    const state = await loadState();
    const params = {
      league: LA_LIGA_LEAGUE_ID,
      season: state.season,
      round: `Regular Season - ${state.currentMatchday}`,
    };
    const { data } = await axios.get(`${API_BASE}/fixtures`, { headers: HEADERS, params });
    const fixtures = data?.response ?? [];
    const partidos = fixtures.map((f: any) => {
      const short = f?.fixture?.status?.short as string | undefined;
      const { notStarted, started, finished } = flags(short ?? "");
      const { fecha, hora } = fmtFechaHoraES(f?.fixture?.date);
      const h = f?.goals?.home;
      const a = f?.goals?.away;
      // jornada desde league.round
      const roundStr = (f?.league?.round as string | undefined) ?? "";
      const jd = (() => {
        const m = roundStr.match(/(\d+)/);
        return m ? parseInt(m[1], 10) : state.currentMatchday;
      })();
      return {
        id: f.fixture.id,
        local: f.teams?.home?.name,
        visitante: f.teams?.away?.name,
        fecha,
        hora,
        notStarted,
        started,
        finished,
        resultado: finished && h != null && a != null ? `${h} - ${a}` : undefined,
        jornada: jd,
      } as Partido;
    });

    if (partidos.length > 0) {
      await saveState({ season: state.season, currentMatchday: state.currentMatchday + 1 });
    }

    const jornadaDevuelta = partidos?.[0]?.jornada ?? state.currentMatchday;
    return { jornada: jornadaDevuelta, partidos };
  }

  // ======= Points calculation (frontend) =======
  private static mapRoleCode(role: 'GK'|'DEF'|'CEN'|'DEL'): 'GK'|'DEF'|'MID'|'ATT' {
    switch (role) {
      case 'GK': return 'GK';
      case 'DEF': return 'DEF';
      case 'CEN': return 'MID';
      case 'DEL': return 'ATT';
      default: return 'MID';
    }
  }

  private static canonicalRoleToCode(role: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'): 'GK'|'DEF'|'CEN'|'DEL' {
    switch (role) {
      case 'Goalkeeper': return 'GK';
      case 'Defender': return 'DEF';
      case 'Midfielder': return 'CEN';
      case 'Attacker': return 'DEL';
    }
  }

  private static calculatePlayerPointsDetailed(
    stats: any,
    roleCode: 'GK'|'DEF'|'CEN'|'DEL'
  ): { total: number; breakdown: PointsBreakdownEntry[] } {
    if (!stats || !stats.games) {
      return { total: 0, breakdown: [] };
    }

    const role = this.mapRoleCode(roleCode);
    const breakdown: PointsBreakdownEntry[] = [];
    let total = 0;

    const add = (label: string, amount: number | string | undefined, points: number) => {
      if (points === 0) return;
      breakdown.push({ label, amount: amount ?? 0, points: Math.trunc(points) });
      total += points;
    };

    const minutes = Number(stats.games?.minutes ?? 0);
    let minutesPoints = 0;
    if (minutes > 0 && minutes < 45) minutesPoints = 1;
    else if (minutes >= 45) minutesPoints = 2;
    if (minutesPoints !== 0) add('Minutos jugados', minutes, minutesPoints);

    const goals = stats.goals || {};
    const cards = stats.cards || {};
    const penalty = stats.penalty || {};
    const passes = stats.passes || {};
    const shots = stats.shots || {};
    const dribbles = stats.dribbles || {};
    const tackles = stats.tackles || {};
    const duels = stats.duels || {};
    const fouls = stats.fouls || {};

    if (goals.assists) add('Asistencias', goals.assists, goals.assists * 3);
    if (cards.yellow) add('Tarjetas amarillas', cards.yellow, -cards.yellow);
    if (cards.red) add('Tarjetas rojas', cards.red, -3 * cards.red);
    if (penalty.won) add('Penaltis ganados', penalty.won, penalty.won * 2);
    if (penalty.committed) add('Penaltis cometidos', penalty.committed, -2 * penalty.committed);
    if (penalty.scored) add('Penaltis marcados', penalty.scored, penalty.scored * 3);
    if (penalty.missed) add('Penaltis fallados', penalty.missed, -2 * penalty.missed);

    if (role === 'GK') {
      const goalsScored = goals.total || 0;
      if (goalsScored) add('Goles marcados', goalsScored, goalsScored * 10);
      const conceded = Number(stats.goalkeeper?.conceded ?? goals.conceded ?? 0);
      if (minutes >= CLEAN_SHEET_MINUTES && conceded === 0) add('Portería a cero', 'Sí', 5);
      const savesVal = Number(stats.goalkeeper?.saves ?? goals.saves ?? 0);
      if (savesVal) add('Paradas', savesVal, savesVal);
      if (conceded) add('Goles encajados', conceded, -2 * conceded);
      const savedPens = Number(penalty.saved ?? stats.goalkeeper?.saved ?? 0);
      if (savedPens) add('Penaltis parados', savedPens, savedPens * 5);
      const interceptions = Number(tackles.interceptions || 0);
      const interceptionPoints = Math.floor(interceptions / 5);
      if (interceptionPoints) add('Recuperaciones', interceptions, interceptionPoints);
    } else if (role === 'DEF') {
      const goalsScored = goals.total || 0;
      if (goalsScored) add('Goles marcados', goalsScored, goalsScored * 6);
      const conceded = Number(goals.conceded ?? stats.goalkeeper?.conceded ?? 0);
      if (minutes >= CLEAN_SHEET_MINUTES && conceded === 0) add('Portería a cero', 'Sí', 4);
      if (conceded) add('Goles encajados', conceded, -conceded);
      const shotsOn = Number(shots.on || 0);
      if (shotsOn) add('Tiros a puerta', shotsOn, shotsOn);
      const duelsWon = Number(duels.won || 0);
      const duelPoints = Math.floor(duelsWon / 2);
      if (duelPoints) add('Duelos ganados', duelsWon, duelPoints);
      const interceptions = Number(tackles.interceptions || 0);
      const interceptionPoints = Math.floor(interceptions / 5);
      if (interceptionPoints) add('Intercepciones', interceptions, interceptionPoints);
    } else if (role === 'MID') {
      const goalsScored = goals.total || 0;
      if (goalsScored) add('Goles marcados', goalsScored, goalsScored * 5);
      const shotsOn = Number(shots.on || 0);
      if (shotsOn) add('Tiros a puerta', shotsOn, shotsOn);
      const passesKey = Number(passes.key || 0);
      if (passesKey) add('Pases clave', passesKey, passesKey);
      const dribblesSuccess = Number(dribbles.success || 0);
      const dribblePoints = Math.floor(dribblesSuccess / 2);
      if (dribblePoints) add('Regates exitosos', dribblesSuccess, dribblePoints);
      const foulsDrawn = Number(fouls.drawn || 0);
      const foulPoints = Math.floor(foulsDrawn / 3);
      if (foulPoints) add('Faltas recibidas', foulsDrawn, foulPoints);
      const interceptions = Number(tackles.interceptions || 0);
      const interceptionPoints = Math.floor(interceptions / 3);
      if (interceptionPoints) add('Intercepciones', interceptions, interceptionPoints);
    } else if (role === 'ATT') {
      const goalsScored = goals.total || 0;
      if (goalsScored) add('Goles marcados', goalsScored, goalsScored * 4);
      const shotsOn = Number(shots.on || 0);
      if (shotsOn) add('Tiros a puerta', shotsOn, shotsOn);
      const passesKey = Number(passes.key || 0);
      if (passesKey) add('Pases clave', passesKey, passesKey);
      const dribblesSuccess = Number(dribbles.success || 0);
      const dribblePoints = Math.floor(dribblesSuccess / 2);
      if (dribblePoints) add('Regates exitosos', dribblesSuccess, dribblePoints);
      const foulsDrawn = Number(fouls.drawn || 0);
      const foulPoints = Math.floor(foulsDrawn / 3);
      if (foulPoints) add('Faltas recibidas', foulsDrawn, foulPoints);
    }

    return { total: Math.trunc(total), breakdown };
  }

  private static calculatePlayerPoints(stats: any, roleCode: 'GK'|'DEF'|'CEN'|'DEL'): number {
    return this.calculatePlayerPointsDetailed(stats, roleCode).total;
  }

  static calculatePointsForStats(
    stats: any,
    role: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'
  ): number {
    return this.getPointsBreakdown(stats, role).total;
  }

  static getPointsBreakdown(
    stats: any,
    role: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'
  ): { total: number; breakdown: PointsBreakdownEntry[] } {
    return this.calculatePlayerPointsDetailed(stats, this.canonicalRoleToCode(role));
  }

  /**
   * Obtener puntos por jugador para una jornada (usando API-FOOTBALL)
   * Hace 1 llamada para fixtures + ~10 llamadas (una por partido) para stats de jugadores.
   */
  static async getPlayersPointsForJornada(jornada: number, playerIds: number[], rolesById: Record<number, 'GK'|'DEF'|'CEN'|'DEL'>): Promise<Record<number, number>> {
    const pointsMap: Record<number, number> = {};
    if (!playerIds.length) return pointsMap;
    try {
      const fixtures = await this.getAllMatchesWithJornadas(jornada);
      if (!fixtures || fixtures.length === 0) return pointsMap;

      const wanted = new Set(playerIds);
      // For each fixture, get players stats and check for our players
      for (const fx of fixtures) {
        try {
          const { data } = await axios.get(`${API_BASE}/fixtures/players`, {
            headers: HEADERS,
            timeout: 12000,
            params: { fixture: fx.id },
          });
          const teamsData = data?.response || [];
          for (const teamData of teamsData) {
            const plist = teamData.players || [];
            for (const p of plist) {
              const pid = p?.player?.id;
              if (!pid || !wanted.has(pid)) continue;
              const stats = p?.statistics?.[0];
              const roleCode = rolesById[pid] ?? 'CEN';
              const pts = this.calculatePlayerPoints(stats, roleCode);
              pointsMap[pid] = (pointsMap[pid] ?? 0) + pts;
              // Once found, remove to reduce future checks
              wanted.delete(pid);
            }
          }
          // Small delay to be gentle
          await new Promise(r => setTimeout(r, 100));
          if (wanted.size === 0) break;
        } catch (e) {
          // ignore fixture errors to allow partial results
        }
      }
    } catch (e) {
      // ignore errors, return what we have
    }
    return pointsMap;
  }

  static async getFormattedAndAdvance(): Promise<{ jornada: number; items: string[] }> {
    const { jornada, partidos } = await FootballService.getMatchesForCurrentAndAdvance();
    const items = partidos.map(p => `${p.local} - ${p.visitante} - ${p.hora ?? "--:--"}`);
    return { jornada, items };
  }

  // Teams and Players helpers for La Liga (PD)
  static async getLaLigaTeams(): Promise<TeamMinimal[]> {
    try {
      const { data } = await axios.get(`${API_BASE}/teams`, {
        headers: HEADERS,
        timeout: 10000,
        params: { league: LA_LIGA_LEAGUE_ID, season: FootballService.season },
      });
      const teams = (data?.response ?? []).map((t: any) => ({
        id: t?.team?.id,
        name: t?.team?.name,
        crest: t?.team?.logo,
      }));
      return teams;
    } catch (err) {
      console.warn('Error fetching LaLiga teams:', err);
      return [];
    }
  }

  static async getTeamSquad(teamId: number, teamName?: string, teamCrest?: string): Promise<Player[]> {
    const normalizePos = (pos?: string) => {
      switch ((pos ?? '').toUpperCase()) {
        case 'G': return 'Goalkeeper';
        case 'D': return 'Defender';
        case 'M': return 'Midfielder';
        case 'F': return 'Attacker';
        case 'GOALKEEPER': return 'Goalkeeper';
        case 'DEFENDER': return 'Defender';
        case 'MIDFIELDER': return 'Midfielder';
        case 'ATTACKER': return 'Attacker';
        default: return pos ?? '';
      }
    };
    
    const attempt = async () => {
      // Usar /players con team y season para obtener SOLO jugadores que actualmente juegan en el equipo
      // (incluye cedidos que llegaron, excluye cedidos que se fueron)
      const playersByIdMap = new Map<number, Player>();
      
      // Función para obtener una página de jugadores
      const fetchPage = async (page: number): Promise<number> => {
        const { data: pdata } = await axios.get(`${API_BASE}/players`, {
          headers: HEADERS,
          timeout: 15000,
          params: { team: teamId, season: FootballService.season, page },
        });
        const plist = pdata?.response ?? [];
        
        for (const item of plist) {
          const player = item?.player;
          const stats = item?.statistics?.[0]; // Primera estadística (temporada actual)
          
          if (!player?.id) continue;
          
          // Evitar duplicados
          if (playersByIdMap.has(player.id)) continue;
          
          const p: Player = {
            id: player.id,
            name: player.name,
            position: normalizePos(stats?.games?.position || player.position),
            nationality: player.nationality,
            shirtNumber: stats?.games?.number,
            dateOfBirth: player.birth?.date,
            photo: player.photo,
            teamId: stats?.team?.id ?? teamId,
            teamName: stats?.team?.name ?? teamName ?? '',
            teamCrest: stats?.team?.logo ?? teamCrest,
          };
          
          playersByIdMap.set(player.id, p);
        }
        
        // Devolver el total de páginas disponibles
        const totalPages = pdata?.paging?.total ?? 1;
        return totalPages;
      };
      
      // Obtener primera página y determinar cuántas hay en total
      const totalPages = await fetchPage(1);
      
      // Límite de seguridad (generalmente no más de 3-4 páginas por equipo)
      const maxPages = Math.min(totalPages, 5);
      
      // Obtener páginas restantes con pequeñas pausas para rate limit
      for (let page = 2; page <= maxPages; page++) {
        try {
          await new Promise(r => setTimeout(r, 100)); // 100ms entre páginas
          await fetchPage(page);
        } catch (e: any) {
          const status = e?.response?.status;
          if (status === 429 || status === 403) {
            // Rate limit alcanzado, detenemos pero mantenemos lo que tenemos
            console.warn(`Rate limit al obtener jugadores para equipo ${teamId}, página ${page}`);
            break;
          }
        }
      }
      
      return Array.from(playersByIdMap.values());
    };
    
    let retries = 2;
    let delay = 5000; // 5s backoff para rate limits
    while (true) {
      try {
        return await attempt();
      } catch (err: any) {
        const status = err?.response?.status;
        if ((status === 429 || status === 403) && retries > 0) {
          await new Promise(r => setTimeout(r, delay));
          retries -= 1;
          delay *= 1.5;
          continue;
        }
        console.warn(`Error fetching squad for team ${teamId}:`, status ?? err?.message ?? err);
        return [];
      }
    }
  }

  static async getAllLaLigaPlayers(progressCb?: (done: number, total: number) => void, delayMs: number = 150): Promise<Player[]> {
    const teams = await this.getLaLigaTeams();
    const total = teams.length;
    let done = 0;
    const all: Player[] = [];
    for (const t of teams) {
      const squad = await this.getTeamSquad(t.id, t.name, t.crest);
      all.push(...squad);
      done += 1;
      progressCb?.(done, total);
      // Delay configurable para respetar rate limits
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return all;
  }

  // Obtener apuestas con odds reales de la API para la próxima jornada
  // Solo 1 apuesta por partido, seleccionada de una amplia variedad de mercados
  static async getApuestasProximaJornada(options?: { ligaId?: string; ligaName?: string }): Promise<Array<{
    matchId: number;
    jornada: number;
    local: string;
    visitante: string;
    localCrest?: string;
    visitanteCrest?: string;
    fecha?: string;
    hora?: string;
    type: string;
    label: string;
    odd: number;
  }>> {
    try {
      // Obtener todos los partidos
      const all = await this.getAllMatchesCached();
      
      // Encontrar la próxima jornada con partidos no iniciados
      const nextJ = all
        .filter(m => m.notStarted)
        .reduce((min, m) => (min == null || m.jornada < min ? m.jornada : min), undefined as number | undefined);
      
      if (!nextJ) return [];
      
      // Filtrar partidos de la próxima jornada (máximo 10)
      const jornadaMatches = all.filter(m => m.jornada === nextJ).slice(0, 10);

      const ligaId = options?.ligaId;
      const ligaName = options?.ligaName ?? 'Liga';
      
      // Si hay ligaId, usar base de datos para consistencia entre jugadores
      if (ligaId) {
        console.log(`🔍 Verificando opciones de apuestas en BD para liga ${ligaId}, jornada ${nextJ}`);
        
        try {
          // Verificar si ya existen opciones en la base de datos
          const optionsExist = await BetOptionService.checkOptionsExist(ligaId, nextJ);
          
          if (optionsExist) {
            console.log(`✅ Opciones encontradas en BD, recuperando...`);
            const dbOptions = await BetOptionService.getBetOptions(ligaId, nextJ);
            
            // Enriquecer desde cache de partidos para completar crest/fecha/hora
            const matchIndex = new Map<number, Partido>();
            for (const m of jornadaMatches) matchIndex.set(m.id, m);
            
            // Transformar de BetOption[] a formato esperado, rellenando faltantes
            const bets = dbOptions.map((opt: BetOption) => {
              const match = matchIndex.get(opt.matchId);
              return {
                matchId: opt.matchId,
                jornada: opt.jornada,
                local: opt.homeTeam || opt.local || match?.local || '',
                visitante: opt.awayTeam || opt.visitante || match?.visitante || '',
                localCrest: opt.localCrest ?? match?.localCrest,
                visitanteCrest: opt.visitanteCrest ?? match?.visitanteCrest,
                fecha: opt.fecha ?? match?.fecha,
                hora: opt.hora ?? match?.hora,
                type: opt.betType || opt.type || '',
                label: opt.betLabel || opt.label || '',
                odd: opt.odd,
              };
            });
            // Enforce 1 apuesta por partido en la visualización (mantiene primeras 2 opciones por partido)
            const byMatchCount = new Map<number, number>();
            const filtered = bets.filter((b) => {
              const c = byMatchCount.get(b.matchId) ?? 0;
              if (c >= 2) return false;
              byMatchCount.set(b.matchId, c + 1);
              return true;
            });

            console.log(`✅ ${filtered.length} opciones cargadas desde BD (filtradas por 1 apuesta/partido)`);
            return filtered;
          } else {
            console.log(`⚠️ No hay opciones en BD, generando nuevas...`);
          }
        } catch (error) {
          console.error('❌ Error consultando BD, generando opciones localmente:', error);
        }
      }
      
      // Si no hay ligaId o no hay opciones en BD, generar y guardar
      const storeKey = ligaId ? `apuestas_jornada_${nextJ}_liga_${ligaId}_v4` : `apuestas_jornada_${nextJ}_v4`;
      
      // Para ligas sin DB, revisar caché local
      if (!ligaId) {
        try {
          const stored = await EncryptedStorage.getItem(storeKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const golesCount = parsed.filter(b => b.type === 'Goles totales').length;
              const cornersCount = parsed.filter(b => b.type === 'Córners').length;
              const tarjetasCount = parsed.filter(b => b.type === 'Tarjetas').length;
              
              if (golesCount >= 2 && cornersCount >= 2 && tarjetasCount >= 2) {
                console.log(`✅ Caché local válido: ${golesCount} goles, ${cornersCount} córners, ${tarjetasCount} tarjetas`);
                return parsed;
              }
            }
          }
        } catch {}
      }

    const bets: Array<{
      matchId: number;
      jornada: number;
      local: string;
      visitante: string;
      localCrest?: string;
      visitanteCrest?: string;
      fecha?: string;
      hora?: string;
      type: string;
      label: string;
      odd: number;
    }> = [];      // Conjuntos para variedad
      const usedLabels = new Set<string>();
      const typeCount = new Map<string, number>();
      const incType = (t: string) => typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
      const shuffle = <T,>(arr: T[]): T[] => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };
      
      // Helper para construir etiquetas de manera genérica (fallback)
      const buildGenericLabel = (
        betName: string,
        value: string,
        homeName: string,
        awayName: string,
      ): { type: string; label: string } => {
        const nameL = (betName || '').toLowerCase();
        const valL = (value || '').toLowerCase();
        const extractNumber = (str: string) => str.match(/[-+]?[0-9]*\.?[0-9]+/)?.[0];
        const isOver = valL.includes('over');
        const isUnder = valL.includes('under');

        // Mapas rápidos
        if (nameL.includes('winner') || nameL === 'match winner') {
          if (valL.includes('home')) return { type: 'Resultado', label: `Ganará ${homeName}` };
          if (valL.includes('away')) return { type: 'Resultado', label: `Ganará ${awayName}` };
          if (valL.includes('draw')) return { type: 'Resultado', label: 'Empate' };
        }

        if (nameL.includes('double chance')) {
          if (valL.includes('home') && valL.includes('draw')) return { type: 'Doble oportunidad', label: `Victoria de ${homeName} o empate` };
          if (valL.includes('home') && valL.includes('away')) return { type: 'Doble oportunidad', label: `Victoria de ${homeName} o de ${awayName}` };
          if (valL.includes('draw') && valL.includes('away')) return { type: 'Doble oportunidad', label: `Empate o victoria de ${awayName}` };
        }

        if (nameL.includes('both teams score')) {
          if (valL.includes('yes')) return { type: 'Ambos marcan', label: 'Ambos equipos marcarán' };
          if (valL.includes('no')) return { type: 'Ambos marcan', label: 'Al menos un equipo no marcará' };
        }

        if (nameL.includes('goals') || nameL.includes('total goals')) {
          const n = extractNumber(value);
          if (isOver) return { type: 'Goles totales', label: `Se marcarán más de ${n} goles` };
          if (isUnder) return { type: 'Goles totales', label: `Se marcarán menos de ${n} goles` };
          if (n && /^\d+$/.test(n)) return { type: 'Goles exactos', label: `Se marcarán exactamente ${n} goles` };
        }

        if (nameL.includes('corners')) {
          const n = extractNumber(value);
          if (isOver) return { type: 'Córners', label: `Habrá más de ${n} córners` };
          if (isUnder) return { type: 'Córners', label: `Habrá menos de ${n} córners` };
          if (valL.includes('odd')) return { type: 'Córners par/impar', label: 'Habrá un número impar de córners' };
          if (valL.includes('even')) return { type: 'Córners par/impar', label: 'Habrá un número par de córners' };
          if (n && /^\d+$/.test(n)) return { type: 'Córners exactos', label: `Habrá exactamente ${n} córners` };
        }

        if (nameL.includes('cards')) {
          const n = extractNumber(value);
          if (isOver) return { type: 'Tarjetas', label: `Se mostrarán más de ${n} tarjetas` };
          if (isUnder) return { type: 'Tarjetas', label: `Se mostrarán menos de ${n} tarjetas` };
          if (valL.includes('odd')) return { type: 'Tarjetas par/impar', label: 'Se mostrarán un número impar de tarjetas' };
          if (valL.includes('even')) return { type: 'Tarjetas par/impar', label: 'Se mostrarán un número par de tarjetas' };
          if (n && /^\d+$/.test(n)) return { type: 'Tarjetas exactas', label: `Se mostrarán exactamente ${n} tarjetas` };
        }

        if (nameL.includes('offsides') || nameL.includes('offside')) {
          const n = extractNumber(value);
          if (isOver) return { type: 'Fueras de juego', label: `Habrá más de ${n} fueras de juego` };
          if (isUnder) return { type: 'Fueras de juego', label: `Habrá menos de ${n} fueras de juego` };
        }

        if (nameL.includes('shots on target') || nameL.includes('shots')) {
          const n = extractNumber(value);
          if (isOver) return { type: 'Tiros a puerta', label: `Habrá más de ${n} tiros a puerta` };
          if (isUnder) return { type: 'Tiros a puerta', label: `Habrá menos de ${n} tiros a puerta` };
        }

        if (nameL.includes('odd/even') || nameL.includes('odd - even') || nameL === 'odd/even') {
          if (valL.includes('odd')) return { type: 'Par/Impar', label: 'Resultado con número impar (goles totales)' };
          if (valL.includes('even')) return { type: 'Par/Impar', label: 'Resultado con número par (goles totales)' };
        }

        if (nameL.includes('clean sheet')) {
          if (nameL.includes('home')) {
            return valL.includes('yes')
              ? { type: 'Portería a cero', label: `${homeName} no recibirá goles` }
              : { type: 'Portería a cero', label: `${homeName} recibirá al menos un gol` };
          }
          if (nameL.includes('away')) {
            return valL.includes('yes')
              ? { type: 'Portería a cero', label: `${awayName} no recibirá goles` }
              : { type: 'Portería a cero', label: `${awayName} recibirá al menos un gol` };
          }
        }

        // Faltas (si existiesen)
        if (nameL.includes('fouls')) {
          const n = extractNumber(value);
          if (isOver) return { type: 'Faltas', label: `Se cometerán más de ${n} faltas` };
          if (isUnder) return { type: 'Faltas', label: `Se cometerán menos de ${n} faltas` };
          if (n && /^\d+$/.test(n)) return { type: 'Faltas exactas', label: `Se cometerán exactamente ${n} faltas` };
        }

        // Genérico por defecto
        return { type: betName || 'Mercado', label: value };
      };

      for (const match of jornadaMatches) {
        try {
          // Obtener todos los odds del partido desde la API (sin especificar bet)
          const { data } = await axios.get(`${API_BASE}/odds`, {
            headers: HEADERS,
            timeout: 10000,
            params: {
              fixture: match.id,
              bookmaker: 8, // Bet365 (ID 8 es el más común)
            },
          });
          
          const bookmaker = data?.response?.[0]?.bookmakers?.[0];
          const allBets = bookmaker?.bets ?? [];
          
          let candidateOdds: Array<{ type: string; label: string; odd: number }> = [];
          
          // Procesar TODOS los tipos de apuestas disponibles
          for (const bet of allBets) {
            const betId = bet.id;
            const betName = bet.name;
            const values = bet.values ?? [];
            
            // Función helper para parsear números
            const extractNumber = (str: string) => str.match(/[\d.]+/)?.[0];
            const isOver = (str: string) => str.toLowerCase().includes('over');
            
            for (const v of values) {
              const odd = parseFloat(v.odd);
              if (isNaN(odd)) continue;
              if (odd < 1.5 || odd > 2.5) continue; // Enforce odds range

              // Primero intentamos mapear por IDs conocidos (para textos más naturales)
              let mapped: { type: string; label: string } | null = null;
              if (betId === 5) { // Goals O/U
                const number = extractNumber(v.value);
                mapped = isOver(v.value)
                  ? { type: 'Goles totales', label: `Se marcarán más de ${number} goles` }
                  : { type: 'Goles totales', label: `Se marcarán menos de ${number} goles` };
              } else if (betId === 8) {
                mapped = v.value === 'Yes'
                  ? { type: 'Ambos marcan', label: 'Ambos equipos marcarán' }
                  : { type: 'Ambos marcan', label: 'Al menos un equipo no marcará' };
              } else if (betId === 52) {
                const number = extractNumber(v.value);
                mapped = isOver(v.value)
                  ? { type: 'Tarjetas', label: `Se mostrarán más de ${number} tarjetas` }
                  : { type: 'Tarjetas', label: `Se mostrarán menos de ${number} tarjetas` };
              } else if (betId === 61) {
                const number = extractNumber(v.value);
                mapped = isOver(v.value)
                  ? { type: 'Córners', label: `Habrá más de ${number} córners` }
                  : { type: 'Córners', label: `Habrá menos de ${number} córners` };
              } else if (betId === 29) {
                mapped = { type: 'Goles exactos', label: `Se marcarán exactamente ${v.value} goles` };
              } else if (betId === 12) {
                if (v.value.includes('Home') && v.value.includes('Draw')) mapped = { type: 'Doble oportunidad', label: `Victoria de ${match.local} o empate` };
                else if (v.value.includes('Home') && v.value.includes('Away')) mapped = { type: 'Doble oportunidad', label: `Victoria de ${match.local} o de ${match.visitante}` };
                else if (v.value.includes('Draw') && v.value.includes('Away')) mapped = { type: 'Doble oportunidad', label: `Empate o victoria de ${match.visitante}` };
              } else if (betId === 37) {
                const number = extractNumber(v.value);
                mapped = isOver(v.value)
                  ? { type: 'Primera parte', label: `Habrá más de ${number} goles en la primera parte` }
                  : { type: 'Primera parte', label: `Habrá menos de ${number} goles en la primera parte` };
              } else if (betId === 38) {
                const number = extractNumber(v.value);
                mapped = isOver(v.value)
                  ? { type: 'Segunda parte', label: `Habrá más de ${number} goles en la segunda parte` }
                  : { type: 'Segunda parte', label: `Habrá menos de ${number} goles en la segunda parte` };
              } else if (betId === 126) {
                const number = extractNumber(v.value);
                mapped = isOver(v.value)
                  ? { type: 'Fueras de juego', label: `Habrá más de ${number} fueras de juego` }
                  : { type: 'Fueras de juego', label: `Habrá menos de ${number} fueras de juego` };
              } else if (betId === 207) {
                const number = extractNumber(v.value);
                mapped = isOver(v.value)
                  ? { type: 'Tiros a puerta', label: `Habrá más de ${number} tiros a puerta` }
                  : { type: 'Tiros a puerta', label: `Habrá menos de ${number} tiros a puerta` };
              } else if (betId === 1) {
                if (v.value === 'Home') mapped = { type: 'Resultado', label: `Ganará ${match.local}` };
                else if (v.value === 'Draw') mapped = { type: 'Resultado', label: 'Empate' };
                else if (v.value === 'Away') mapped = { type: 'Resultado', label: `Ganará ${match.visitante}` };
              } else if (betId === 81) {
                mapped = { type: 'Tarjetas exactas', label: `Se mostrarán exactamente ${v.value} tarjetas` };
              } else if (betId === 65) {
                mapped = { type: 'Córners exactos', label: `Habrá exactamente ${v.value} córners` };
              } else if (betId === 10) {
                mapped = v.value === 'Odd'
                  ? { type: 'Par/Impar', label: 'Se marcarán un número impar de goles' }
                  : { type: 'Par/Impar', label: 'Se marcarán un número par de goles' };
              } else if (betId === 26) {
                mapped = v.value === 'Yes'
                  ? { type: 'Portería a cero', label: `${match.local} no recibirá goles` }
                  : { type: 'Portería a cero', label: `${match.local} recibirá al menos un gol` };
              } else if (betId === 27) {
                mapped = v.value === 'Yes'
                  ? { type: 'Portería a cero', label: `${match.visitante} no recibirá goles` }
                  : { type: 'Portería a cero', label: `${match.visitante} recibirá al menos un gol` };
              } else if (betId === 106) {
                mapped = v.value === 'Odd'
                  ? { type: 'Tarjetas par/impar', label: 'Se mostrarán un número impar de tarjetas' }
                  : { type: 'Tarjetas par/impar', label: 'Se mostrarán un número par de tarjetas' };
              } else if (betId === 107) {
                mapped = v.value === 'Odd'
                  ? { type: 'Córners par/impar', label: 'Habrá un número impar de córners' }
                  : { type: 'Córners par/impar', label: 'Habrá un número par de córners' };
              }

              // Si no hay mapeo específico, utilizar mapeo genérico por nombre del mercado
              if (!mapped) mapped = buildGenericLabel(betName, v.value, match.local, match.visitante);

              if (mapped?.label && mapped?.type) {
                candidateOdds.push({ type: mapped.type, label: mapped.label, odd });
              }
            }
          }
          
          // Si hay apuestas candidatas, generar AMBAS opciones complementarias
          if (candidateOdds.length > 0) {
            // Agrupar por tipo para encontrar pares complementarios
            const byType = new Map<string, Array<{ type: string; label: string; odd: number }>>();
            for (const c of candidateOdds) {
              if (!byType.has(c.type)) byType.set(c.type, []);
              byType.get(c.type)!.push(c);
            }

            // Priorizar tipos menos usados
            const typesSorted = Array.from(byType.keys()).sort((a, b) => (typeCount.get(a) ?? 0) - (typeCount.get(b) ?? 0));
            
            let selectedType = typesSorted[0];
            const optionsForType = byType.get(selectedType)!;
            
            // Para cada opción del tipo seleccionado, agregar TODAS las opciones (ambas Sí/No, todas Home/Draw/Away, etc.)
            for (const option of optionsForType) {
              bets.push({
                matchId: match.id,
                jornada: match.jornada,
                local: match.local,
                visitante: match.visitante,
                localCrest: match.localCrest,
                visitanteCrest: match.visitanteCrest,
                fecha: match.fecha,
                hora: match.hora,
                type: option.type,
                label: option.label,
                odd: option.odd,
              });
              usedLabels.add(option.label.toLowerCase());
            }
            incType(selectedType);
          } else {
            // Si no hay odds elegibles en rango, generar fallback sintético con TODAS las opciones complementarias
            const fallbackTypes = [
              'Resultado', 'Goles totales', 'Córners', 'Tarjetas', 'Ambos marcan', 'Par/Impar'
            ];
            const t = fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)];
            const baseOdd = 1.5 + Math.random() * 0.5; // Base entre 1.5-2.0
            
            if (t === 'Resultado') {
              // Generar las 3 opciones: Local, Empate, Visitante
              const options = [
                { label: `Ganará ${match.local}`, odd: parseFloat(baseOdd.toFixed(2)) },
                { label: 'Empate', odd: parseFloat((baseOdd + 0.3).toFixed(2)) },
                { label: `Ganará ${match.visitante}`, odd: parseFloat((baseOdd + 0.2).toFixed(2)) }
              ];
              for (const opt of options) {
                bets.push({
                  matchId: match.id,
                  jornada: match.jornada,
                  local: match.local,
                  visitante: match.visitante,
                  localCrest: match.localCrest,
                  visitanteCrest: match.visitanteCrest,
                  fecha: match.fecha,
                  hora: match.hora,
                  type: t,
                  label: opt.label,
                  odd: opt.odd,
                });
                usedLabels.add(opt.label.toLowerCase());
              }
            } else if (t === 'Goles totales' || t === 'Córners' || t === 'Tarjetas') {
              // Generar AMBAS opciones: Más de X y Menos de X
              let n: number;
              let labelPrefix: string;
              if (t === 'Goles totales') {
                n = [0.5, 1.5, 2.5, 3.5][Math.floor(Math.random() * 4)];
                labelPrefix = 'Se marcarán';
              } else if (t === 'Córners') {
                n = [6.5, 8.5, 9.5, 10.5][Math.floor(Math.random() * 4)];
                labelPrefix = 'Habrá';
              } else {
                n = [3.5, 4.5, 5.5, 6.5][Math.floor(Math.random() * 4)];
                labelPrefix = 'Se mostrarán';
              }
              const unit = t === 'Goles totales' ? 'goles' : t === 'Córners' ? 'córners' : 'tarjetas';
              const options = [
                { label: `${labelPrefix} más de ${n} ${unit}`, odd: parseFloat(baseOdd.toFixed(2)) },
                { label: `${labelPrefix} menos de ${n} ${unit}`, odd: parseFloat((baseOdd + 0.3).toFixed(2)) }
              ];
              for (const opt of options) {
                bets.push({
                  matchId: match.id,
                  jornada: match.jornada,
                  local: match.local,
                  visitante: match.visitante,
                  localCrest: match.localCrest,
                  visitanteCrest: match.visitanteCrest,
                  fecha: match.fecha,
                  hora: match.hora,
                  type: t,
                  label: opt.label,
                  odd: opt.odd,
                });
                usedLabels.add(opt.label.toLowerCase());
              }
            } else if (t === 'Ambos marcan') {
              // Generar AMBAS opciones: Sí marcan ambos, y No marcan ambos
              const options = [
                { label: `Marcan ${match.local} y ${match.visitante}`, odd: parseFloat(baseOdd.toFixed(2)) },
                { label: 'Al menos un equipo no marcará', odd: parseFloat((baseOdd + 0.3).toFixed(2)) }
              ];
              for (const opt of options) {
                bets.push({
                  matchId: match.id,
                  jornada: match.jornada,
                  local: match.local,
                  visitante: match.visitante,
                  localCrest: match.localCrest,
                  visitanteCrest: match.visitanteCrest,
                  fecha: match.fecha,
                  hora: match.hora,
                  type: t,
                  label: opt.label,
                  odd: opt.odd,
                });
                usedLabels.add(opt.label.toLowerCase());
              }
            } else if (t === 'Par/Impar') {
              // Generar AMBAS opciones: Par e Impar
              const options = [
                { label: 'Se marcarán un número impar de goles', odd: parseFloat(baseOdd.toFixed(2)) },
                { label: 'Se marcarán un número par de goles', odd: parseFloat((baseOdd + 0.2).toFixed(2)) }
              ];
              for (const opt of options) {
                bets.push({
                  matchId: match.id,
                  jornada: match.jornada,
                  local: match.local,
                  visitante: match.visitante,
                  localCrest: match.localCrest,
                  visitanteCrest: match.visitanteCrest,
                  fecha: match.fecha,
                  hora: match.hora,
                  type: t,
                  label: opt.label,
                  odd: opt.odd,
                });
                usedLabels.add(opt.label.toLowerCase());
              }
            }
            incType(t);
          }
          
          // Pequeña pausa para rate limit
          await new Promise(r => setTimeout(r, 150));
        } catch (err: any) {
          console.warn(`Error fetching odds for match ${match.id}:`, err?.message);
          // Fallback: generar apuestas sintéticas con TODAS las opciones complementarias
          const fallbackTypes = [
            'Resultado', 'Goles totales', 'Córners', 'Tarjetas', 'Ambos marcan', 'Par/Impar'
          ];
          const t = fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)];
          const baseOdd = 1.5 + Math.random() * 0.5; // Base entre 1.5-2.0
          
          if (t === 'Resultado') {
            // Generar las 3 opciones: Local, Empate, Visitante
            const options = [
              { label: `Ganará ${match.local}`, odd: parseFloat(baseOdd.toFixed(2)) },
              { label: 'Empate', odd: parseFloat((baseOdd + 0.3).toFixed(2)) },
              { label: `Ganará ${match.visitante}`, odd: parseFloat((baseOdd + 0.2).toFixed(2)) }
            ];
            for (const opt of options) {
              bets.push({
                matchId: match.id,
                jornada: match.jornada,
                local: match.local,
                visitante: match.visitante,
                localCrest: match.localCrest,
                visitanteCrest: match.visitanteCrest,
                fecha: match.fecha,
                hora: match.hora,
                type: t,
                label: opt.label,
                odd: opt.odd,
              });
              usedLabels.add(opt.label.toLowerCase());
            }
          } else if (t === 'Goles totales' || t === 'Córners' || t === 'Tarjetas') {
            // Generar AMBAS opciones: Más de X y Menos de X
            let n: number;
            let labelPrefix: string;
            if (t === 'Goles totales') {
              n = [0.5, 1.5, 2.5, 3.5][Math.floor(Math.random() * 4)];
              labelPrefix = 'Se marcarán';
            } else if (t === 'Córners') {
              n = [6.5, 8.5, 9.5, 10.5][Math.floor(Math.random() * 4)];
              labelPrefix = 'Habrá';
            } else {
              n = [3.5, 4.5, 5.5, 6.5][Math.floor(Math.random() * 4)];
              labelPrefix = 'Se mostrarán';
            }
            const unit = t === 'Goles totales' ? 'goles' : t === 'Córners' ? 'córners' : 'tarjetas';
            const options = [
              { label: `${labelPrefix} más de ${n} ${unit}`, odd: parseFloat(baseOdd.toFixed(2)) },
              { label: `${labelPrefix} menos de ${n} ${unit}`, odd: parseFloat((baseOdd + 0.3).toFixed(2)) }
            ];
            for (const opt of options) {
              bets.push({
                matchId: match.id,
                jornada: match.jornada,
                local: match.local,
                visitante: match.visitante,
                localCrest: match.localCrest,
                visitanteCrest: match.visitanteCrest,
                fecha: match.fecha,
                hora: match.hora,
                type: t,
                label: opt.label,
                odd: opt.odd,
              });
              usedLabels.add(opt.label.toLowerCase());
            }
          } else if (t === 'Ambos marcan') {
            // Generar AMBAS opciones: Sí marcan ambos, y No marcan ambos
            const options = [
              { label: `Marcan ${match.local} y ${match.visitante}`, odd: parseFloat(baseOdd.toFixed(2)) },
              { label: 'Al menos un equipo no marcará', odd: parseFloat((baseOdd + 0.3).toFixed(2)) }
            ];
            for (const opt of options) {
              bets.push({
                matchId: match.id,
                jornada: match.jornada,
                local: match.local,
                visitante: match.visitante,
                localCrest: match.localCrest,
                visitanteCrest: match.visitanteCrest,
                fecha: match.fecha,
                hora: match.hora,
                type: t,
                label: opt.label,
                odd: opt.odd,
              });
              usedLabels.add(opt.label.toLowerCase());
            }
          } else if (t === 'Par/Impar') {
            // Generar AMBAS opciones: Par e Impar
            const options = [
              { label: 'Se marcarán un número impar de goles', odd: parseFloat(baseOdd.toFixed(2)) },
              { label: 'Se marcarán un número par de goles', odd: parseFloat((baseOdd + 0.2).toFixed(2)) }
            ];
            for (const opt of options) {
              bets.push({
                matchId: match.id,
                jornada: match.jornada,
                local: match.local,
                visitante: match.visitante,
                localCrest: match.localCrest,
                visitanteCrest: match.visitanteCrest,
                fecha: match.fecha,
                hora: match.hora,
                type: t,
                label: opt.label,
                odd: opt.odd,
              });
              usedLabels.add(opt.label.toLowerCase());
            }
          }
          incType(t);
        }
      }

      // GARANTIZAR MÍNIMOS: 2 Goles totales, 2 Córners, 2 Tarjetas
      const requiredTypes = ['Goles totales', 'Córners', 'Tarjetas'];
      const minPerType = 2;
      
      console.log('📊 Conteo de apuestas generadas:');
      console.log(`   - Goles totales: ${bets.filter(b => b.type === 'Goles totales').length}`);
      console.log(`   - Córners: ${bets.filter(b => b.type === 'Córners').length}`);
      console.log(`   - Tarjetas: ${bets.filter(b => b.type === 'Tarjetas').length}`);
      console.log(`   - Total: ${bets.length} apuestas`);
      
      for (const requiredType of requiredTypes) {
        const currentCount = bets.filter(b => b.type === requiredType).length;
        
        if (currentCount < minPerType) {
          const needed = minPerType - currentCount;
          console.log(`⚠️ Faltan ${needed} apuestas de tipo "${requiredType}". Generando sintéticas...`);
          
          // Generar apuestas sintéticas para completar el mínimo
          for (let i = 0; i < needed; i++) {
            // Seleccionar un partido aleatorio que aún no tenga este tipo de apuesta
            const availableMatches = jornadaMatches.filter(match => 
              !bets.some(b => b.matchId === match.id && b.type === requiredType)
            );
            
            if (availableMatches.length === 0) {
              // Si todos los partidos ya tienen este tipo, usar cualquier partido
              const match = jornadaMatches[Math.floor(Math.random() * jornadaMatches.length)];
              const syntheticBet = this.generateSyntheticBet(match, requiredType);
              bets.push(...syntheticBet);
              console.log(`   ✅ Generada apuesta sintética de ${requiredType} para ${match.local} vs ${match.visitante}`);
            } else {
              const match = availableMatches[Math.floor(Math.random() * availableMatches.length)];
              const syntheticBet = this.generateSyntheticBet(match, requiredType);
              bets.push(...syntheticBet);
              console.log(`   ✅ Generada apuesta sintética de ${requiredType} para ${match.local} vs ${match.visitante}`);
            }
          }
        }
      }
      
      console.log('📊 Conteo FINAL de apuestas:');
      console.log(`   - Goles totales: ${bets.filter(b => b.type === 'Goles totales').length}`);
      console.log(`   - Córners: ${bets.filter(b => b.type === 'Córners').length}`);
      console.log(`   - Tarjetas: ${bets.filter(b => b.type === 'Tarjetas').length}`);
      console.log(`   - Total: ${bets.length} apuestas`);

      // Enforce 1 bet per match (keep the first pair of options for each match)
      const byMatchCount = new Map<number, number>();
      const betsToPersist = bets.filter((b) => {
        const c = byMatchCount.get(b.matchId) ?? 0;
        if (c >= 2) return false;
        byMatchCount.set(b.matchId, c + 1);
        return true;
      });

      // Persistir apuestas
      if (ligaId) {
        // Si hay ligaId, guardar en base de datos para compartir entre jugadores
        try {
          console.log(`💾 Guardando ${betsToPersist.length} opciones en BD para liga ${ligaId}, jornada ${nextJ}`);
          
          // Transformar al formato que espera el backend
          const betOptionsToSave = betsToPersist.map(bet => ({
            matchId: bet.matchId,
            homeTeam: bet.local,
            awayTeam: bet.visitante,
            betType: bet.type,
            betLabel: bet.label,
            odd: bet.odd,
          }));
          
          await BetOptionService.saveBetOptions(ligaId, nextJ, betOptionsToSave);
          console.log(`✅ Opciones guardadas exitosamente en BD`);
        } catch (error) {
          console.error('❌ Error guardando en BD:', error);
          // Fallback a caché local si falla DB
          try {
            await EncryptedStorage.setItem(storeKey, JSON.stringify(betsToPersist));
          } catch {}
        }
      } else {
        // Sin ligaId, usar caché local
        try {
          await EncryptedStorage.setItem(storeKey, JSON.stringify(betsToPersist));
        } catch {}
      }

      return betsToPersist;
    } catch (error) {
      console.error('Error fetching apuestas:', error);
      return [];
    }
  }

  private static generateSyntheticBet(match: any, type: string): any[] {
    const baseOdd = 1.5 + Math.random() * 1.0; // Entre 1.5 y 2.5
    const bets: any[] = [];
    
    if (type === 'Goles totales') {
      const thresholds = [0.5, 1.5, 2.5, 3.5];
      const n = thresholds[Math.floor(Math.random() * thresholds.length)];
      const options = [
        { label: `Se marcarán más de ${n} goles`, odd: parseFloat(baseOdd.toFixed(2)) },
        { label: `Se marcarán menos de ${n} goles`, odd: parseFloat((2.5 - (baseOdd - 1.5)).toFixed(2)) }
      ];
      
      for (const opt of options) {
        bets.push({
          matchId: match.id,
          jornada: match.jornada,
          local: match.local,
          visitante: match.visitante,
          localCrest: match.localCrest,
          visitanteCrest: match.visitanteCrest,
          fecha: match.fecha,
          hora: match.hora,
          type: 'Goles totales',
          label: opt.label,
          odd: opt.odd,
        });
      }
    } else if (type === 'Córners') {
      const thresholds = [6.5, 8.5, 9.5, 10.5];
      const n = thresholds[Math.floor(Math.random() * thresholds.length)];
      const options = [
        { label: `Habrá más de ${n} córners`, odd: parseFloat(baseOdd.toFixed(2)) },
        { label: `Habrá menos de ${n} córners`, odd: parseFloat((2.5 - (baseOdd - 1.5)).toFixed(2)) }
      ];
      
      for (const opt of options) {
        bets.push({
          matchId: match.id,
          jornada: match.jornada,
          local: match.local,
          visitante: match.visitante,
          localCrest: match.localCrest,
          visitanteCrest: match.visitanteCrest,
          fecha: match.fecha,
          hora: match.hora,
          type: 'Córners',
          label: opt.label,
          odd: opt.odd,
        });
      }
    } else if (type === 'Tarjetas') {
      const thresholds = [3.5, 4.5, 5.5, 6.5];
      const n = thresholds[Math.floor(Math.random() * thresholds.length)];
      const options = [
        { label: `Se mostrarán más de ${n} tarjetas`, odd: parseFloat(baseOdd.toFixed(2)) },
        { label: `Se mostrarán menos de ${n} tarjetas`, odd: parseFloat((2.5 - (baseOdd - 1.5)).toFixed(2)) }
      ];
      
      for (const opt of options) {
        bets.push({
          matchId: match.id,
          jornada: match.jornada,
          local: match.local,
          visitante: match.visitante,
          localCrest: match.localCrest,
          visitanteCrest: match.visitanteCrest,
          fecha: match.fecha,
          hora: match.hora,
          type: 'Tarjetas',
          label: opt.label,
          odd: opt.odd,
        });
      }
    }
    
    return bets;
  }

  // Obtener estadísticas de un jugador específico
  // Si matchday es null o undefined, obtiene estadísticas globales de la temporada
  // Si matchday es un número, obtiene estadísticas solo de esa jornada específica
  static async getPlayerStatistics(playerId: number, matchday?: number | null): Promise<any | null> {
    const cacheKey = `${playerId}:${matchday ?? 'season'}`;
    const cached = this.getCachedValue(this.playerStatsCache, cacheKey, this.STATS_TTL_MS);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const inflight = this.playerStatsPromises.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const fetchPromise = (async () => {
      try {
        if (matchday != null && matchday > 0) {
        // Obtener estadísticas de una jornada específica
        // Primero obtenemos el partido de esa jornada donde jugó el jugador
        const fixtures = await this.fetchMatchdayFixtures(matchday);
        
        // Buscar en qué partido jugó el jugador (necesitamos obtener su equipo primero)
        const playerInfo = await this.fetchPlayerSeasonInfo(playerId);
        if (!playerInfo) return null;

        const leagueStats = (playerInfo.statistics || []).filter((stat: any) => stat?.league?.id === LA_LIGA_LEAGUE_ID);
        const relevantStats = leagueStats.length > 0 ? leagueStats : (playerInfo.statistics || []);

        const playerTeamIds = relevantStats
          .map((stat: any) => stat?.team?.id)
          .filter((id: any) => typeof id === 'number');

        if (!playerTeamIds.length) return null;

        // Encontrar el fixture donde jugó su equipo en esa jornada (considerando transferencias)
        let teamFixture: any = null;
        let activeTeamId: number | null = null;
        for (const teamId of playerTeamIds) {
          const foundFixture = fixtures.find((f: any) =>
            f.teams?.home?.id === teamId || f.teams?.away?.id === teamId
          );
          if (foundFixture) {
            teamFixture = foundFixture;
            activeTeamId = teamId;
            break;
          }
        }

        if (!teamFixture) {
          // No jugó en esa jornada
          return this.createEmptyStats();
        }

        // Obtener estadísticas del jugador en ese partido específico
        const fixturePlayers = await this.fetchFixturePlayers(teamFixture.fixture.id);
        let playerStats = null;

        // Buscar las estadísticas del jugador en los datos del partido
        for (const teamData of fixturePlayers) {
          const players = teamData.players || [];
          const found = players.find((p: any) => p.player?.id === playerId);
          if (found) {
            playerStats = found.statistics?.[0];
            break;
          }
        }

        if (!playerStats) {
          // Jugador no participó en el partido
          return this.createEmptyStats();
        }

        // Calcular goles encajados por el equipo del jugador
        const teamIdForFixture = activeTeamId ?? playerTeamIds[0];
        const isHomeTeam = teamFixture.teams?.home?.id === teamIdForFixture;
        let goalsAgainst = 0;
        const minutesPlayed = playerStats.games?.minutes || 0;
        const wasSubstitute = playerStats.games?.substitute === true;
        // Si el jugador fue suplente y no jugó, goles encajados = 0
        if (minutesPlayed === 0 || wasSubstitute) {
          goalsAgainst = 0;
        } else {
          // Si no hay eventos, no se puede saber los goles por minuto, así que se asignan todos los goles del rival
          goalsAgainst = isHomeTeam 
            ? teamFixture.goals?.away || 0 
            : teamFixture.goals?.home || 0;
        }

        // Retornar estadísticas del partido específico
          // Detect if player is a goalkeeper
          const position = (playerStats.games?.position || '').toLowerCase();
          const isGoalkeeper = position === 'goalkeeper' || position === 'gk' || position.includes('goal');

          // Always fill goalkeeper object for goalkeepers
          let goalkeeperStats = playerStats.goalkeeper || {};
          if (isGoalkeeper) {
            goalkeeperStats = {
              saves: goalkeeperStats.saves ?? playerStats.goalkeeper?.saves ?? 0,
              conceded: goalsAgainst,
              cleanSheets: (goalsAgainst === 0 && minutesPlayed > 0) ? 1 : 0,
              savedPenalties: playerStats.goalkeeper?.saved ?? playerStats.penalty?.saved ?? 0,
            };
          } else if (playerStats.goalkeeper) {
            // For non-goalkeepers, keep API stats if present
            goalkeeperStats = {
              saves: playerStats.goalkeeper?.saves ?? 0,
              conceded: playerStats.goalkeeper?.conceded ?? 0,
              cleanSheets: playerStats.goalkeeper?.cleanSheets ?? 0,
              savedPenalties: playerStats.goalkeeper?.saved ?? 0,
            };
          } else {
            goalkeeperStats = undefined;
          }

          return {
            games: {
              appearances: 1,
              lineups: playerStats.games?.substitute === false ? 1 : 0,
              minutes: minutesPlayed,
              position: playerStats.games?.position || ''
            },
            goals: {
              total: playerStats.goals?.total || 0,
              assists: playerStats.goals?.assists || 0,
              conceded: goalsAgainst
            },
            passes: {
              total: playerStats.passes?.total || 0,
              key: playerStats.passes?.key || 0,
              accuracy: playerStats.passes?.accuracy || '0%'
            },
            shots: {
              total: playerStats.shots?.total || 0,
              on: playerStats.shots?.on || 0
            },
            dribbles: {
              attempts: playerStats.dribbles?.attempts || 0,
              success: playerStats.dribbles?.success || 0
            },
            tackles: {
              total: playerStats.tackles?.total || 0,
              blocks: playerStats.tackles?.blocks || 0,
              interceptions: playerStats.tackles?.interceptions || 0
            },
            duels: {
              total: playerStats.duels?.total || 0,
              won: playerStats.duels?.won || 0
            },
            cards: {
              yellow: playerStats.cards?.yellow || 0,
              red: playerStats.cards?.red || 0
            },
            fouls: {
              drawn: playerStats.fouls?.drawn || 0,
              committed: playerStats.fouls?.committed || 0
            },
            penalty: {
              won: playerStats.penalty?.won || 0,
              committed: playerStats.penalty?.commited || 0,
              scored: playerStats.penalty?.scored || 0,
              missed: playerStats.penalty?.missed || 0,
              saved: playerStats.penalty?.saved || 0
            },
            rating: playerStats.games?.rating,
            goalkeeper: goalkeeperStats
          };
      } else {
        const playerInfo = await this.fetchPlayerSeasonInfo(playerId);
        if (!playerInfo) return null;

        const seasonalStats = (playerInfo.statistics || []).filter((stat: any) => stat?.league?.id === LA_LIGA_LEAGUE_ID);
        const stats = seasonalStats.length > 0 ? seasonalStats[0] : playerInfo.statistics?.[0];
        if (!stats) return null;

        return {
          games: {
            appearances: stats.games?.appearences || 0,
            lineups: stats.games?.lineups || 0,
            minutes: stats.games?.minutes || 0,
            position: stats.games?.position || ''
          },
          goals: {
            total: stats.goals?.total || 0,
            assists: stats.goals?.assists || 0,
            conceded: stats.goals?.conceded || 0
          },
          passes: {
            total: stats.passes?.total || 0,
            key: stats.passes?.key || 0,
            accuracy: stats.passes?.accuracy || '0%'
          },
          shots: {
            total: stats.shots?.total || 0,
            on: stats.shots?.on || 0
          },
          dribbles: {
            attempts: stats.dribbles?.attempts || 0,
            success: stats.dribbles?.success || 0
          },
          tackles: {
            total: stats.tackles?.total || 0,
            blocks: stats.tackles?.blocks || 0,
            interceptions: stats.tackles?.interceptions || 0
          },
          duels: {
            total: stats.duels?.total || 0,
            won: stats.duels?.won || 0
          },
          cards: {
            yellow: stats.cards?.yellow || 0,
            red: stats.cards?.red || 0
          },
          fouls: {
            drawn: stats.fouls?.drawn || 0,
            committed: stats.fouls?.committed || 0
          },
          penalty: {
            won: stats.penalty?.won || 0,
            committed: stats.penalty?.commited || 0,
            scored: stats.penalty?.scored || 0,
            missed: stats.penalty?.missed || 0,
            saved: stats.penalty?.saved || 0
          },
          rating: stats.games?.rating,
          goalkeeper: stats.goalkeeper
            ? {
                saves: stats.goalkeeper?.saves || 0,
                conceded: stats.goalkeeper?.conceded || 0,
                cleanSheets: stats.goalkeeper?.clean_sheets || 0,
                savedPenalties: stats.goalkeeper?.saved || 0,
              }
            : undefined
        };
      }
    } catch (error) {
      console.warn('FootballService.getPlayerStatistics error:', error);
      return null;
    }
    })().finally(() => this.playerStatsPromises.delete(cacheKey));

    this.playerStatsPromises.set(cacheKey, fetchPromise);
    const result = await fetchPromise;
    if (result !== null) {
      this.setCachedValue(this.playerStatsCache, cacheKey, result);
    }
    return result;
  }

  // Obtener lista de jornadas disponibles (jornadas que ya se han jugado o están en curso)
  static async getAvailableMatchdays(): Promise<number[]> {
    try {
      const allMatches = await this.getAllMatchesCached();
      const matchdays = new Set<number>();
      
      // Obtener jornadas que han empezado o terminado
      allMatches
        .filter(m => m.started || m.finished)
        .forEach(m => matchdays.add(m.jornada));
      
      return Array.from(matchdays).sort((a, b) => a - b);
    } catch (error) {
      console.error('Error fetching available matchdays:', error);
      return [];
    }
  }

  // Verificar si una jornada ha terminado completamente
  static async isJornadaCompleta(jornada: number): Promise<boolean> {
    try {
      const matches = await this.getAllMatchesCached();
      const jornadaMatches = matches.filter(m => m.jornada === jornada);
      
      if (jornadaMatches.length === 0) return false;
      
      // Verificar que todos los partidos hayan terminado
      return jornadaMatches.every(m => m.finished);
    } catch {
      return false;
    }
  }

  // Procesar fin de jornada: evaluar apuestas y generar nuevas
  static async procesarFinJornada(
    userId: string,
    jornada: number
  ): Promise<{
    success: boolean;
    resultados?: {
      totalGanado: number;
      totalPerdido: number;
      balance: number;
      nuevasApuestas: any[];
    };
    error?: string;
  }> {
    try {
      // 1. Verificar que la jornada esté completa
      const completa = await this.isJornadaCompleta(jornada);
      if (!completa) {
        return { success: false, error: 'La jornada aún no ha terminado' };
      }

      // 2. Obtener apuestas del usuario para esta jornada
      const apuestasUsuario = await PresupuestoService.getApuestasJornada(userId, jornada);
      
      if (apuestasUsuario.length === 0) {
        // No hay apuestas, solo generar nuevas
        const nuevasApuestas = await this.getApuestasProximaJornada();
        return {
          success: true,
          resultados: {
            totalGanado: 0,
            totalPerdido: 0,
            balance: 0,
            nuevasApuestas,
          },
        };
      }

      // 3. Evaluar apuestas
      const resultadosEvaluacion = await ApuestasEvaluator.evaluarApuestasJornada(
        apuestasUsuario.map(a => ({
          matchId: a.matchId,
          type: a.type,
          label: a.label,
        }))
      );

      // 4. Resolver apuestas y actualizar presupuesto
      const { totalGanado, totalPerdido } = await PresupuestoService.resolverApuestasJornada(
        userId,
        jornada,
        resultadosEvaluacion
      );

      // 5. Generar nuevas apuestas para la próxima jornada
      const nuevasApuestas = await this.getApuestasProximaJornada();

      // 6. Limpiar caché de apuestas anteriores
      try {
        await EncryptedStorage.removeItem(`apuestas_jornada_${jornada}_v4`);
      } catch {}

      return {
        success: true,
        resultados: {
          totalGanado,
          totalPerdido,
          balance: totalGanado - totalPerdido,
          nuevasApuestas,
        },
      };
    } catch (error) {
      console.error('Error procesando fin de jornada:', error);
      return { success: false, error: 'Error al procesar la jornada' };
    }
  }

  // Verificar automáticamente si hay jornadas pendientes de resolver
  static async verificarJornadasPendientes(userId: string): Promise<number[]> {
    try {
      const apuestas = await PresupuestoService.getApuestasUsuario(userId);
      const jornadasConApuestas = [...new Set(apuestas.map(a => a.jornada))];
      
      const jornadasPendientes: number[] = [];
      
      for (const jornada of jornadasConApuestas) {
        const completa = await this.isJornadaCompleta(jornada);
        if (completa) {
          jornadasPendientes.push(jornada);
        }
      }
      
      return jornadasPendientes.sort((a, b) => a - b);
    } catch {
      return [];
    }
  }
}
