// FootballService.ts
import axios from "axios";
import { promises as fs } from "fs";
import path from "path";

const API_BASE = "https://api.football-data.org/v4/competitions/PD/matches";
const HEADERS = {
  "X-Auth-Token": "3b8fa9673ffc4a719690d2007f3e5723" // <- token incrustado
};
const STATE_FILE = path.join(process.cwd(), "matchday_state.json"); 

export type Partido = {
  id: number;
  local: string;
  visitante: string;
  fecha?: string;   // dd/mm/yyyy
  hora?: string;    // HH:mm (Europe/Madrid)
  notStarted: boolean;
  started: boolean;
  finished: boolean;
  resultado?: string; // "0 - 1" si finished
  jornada: number;
};

type State = { season: number; currentMatchday: number };

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

async function loadState(defaultState: State): Promise<State> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const s = JSON.parse(raw) as Partial<State>;
    return {
      season: typeof s.season === "number" ? s.season : defaultState.season,
      currentMatchday: typeof s.currentMatchday === "number" ? s.currentMatchday : defaultState.currentMatchday
    };
  } catch {
    await fs.writeFile(STATE_FILE, JSON.stringify(defaultState, null, 2), "utf8");
    return defaultState;
  }
}

async function saveState(state: State) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export default class FootballService {
  private static season = 2025;       // puedes cambiarlo si lo necesitas
  private static startMatchday = 9;   // jornada inicial

  /** Inicializa o resetea la jornada persistida. */
  static async setMatchday(jornada: number, season = FootballService.season) {
    await saveState({ season, currentMatchday: jornada });
  }

  /** Obtiene partidos de una jornada concreta (o todas si no pasas jornada). */
  static async getAllMatchesWithJornadas(matchdayNum?: number): Promise<Partido[]> {
    const url = matchdayNum != null
      ? `${API_BASE}?season=${FootballService.season}&matchday=${matchdayNum}`
      : `${API_BASE}?season=${FootballService.season}`;

    const { data } = await axios.get(url, { headers: HEADERS });
    const matches: any[] = Array.isArray(data?.matches) ? data.matches : [];

    return matches.map((m) => {
      const { notStarted, started, finished } = flags(m.status);
      const { fecha, hora } = fmtFechaHoraES(m.utcDate);
      const h = m?.score?.fullTime?.home ?? null;
      const a = m?.score?.fullTime?.away ?? null;
      return {
        id: m.id,
        local: m?.homeTeam?.name ?? "",
        visitante: m?.awayTeam?.name ?? "",
        fecha,
        hora,
        notStarted,
        started,
        finished,
        resultado: finished && h != null && a != null ? `${h} - ${a}` : undefined,
        jornada: m.matchday
      } as Partido;
    });
  }

  /**
   * Pide los partidos de la jornada guardada y luego incrementa (jornada+1).
   * Si la API devuelve 0 partidos, no incrementa.
   */
  static async getMatchesForCurrentAndAdvance(): Promise<{ jornada: number; partidos: Partido[] }> {
    const state = await loadState({ season: FootballService.season, currentMatchday: FootballService.startMatchday });
    const url = `${API_BASE}?season=${state.season}&matchday=${state.currentMatchday}`;

    const { data } = await axios.get(url, { headers: HEADERS });
    const matches: any[] = Array.isArray(data?.matches) ? data.matches : [];

    const partidos = matches.map((m) => {
      const { notStarted, started, finished } = flags(m.status);
      const { fecha, hora } = fmtFechaHoraES(m.utcDate);
      const h = m?.score?.fullTime?.home ?? null;
      const a = m?.score?.fullTime?.away ?? null;
      return {
        id: m.id,
        local: m?.homeTeam?.name ?? "",
        visitante: m?.awayTeam?.name ?? "",
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

  /** Devuelve strings "Local - Visitante - HH:mm" y avanza la jornada. */
  static async getFormattedAndAdvance(): Promise<{ jornada: number; items: string[] }> {
    const { jornada, partidos } = await FootballService.getMatchesForCurrentAndAdvance();
    const items = partidos.map(p => `${p.local} - ${p.visitante} - ${p.hora ?? "--:--"}`);
    return { jornada, items };
  }
}

/* === Ejemplo de uso ===
await FootballService.setMatchday(9); // opcional, para iniciar en J9
const r1 = await FootballService.getFormattedAndAdvance(); // -> J9 y persiste J10
console.log("Jornada", r1.jornada, r1.items);
const r2 = await FootballService.getFormattedAndAdvance(); // -> J10 y persiste J11
console.log("Jornada", r2.jornada, r2.items);
*/
