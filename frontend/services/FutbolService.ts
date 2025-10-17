// FootballService.ts
import axios from "axios";
import EncryptedStorage from 'react-native-encrypted-storage';
import { LigaService } from './LigaService';
import { ApuestasEvaluator } from './ApuestasEvaluator';
import { PresupuestoService } from './PresupuestoService';

// API-FOOTBALL (API-Sports v3)
const API_BASE = "https://v3.football.api-sports.io";
const LA_LIGA_LEAGUE_ID = 140; // La Liga ID en API-FOOTBALL
const SEASON_DEFAULT = 2025;

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
  private static mapRoleCode(role: 'POR'|'DEF'|'CEN'|'DEL'): 'GK'|'DEF'|'MID'|'ATT' {
    switch (role) {
      case 'POR': return 'GK';
      case 'DEF': return 'DEF';
      case 'CEN': return 'MID';
      case 'DEL': return 'ATT';
      default: return 'MID';
    }
  }

  private static calculatePlayerPoints(stats: any, roleCode: 'POR'|'DEF'|'CEN'|'DEL'): number {
    if (!stats || !stats.games) return 0;
    const role = this.mapRoleCode(roleCode);

    let points = 0;
    const minutes = stats.games?.minutes || 0;

    // Base general
    if (minutes > 0 && minutes < 45) points += 1;
    else if (minutes >= 45) points += 2;

    const goals = stats.goals || {};
    const cards = stats.cards || {};
    const penalty = stats.penalty || {};
    const passes = stats.passes || {};
    const shots = stats.shots || {};
    const dribbles = stats.dribbles || {};
    const tackles = stats.tackles || {};
    const duels = stats.duels || {};
    const fouls = stats.fouls || {};

    points += (goals.assists || 0) * 3;
    points -= (cards.yellow || 0) * 1;
    points -= (cards.red || 0) * 3;
    points += (penalty.won || 0) * 2;
    points -= (penalty.committed || 0) * 2;
    points += (penalty.scored || 0) * 3;
    points -= (penalty.missed || 0) * 2;

    // Específico por posición
    if (role === 'GK') {
      const conceded = stats.goals?.conceded || 0;
      if (minutes >= 60 && conceded === 0) points += 5;
      points -= conceded * 2;
      points += (stats.goals?.saves || 0) * 1;
      points += (penalty.saved || 0) * 5;
      points += (goals.total || 0) * 10;
      points += Math.floor((tackles.interceptions || 0) / 5);
    } else if (role === 'DEF') {
      const conceded = stats.goals?.conceded || 0;
      if (minutes >= 60 && conceded === 0) points += 4;
      points += (goals.total || 0) * 6;
      points += Math.floor((duels.won || 0) / 2);
      points += Math.floor((tackles.interceptions || 0) / 5);
      points -= conceded * 1;
      points += (shots.on || 0) * 1;
    } else if (role === 'MID') {
      const conceded = stats.goals?.conceded || 0;
      if (minutes >= 60 && conceded === 0) points += 1;
      points += (goals.total || 0) * 5;
      points -= Math.floor(conceded / 2);
      points += (passes.key || 0) * 1;
      points += Math.floor((dribbles.success || 0) / 2);
      points += Math.floor((fouls.drawn || 0) / 3);
      points += Math.floor((tackles.interceptions || 0) / 3);
      points += (shots.on || 0) * 1;
    } else if (role === 'ATT') {
      points += (goals.total || 0) * 4;
      points += (passes.key || 0) * 1;
      points += Math.floor((fouls.drawn || 0) / 3);
      points += Math.floor((dribbles.success || 0) / 2);
      points += (shots.on || 0) * 1;
    }

    return points;
  }

  /**
   * Obtener puntos por jugador para una jornada (usando API-FOOTBALL)
   * Hace 1 llamada para fixtures + ~10 llamadas (una por partido) para stats de jugadores.
   */
  static async getPlayersPointsForJornada(jornada: number, playerIds: number[], rolesById: Record<number, 'POR'|'DEF'|'CEN'|'DEL'>): Promise<Record<number, number>> {
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
      // Agregar v4 para nueva estructura con validación de mínimos
      const storeKey = ligaId ? `apuestas_jornada_${nextJ}_liga_${ligaId}_v4` : `apuestas_jornada_${nextJ}_v4`;
      
      // Revisar si ya tenemos apuestas persistidas para esta jornada
      try {
        const stored = await EncryptedStorage.getItem(storeKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Validar que el caché cumple con los mínimos requeridos
            const golesCount = parsed.filter(b => b.type === 'Goles totales').length;
            const cornersCount = parsed.filter(b => b.type === 'Córners').length;
            const tarjetasCount = parsed.filter(b => b.type === 'Tarjetas').length;
            
            if (golesCount >= 2 && cornersCount >= 2 && tarjetasCount >= 2) {
              console.log(`✅ Caché válido: ${golesCount} goles, ${cornersCount} córners, ${tarjetasCount} tarjetas`);
              return parsed;
            } else {
              console.log(`⚠️ Caché inválido: ${golesCount} goles, ${cornersCount} córners, ${tarjetasCount} tarjetas. Regenerando...`);
            }
          }
        }
      } catch {}

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

      // Persistir apuestas para esta jornada (sin TTL) para que no cambien con reload
      try {
        await EncryptedStorage.setItem(storeKey, JSON.stringify(bets));
      } catch {}

      return bets;
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
  static async getPlayerStatistics(playerId: number, matchday?: number | null): Promise<{
    games: { appearances: number; lineups: number; minutes: number; position: string };
    goals: { total: number; assists: number; conceded: number };
    passes: { total: number; key: number; accuracy: string };
    shots: { total: number; on: number };
    dribbles: { attempts: number; success: number };
    tackles: { total: number; blocks: number; interceptions: number };
    duels: { total: number; won: number };
    cards: { yellow: number; red: number };
    rating?: string;
    fouls: { drawn: number; committed: number };
    penalty: { won: number; committed: number; scored: number; missed: number; saved: number };
    // Estadísticas específicas de porteros
    goalkeeper?: {
      saves: number;
      conceded: number;
      cleanSheets: number;
      savedPenalties: number;
    };
  } | null> {
    try {
      if (matchday != null && matchday > 0) {
        // Obtener estadísticas de una jornada específica
        // Primero obtenemos el partido de esa jornada donde jugó el jugador
        const fixturesResponse = await axios.get(`${API_BASE}/fixtures`, {
          headers: HEADERS,
          timeout: 10000,
          params: {
            league: LA_LIGA_LEAGUE_ID,
            season: this.season,
            round: `Regular Season - ${matchday}`
          }
        });

        const fixtures = fixturesResponse.data?.response || [];
        
        // Buscar en qué partido jugó el jugador (necesitamos obtener su equipo primero)
        const playerInfoResponse = await axios.get(`${API_BASE}/players`, {
          headers: HEADERS,
          timeout: 10000,
          params: { 
            id: playerId, 
            season: this.season,
            league: LA_LIGA_LEAGUE_ID
          },
        });

        const playerInfo = playerInfoResponse.data?.response?.[0];
        if (!playerInfo) return null;

        const playerTeamId = playerInfo.statistics?.[0]?.team?.id;
        if (!playerTeamId) return null;

        // Encontrar el fixture donde jugó su equipo en esa jornada
        const teamFixture = fixtures.find((f: any) => 
          f.teams?.home?.id === playerTeamId || f.teams?.away?.id === playerTeamId
        );

        if (!teamFixture) {
          // No jugó en esa jornada
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
            rating: undefined
          };
        }

        // Obtener estadísticas del jugador en ese partido específico
        const statsResponse = await axios.get(`${API_BASE}/fixtures/players`, {
          headers: HEADERS,
          timeout: 10000,
          params: {
            fixture: teamFixture.fixture.id
          }
        });

        const teamsData = statsResponse.data?.response || [];
        let playerStats = null;

        // Buscar las estadísticas del jugador en los datos del partido
        for (const teamData of teamsData) {
          const players = teamData.players || [];
          const found = players.find((p: any) => p.player?.id === playerId);
          if (found) {
            playerStats = found.statistics?.[0];
            break;
          }
        }

        if (!playerStats) {
          // Jugador no participó en el partido
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
            rating: undefined
          };
        }

        // Calcular goles encajados por el equipo del jugador
        const isHomeTeam = teamFixture.teams?.home?.id === playerTeamId;
        const goalsAgainst = isHomeTeam 
          ? teamFixture.goals?.away || 0 
          : teamFixture.goals?.home || 0;

        // Retornar estadísticas del partido específico
        return {
          games: {
            appearances: 1,
            lineups: playerStats.games?.substitute === false ? 1 : 0,
            minutes: playerStats.games?.minutes || 0,
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
          // Estadísticas de portero (si aplica)
          goalkeeper: playerStats.goals?.saves != null ? {
            saves: playerStats.goals?.saves || 0,
            conceded: playerStats.goals?.conceded || 0,
            cleanSheets: (playerStats.goals?.conceded || 0) === 0 && (playerStats.games?.minutes || 0) > 0 ? 1 : 0,
            savedPenalties: playerStats.penalty?.saved || 0
          } : undefined
        };
      } else {
        // Obtener estadísticas globales de la temporada
        const { data } = await axios.get(`${API_BASE}/players`, {
          headers: HEADERS,
          timeout: 10000,
          params: { 
            id: playerId, 
            season: this.season,
            league: LA_LIGA_LEAGUE_ID
          },
        });

        const playerData = data?.response?.[0];
        if (!playerData) return null;

        const stats = playerData.statistics?.[0];
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
          // Estadísticas de portero (si aplica)
          goalkeeper: stats.goals?.saves != null ? {
            saves: stats.goals?.saves || 0,
            conceded: stats.goals?.conceded || 0,
            cleanSheets: (stats.goals?.conceded === 0 && stats.games?.appearences > 0) ? stats.games?.appearences : 0,
            savedPenalties: stats.penalty?.saved || 0
          } : undefined
        };
      }
    } catch (error) {
      console.error('Error fetching player statistics:', error);
      return null;
    }
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
