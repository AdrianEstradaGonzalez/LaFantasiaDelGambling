// FootballService.ts
import axios from "axios";
import EncryptedStorage from 'react-native-encrypted-storage';

const API_BASE = "https://api.football-data.org/v4/competitions/PD/matches";
const TEAMS_BASE = "https://api.football-data.org/v4/competitions/PD/teams";
const TEAM_BY_ID = (id: number | string) => `https://api.football-data.org/v4/teams/${id}`;
export const HEADERS = {
  "X-Auth-Token": "3b8fa9673ffc4a719690d2007f3e5723"
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
  teamId: number;
  teamName: string;
  teamCrest?: string;
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

function flags(status: string) {
  const notStarted = status === "SCHEDULED" || status === "TIMED";
  const started = status === "IN_PLAY" || status === "PAUSED";
  const finished = status === "FINISHED";
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
  private static season = 2025;
  private static startMatchday = 9;
  // Simple caches to avoid hitting API repeatedly
  private static teamsCache: TeamMinimal[] | null = null;
  private static playersCache: Player[] | null = null;
  private static teamsPromise: Promise<TeamMinimal[]> | null = null;
  private static playersPromise: Promise<Player[]> | null = null;
  private static prefetchInProgress: Promise<void> | null = null;
  private static readonly TEAMS_CACHE_KEY = 'laLiga_teams_v1';
  private static readonly PLAYERS_CACHE_KEY = 'laLiga_players_v1';
  private static matchesCache: Partido[] | null = null;
  private static matchesPromise: Promise<Partido[]> | null = null;
  private static readonly MATCHES_CACHE_KEY = 'laLiga_matches_v1';
  private static readonly TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

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
      
      const allPlayers: Player[] = [];
      for (let i = 0; i < freshTeams.length; i++) {
        const team = freshTeams[i];
        try {
          const squad = await this.getTeamSquad(team.id, team.name, team.crest);
          allPlayers.push(...squad);
          onTeamLoaded?.(allPlayers.slice(), team.name, { done: i + 1, total: freshTeams.length });
        } catch (e) {
          console.warn(`Error loading squad for ${team.name}:`, e);
        }
        // Small delay to respect rate limits
        await new Promise(r => setTimeout(r, 100));
      }
      return allPlayers;
    }

    const allPlayers: Player[] = [];
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      try {
        const squad = await this.getTeamSquad(team.id, team.name, team.crest);
        allPlayers.push(...squad);
        onTeamLoaded?.(allPlayers.slice(), team.name, { done: i + 1, total: teams.length });
      } catch (e) {
        console.warn(`Error loading squad for ${team.name}:`, e);
      }
      // Small delay to respect rate limits
      await new Promise(r => setTimeout(r, 100));
    }
    
    // Cache the result for future use
    if (allPlayers.length > 0) {
      this.playersCache = allPlayers;
      await this.saveToStorage(this.PLAYERS_CACHE_KEY, allPlayers);
    }
    
    return allPlayers;
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
      const url = matchdayNum != null
        ? `${API_BASE}?season=${FootballService.season}&matchday=${matchdayNum}`
        : `${API_BASE}?season=${FootballService.season}`;
      
      // Add timeout to prevent hanging
      const { data } = await axios.get(url, { 
        headers: HEADERS,
        timeout: 10000 // 10 seconds timeout
      });
      
      const matches = data?.matches ?? [];
      return matches.map((m: any) => {
        const { notStarted, started, finished } = flags(m.status);
        const { fecha, hora } = fmtFechaHoraES(m.utcDate);
        const h = m?.score?.fullTime?.home;
        const a = m?.score?.fullTime?.away;
        return {
          id: m.id,
          local: m.homeTeam.name,
          visitante: m.awayTeam.name,
          fecha,
          hora,
          notStarted,
          started,
          finished,
          resultado: finished && h != null && a != null ? `${h} - ${a}` : undefined,
          localCrest: m.homeTeam.crest ?? m.homeTeam.crestUrl ?? undefined,
          visitanteCrest: m.awayTeam.crest ?? m.awayTeam.crestUrl ?? undefined,
          jornada: m.matchday
        } as Partido;
      });
    } catch (error) {
      console.error('Error fetching matches:', error);
      return []; // Return empty array on error
    }
  }

  static async getMatchesForCurrentAndAdvance(): Promise<{ jornada: number; partidos: Partido[] }> {
    const state = await loadState();
    const url = `${API_BASE}?season=${state.season}&matchday=${state.currentMatchday}`;
    const { data } = await axios.get(url, { headers: HEADERS });
    const matches = data?.matches ?? [];
    const partidos = matches.map((m: any) => {
      const { notStarted, started, finished } = flags(m.status);
      const { fecha, hora } = fmtFechaHoraES(m.utcDate);
      const h = m?.score?.fullTime?.home;
      const a = m?.score?.fullTime?.away;
      return {
        id: m.id,
        local: m.homeTeam.name,
        visitante: m.awayTeam.name,
        fecha,
        hora,
        notStarted,
        started,
        finished,
        resultado: finished && h != null && a != null ? `${h} - ${a}` : undefined,
        jornada: m.matchday
      } as Partido;
    });

    if (partidos.length > 0) {
      await saveState({ season: state.season, currentMatchday: state.currentMatchday + 1 });
    }

    const jornadaDevuelta = matches?.[0]?.matchday ?? state.currentMatchday;
    return { jornada: jornadaDevuelta, partidos };
  }

  static async getFormattedAndAdvance(): Promise<{ jornada: number; items: string[] }> {
    const { jornada, partidos } = await FootballService.getMatchesForCurrentAndAdvance();
    const items = partidos.map(p => `${p.local} - ${p.visitante} - ${p.hora ?? "--:--"}`);
    return { jornada, items };
  }

  // Teams and Players helpers for La Liga (PD)
  static async getLaLigaTeams(): Promise<TeamMinimal[]> {
    try {
      const { data } = await axios.get(TEAMS_BASE, { headers: HEADERS, timeout: 10000 });
      const teams = (data?.teams ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        crest: t.crest ?? t.crestUrl
      }));
      return teams;
    } catch (err) {
      console.warn('Error fetching LaLiga teams:', err);
      return [];
    }
  }

  static async getTeamSquad(teamId: number, teamName?: string, teamCrest?: string): Promise<Player[]> {
    const attempt = async () => {
      const { data } = await axios.get(TEAM_BY_ID(teamId), { headers: HEADERS, timeout: 15000 });
      const squad = (data?.squad ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        nationality: p.nationality,
        shirtNumber: p.shirtNumber,
        dateOfBirth: p.dateOfBirth,
        teamId: data?.id ?? teamId,
        teamName: data?.name ?? teamName ?? '',
        teamCrest: data?.crest ?? teamCrest,
      })) as Player[];
      return squad;
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
}
