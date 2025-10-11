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
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Madrid"
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
  private static readonly TEAMS_CACHE_KEY = 'laLiga_teams_v1';
  private static readonly PLAYERS_CACHE_KEY = 'laLiga_players_v1';
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
    if (this.teamsPromise) return this.teamsPromise;
    // try storage first
    const fromStore = await this.loadFromStorage<TeamMinimal[]>(this.TEAMS_CACHE_KEY);
    if (fromStore && fromStore.length) {
      this.teamsCache = fromStore;
      return fromStore;
    }
    this.teamsPromise = (async () => {
      const teams = await this.getLaLigaTeams();
      this.teamsCache = teams;
      this.teamsPromise = null;
      if (teams.length) this.saveToStorage(this.TEAMS_CACHE_KEY, teams);
      return teams;
    })();
    return this.teamsPromise;
  }

  static async getAllPlayersCached(): Promise<Player[]> {
    if (this.playersCache) return this.playersCache;
    if (this.playersPromise) return this.playersPromise;
    // try storage first
    const fromStore = await this.loadFromStorage<Player[]>(this.PLAYERS_CACHE_KEY);
    if (fromStore && fromStore.length) {
      this.playersCache = fromStore;
      return fromStore;
    }
    // As a fallback, fetch fresh (may be heavy; prefer prefetchAllData on app start)
    this.playersPromise = (async () => {
      const players = await this.getAllLaLigaPlayers();
      this.playersCache = players;
      this.playersPromise = null;
      if (players.length) this.saveToStorage(this.PLAYERS_CACHE_KEY, players);
      return players;
    })();
    return this.playersPromise;
  }

  static async prefetchAllData(force = false) {
    try {
      // If already in memory and not forced, skip
      if (!force && this.teamsCache && this.playersCache) return;
      const teams = force ? await this.getLaLigaTeams() : await this.getLaLigaTeamsCached();
      this.teamsCache = teams;
      if (teams.length) await this.saveToStorage(this.TEAMS_CACHE_KEY, teams);
      // fetch all players sequentially
      const players = await (async () => {
        const all: Player[] = [];
        for (const t of teams) {
          const squad = await this.getTeamSquad(t.id, t.name, t.crest);
          all.push(...squad);
          await new Promise(r => setTimeout(r, 120));
        }
        return all;
      })();
      this.playersCache = players;
      if (players.length) await this.saveToStorage(this.PLAYERS_CACHE_KEY, players);
    } catch (e) {
      console.warn('prefetchAllData failed', e);
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
    try {
      const { data } = await axios.get(TEAM_BY_ID(teamId), { headers: HEADERS, timeout: 10000 });
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
    } catch (err) {
      console.warn(`Error fetching squad for team ${teamId}:`, err);
      return [];
    }
  }

  static async getAllLaLigaPlayers(progressCb?: (done: number, total: number) => void): Promise<Player[]> {
    const teams = await this.getLaLigaTeams();
    const total = teams.length;
    let done = 0;
    const all: Player[] = [];
    for (const t of teams) {
      const squad = await this.getTeamSquad(t.id, t.name, t.crest);
      all.push(...squad);
      done += 1;
      progressCb?.(done, total);
      // Small delay to be nice with the API
      await new Promise((r) => setTimeout(r, 150));
    }
    return all;
  }
}
