// FootballService.ts
import axios from "axios";
import EncryptedStorage from 'react-native-encrypted-storage';

const API_BASE = "https://api.football-data.org/v4/competitions/PD/matches";
const HEADERS = {
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

  static async setMatchday(jornada: number, season = FootballService.season) {
    await saveState({ season, currentMatchday: jornada });
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
}
