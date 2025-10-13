// FootballService.ts
import axios from "axios";
import EncryptedStorage from 'react-native-encrypted-storage';
import { LigaService } from './LigaService';

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
      const storeKey = ligaId ? `apuestas_jornada_${nextJ}_liga_${ligaId}` : `apuestas_jornada_${nextJ}`;
      
      // Revisar si ya tenemos apuestas persistidas para esta jornada
      try {
        const stored = await EncryptedStorage.getItem(storeKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
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
      }> = [];

      // Conjuntos para variedad
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
          
          // Si hay apuestas candidatas, seleccionar UNA priorizando variedad
          if (candidateOdds.length > 0) {
            // Barajar y priorizar tipos menos usados; evitar etiquetas repetidas
            candidateOdds = shuffle(candidateOdds)
              .sort((a, b) => (typeCount.get(a.type) ?? 0) - (typeCount.get(b.type) ?? 0));

            let selectedBet = candidateOdds.find(c => !usedLabels.has(c.label.toLowerCase()));
            if (!selectedBet) selectedBet = candidateOdds[0];
            
            bets.push({
              matchId: match.id,
              jornada: match.jornada,
              local: match.local,
              visitante: match.visitante,
              localCrest: match.localCrest,
              visitanteCrest: match.visitanteCrest,
              fecha: match.fecha,
              hora: match.hora,
              type: selectedBet.type,
              label: selectedBet.label,
              odd: selectedBet.odd,
            });
            usedLabels.add(selectedBet.label.toLowerCase());
            incType(selectedBet.type);
          } else {
            // Si no hay odds elegibles en rango, generar fallback sintético en el rango 1.5-2.5
            const fallbackTypes = [
              'Resultado', 'Goles totales', 'Córners', 'Tarjetas', 'Ambos marcan', 'Par/Impar'
            ];
            const t = fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)];
            let label = '';
            const odd = 1.5 + Math.random() * 1.0; // 1.5 - 2.5
            if (t === 'Resultado') {
              const opts = [`Ganará ${match.local}`, 'Empate', `Ganará ${match.visitante}`];
              label = opts[Math.floor(Math.random() * opts.length)];
            } else if (t === 'Goles totales') {
              const n = [0.5, 1.5, 2.5, 3.5][Math.floor(Math.random() * 4)];
              label = Math.random() < 0.5 ? `Se marcarán más de ${n} goles` : `Se marcarán menos de ${n} goles`;
            } else if (t === 'Córners') {
              const n = [6.5, 8.5, 9.5, 10.5][Math.floor(Math.random() * 4)];
              label = Math.random() < 0.5 ? `Habrá más de ${n} córners` : `Habrá menos de ${n} córners`;
            } else if (t === 'Tarjetas') {
              const n = [3.5, 4.5, 5.5, 6.5][Math.floor(Math.random() * 4)];
              label = Math.random() < 0.5 ? `Se mostrarán más de ${n} tarjetas` : `Se mostrarán menos de ${n} tarjetas`;
            } else if (t === 'Ambos marcan') {
              label = Math.random() < 0.5 ? `Marcan ${match.local} y ${match.visitante}` : 'Al menos un equipo no marcará';
            } else if (t === 'Par/Impar') {
              label = Math.random() < 0.5 ? 'Se marcarán un número impar de goles' : 'Se marcarán un número par de goles';
            }
            // Evitar repetición de etiqueta
            let tries = 0;
            while (usedLabels.has(label.toLowerCase()) && tries < 3) {
              tries++;
              if (t === 'Resultado') {
                const opts = [`Ganará ${match.local}`, 'Empate', `Ganará ${match.visitante}`];
                label = opts[Math.floor(Math.random() * opts.length)];
              } else if (t === 'Goles totales') {
                const n2 = [0.5, 1.5, 2.5, 3.5][Math.floor(Math.random() * 4)];
                label = Math.random() < 0.5 ? `Se marcarán más de ${n2} goles` : `Se marcarán menos de ${n2} goles`;
              } else if (t === 'Córners') {
                const n2 = [6.5, 8.5, 9.5, 10.5][Math.floor(Math.random() * 4)];
                label = Math.random() < 0.5 ? `Habrá más de ${n2} córners` : `Habrá menos de ${n2} córners`;
              } else if (t === 'Tarjetas') {
                const n2 = [3.5, 4.5, 5.5, 6.5][Math.floor(Math.random() * 4)];
                label = Math.random() < 0.5 ? `Se mostrarán más de ${n2} tarjetas` : `Se mostrarán menos de ${n2} tarjetas`;
              } else if (t === 'Ambos marcan') {
                label = Math.random() < 0.5 ? `Marcan ${match.local} y ${match.visitante}` : 'Al menos un equipo no marcará';
              } else if (t === 'Par/Impar') {
                label = Math.random() < 0.5 ? 'Se marcarán un número impar de goles' : 'Se marcarán un número par de goles';
              }
            }
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
              label,
              odd: parseFloat(odd.toFixed(2)),
            });
            usedLabels.add(label.toLowerCase());
            incType(t);
          }
          
          // Pequeña pausa para rate limit
          await new Promise(r => setTimeout(r, 150));
        } catch (err: any) {
          console.warn(`Error fetching odds for match ${match.id}:`, err?.message);
          // Fallback: generar una apuesta sintética completamente aleatoria
          const fallbackTypes = [
            'Resultado', 'Goles totales', 'Córners', 'Tarjetas', 'Ambos marcan', 'Par/Impar'
          ];
          const t = fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)];
          let label = '';
          let odd = 1.5 + Math.random() * 1.0; // 1.5 - 2.5
          if (t === 'Resultado') {
            const opts = [`Ganará ${match.local}`, 'Empate', `Ganará ${match.visitante}`];
            label = opts[Math.floor(Math.random() * opts.length)];
          } else if (t === 'Goles totales') {
            const n = [0.5, 1.5, 2.5, 3.5][Math.floor(Math.random() * 4)];
            label = Math.random() < 0.5 ? `Se marcarán más de ${n} goles` : `Se marcarán menos de ${n} goles`;
          } else if (t === 'Córners') {
            const n = [6.5, 8.5, 9.5, 10.5][Math.floor(Math.random() * 4)];
            label = Math.random() < 0.5 ? `Habrá más de ${n} córners` : `Habrá menos de ${n} córners`;
          } else if (t === 'Tarjetas') {
            const n = [3.5, 4.5, 5.5, 6.5][Math.floor(Math.random() * 4)];
            label = Math.random() < 0.5 ? `Se mostrarán más de ${n} tarjetas` : `Se mostrarán menos de ${n} tarjetas`;
          } else if (t === 'Ambos marcan') {
            label = Math.random() < 0.5 ? `Marcan ${match.local} y ${match.visitante}` : 'Al menos un equipo no marcará';
          } else if (t === 'Par/Impar') {
            label = Math.random() < 0.5 ? 'Se marcarán un número impar de goles' : 'Se marcarán un número par de goles';
          }
          // Evitar repetición de etiqueta
          let tries = 0;
          while (usedLabels.has(label.toLowerCase()) && tries < 3) {
            tries++;
            if (t === 'Resultado') {
              const opts = [`Ganará ${match.local}`, 'Empate', `Ganará ${match.visitante}`];
              label = opts[Math.floor(Math.random() * opts.length)];
            } else if (t === 'Goles totales') {
              const n2 = [0.5, 1.5, 2.5, 3.5][Math.floor(Math.random() * 4)];
              label = Math.random() < 0.5 ? `Se marcarán más de ${n2} goles` : `Se marcarán menos de ${n2} goles`;
            } else if (t === 'Córners') {
              const n2 = [6.5, 8.5, 9.5, 10.5][Math.floor(Math.random() * 4)];
              label = Math.random() < 0.5 ? `Habrá más de ${n2} córners` : `Habrá menos de ${n2} córners`;
            } else if (t === 'Tarjetas') {
              const n2 = [3.5, 4.5, 5.5, 6.5][Math.floor(Math.random() * 4)];
              label = Math.random() < 0.5 ? `Se mostrarán más de ${n2} tarjetas` : `Se mostrarán menos de ${n2} tarjetas`;
            } else if (t === 'Ambos marcan') {
              label = Math.random() < 0.5 ? `Marcan ${match.local} y ${match.visitante}` : 'Al menos un equipo no marcará';
            } else if (t === 'Par/Impar') {
              label = Math.random() < 0.5 ? 'Se marcarán un número impar de goles' : 'Se marcarán un número par de goles';
            }
          }
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
            label,
            odd: parseFloat(odd.toFixed(2)),
          });
          usedLabels.add(label.toLowerCase());
          incType(t);
          continue;
        }
      }

      // Apuestas especiales de liga (2)
      if (ligaId) {
        try {
          const miembros = await LigaService.listarMiembros(ligaId);
          const nombres: string[] = Array.isArray(miembros)
            ? miembros.map((m: any) => m?.user?.name || m?.userName).filter(Boolean)
            : [];
          const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
          const randOdd = () => parseFloat((1.5 + Math.random() * 1.0).toFixed(2));

          if (nombres.length >= 1) {
            const miembro1 = pick(nombres);
            let label1 = `En esta jornada, ${miembro1} no hará más de ${25 + Math.floor(Math.random() * 36)} puntos`;
            let tries1 = 0;
            while (usedLabels.has(label1.toLowerCase()) && tries1 < 3) {
              tries1++;
              label1 = `En esta jornada, ${miembro1} no hará más de ${25 + Math.floor(Math.random() * 36)} puntos`;
            }
            bets.unshift({
              matchId: -1,
              jornada: nextJ,
              local: `Liga ${ligaName}`,
              visitante: miembro1,
              type: 'Especial liga',
              label: label1,
              odd: randOdd(),
            });
            usedLabels.add(label1.toLowerCase());
            incType('Especial liga');
          }

          if (nombres.length >= 1) {
            const miembro2 = pick(nombres);
            const y = [8, 10, 12, 15][Math.floor(Math.random() * 4)];
            let label2 = `Al menos un jugador de ${miembro2} hará más de ${y} puntos`;
            let tries2 = 0;
            while (usedLabels.has(label2.toLowerCase()) && tries2 < 3) {
              tries2++;
              const y2 = [8, 10, 12, 15, 18][Math.floor(Math.random() * 5)];
              label2 = `Al menos un jugador de ${miembro2} hará más de ${y2} puntos`;
            }
            bets.unshift({
              matchId: -2,
              jornada: nextJ,
              local: `Liga ${ligaName}`,
              visitante: miembro2,
              type: 'Especial liga',
              label: label2,
              odd: randOdd(),
            });
            usedLabels.add(label2.toLowerCase());
            incType('Especial liga');
          }
        } catch (e) {
          console.warn('No se pudieron generar apuestas especiales de liga:', (e as any)?.message ?? e);
        }
      }
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
}
