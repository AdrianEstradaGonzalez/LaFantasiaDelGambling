import axios from 'axios';

const BASE_URL = 'https://free-api-live-football-data.p.rapidapi.com';
const HEADERS = {
  'x-rapidapi-key': '99d6c0158cmsh1f69918d8956fdcp1d1ea1jsn1951891f6d6e',
  'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com',
};

export type Partido = {
  id: string;
  local: string;
  visitante: string;
  fecha?: string; // dd/mm/yyyy
  hora?: string; // HH:mm
  notStarted: boolean;
  started: boolean;
  finished: boolean;
  resultado?: string; // "0 - 1" si finished
  jornada: number;
};

export const FootballService = {
  getAllMatchesWithJornadas: async (leagueId = '87'): Promise<Partido[]> => {
    try {
      const response = await axios.get(`${BASE_URL}/football-get-all-matches-by-league`, {
        headers: HEADERS,
        params: { leagueid: leagueId },
      });

      const matches = response.data.response.matches || [];

      const partidos: Partido[] = matches.map((m: any, idx: number) => {
        // Calcular jornada: cada 10 partidos = 1 jornada
        const jornada = Math.floor(idx / 10) + 1;

        const date = new Date(m.status.utcTime);

        let fecha: string | undefined = undefined;
        let hora: string | undefined = undefined;
        let resultado: string | undefined = undefined;

        if (m.status.finished) {
          resultado = m.status.scoreStr; // ej: "1 - 3"
        } else {
          // Formatear fecha y hora si no ha finalizado
          fecha = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          hora = date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        }

        return {
          id: m.id,
          local: m.home.name,
          visitante: m.away.name,
          fecha,
          hora,
          notStarted: m.notStarted,
          started: m.status.started,
          finished: m.status.finished,
          resultado,
          jornada,
        };
      });

      return partidos;
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  },
};
