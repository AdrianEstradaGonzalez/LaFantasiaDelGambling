import axios from "axios";
import { HEADERS } from "./FutbolService";

const API_BASE = "https://v3.football.api-sports.io";

export type ApuestaResult = {
  apuestaId: string;
  cumplida: boolean;
  estadisticas?: any;
};

export class ApuestasEvaluator {
  // Evaluar una apuesta específica contra las estadísticas reales del partido
  static async evaluarApuesta(
    matchId: number,
    type: string,
    label: string
  ): Promise<boolean> {
    try {
      // Obtener estadísticas del partido
      const { data } = await axios.get(`${API_BASE}/fixtures`, {
        headers: HEADERS,
        timeout: 10000,
        params: { id: matchId },
      });

      const fixture = data?.response?.[0];
      if (!fixture) return false;

      // Verificar que el partido haya terminado
      const status = fixture.fixture?.status?.short;
      if (!["FT", "AET", "PEN"].includes(status)) return false;

      // Obtener estadísticas detalladas
      const statsResponse = await axios.get(`${API_BASE}/fixtures/statistics`, {
        headers: HEADERS,
        timeout: 10000,
        params: { fixture: matchId },
      });

      const stats = statsResponse.data?.response || [];
      const homeStats = stats[0]?.statistics || [];
      const awayStats = stats[1]?.statistics || [];

      // Parsear valores de estadísticas
      const getValue = (teamStats: any[], type: string): number => {
        const stat = teamStats.find((s: any) => s.type === type);
        return stat ? parseInt(stat.value) || 0 : 0;
      };

      const goalsHome = fixture.goals?.home || 0;
      const goalsAway = fixture.goals?.away || 0;
      const totalGoals = goalsHome + goalsAway;

      const cornersHome = getValue(homeStats, "Corner Kicks");
      const cornersAway = getValue(awayStats, "Corner Kicks");
      const totalCorners = cornersHome + cornersAway;

      const yellowHome = getValue(homeStats, "Yellow Cards");
      const yellowAway = getValue(awayStats, "Yellow Cards");
      const redHome = getValue(homeStats, "Red Cards");
      const redAway = getValue(awayStats, "Red Cards");
      const totalCards = yellowHome + yellowAway + redHome + redAway;

      // Evaluar según el tipo de apuesta
      const labelLower = label.toLowerCase();

      // Goles totales
      if (type === "Goles totales") {
        const match = label.match(/(\d+\.?\d*)/);
        if (match) {
          const threshold = parseFloat(match[1]);
          if (labelLower.includes("más de")) {
            return totalGoals > threshold;
          } else if (labelLower.includes("menos de")) {
            return totalGoals < threshold;
          }
        }
      }

      // Goles exactos
      if (type === "Goles exactos") {
        const match = label.match(/(\d+)/);
        if (match) {
          const exactGoals = parseInt(match[1]);
          return totalGoals === exactGoals;
        }
      }

      // Córners
      if (type === "Córners") {
        const match = label.match(/(\d+\.?\d*)/);
        if (match) {
          const threshold = parseFloat(match[1]);
          if (labelLower.includes("más de")) {
            return totalCorners > threshold;
          } else if (labelLower.includes("menos de")) {
            return totalCorners < threshold;
          }
        }
      }

      // Córners exactos
      if (type === "Córners exactos") {
        const match = label.match(/(\d+)/);
        if (match) {
          const exactCorners = parseInt(match[1]);
          return totalCorners === exactCorners;
        }
      }

      // Córners par/impar
      if (type === "Córners par/impar") {
        if (labelLower.includes("impar")) {
          return totalCorners % 2 === 1;
        } else if (labelLower.includes("par")) {
          return totalCorners % 2 === 0;
        }
      }

      // Tarjetas
      if (type === "Tarjetas") {
        const match = label.match(/(\d+\.?\d*)/);
        if (match) {
          const threshold = parseFloat(match[1]);
          if (labelLower.includes("más de")) {
            return totalCards > threshold;
          } else if (labelLower.includes("menos de")) {
            return totalCards < threshold;
          }
        }
      }

      // Tarjetas exactas
      if (type === "Tarjetas exactas") {
        const match = label.match(/(\d+)/);
        if (match) {
          const exactCards = parseInt(match[1]);
          return totalCards === exactCards;
        }
      }

      // Tarjetas par/impar
      if (type === "Tarjetas par/impar") {
        if (labelLower.includes("impar")) {
          return totalCards % 2 === 1;
        } else if (labelLower.includes("par")) {
          return totalCards % 2 === 0;
        }
      }

      // Resultado
      if (type === "Resultado") {
        if (labelLower.includes("ganará") && labelLower.includes(fixture.teams?.home?.name?.toLowerCase())) {
          return goalsHome > goalsAway;
        } else if (labelLower.includes("ganará") && labelLower.includes(fixture.teams?.away?.name?.toLowerCase())) {
          return goalsAway > goalsHome;
        } else if (labelLower.includes("empate")) {
          return goalsHome === goalsAway;
        }
      }

      // Ambos marcan
      if (type === "Ambos marcan") {
        if (labelLower.includes("marcan") || labelLower.includes("marcarán")) {
          return goalsHome > 0 && goalsAway > 0;
        } else if (labelLower.includes("no marcará") || labelLower.includes("al menos un equipo no")) {
          return goalsHome === 0 || goalsAway === 0;
        }
      }

      // Par/Impar (goles)
      if (type === "Par/Impar") {
        if (labelLower.includes("impar")) {
          return totalGoals % 2 === 1;
        } else if (labelLower.includes("par")) {
          return totalGoals % 2 === 0;
        }
      }

      // Doble oportunidad
      if (type === "Doble oportunidad") {
        const homeWin = goalsHome > goalsAway;
        const draw = goalsHome === goalsAway;
        const awayWin = goalsAway > goalsHome;

        if (labelLower.includes("empate") && labelLower.includes(fixture.teams?.home?.name?.toLowerCase())) {
          return homeWin || draw;
        } else if (labelLower.includes("empate") && labelLower.includes(fixture.teams?.away?.name?.toLowerCase())) {
          return awayWin || draw;
        } else if (labelLower.includes(fixture.teams?.home?.name?.toLowerCase()) && labelLower.includes(fixture.teams?.away?.name?.toLowerCase())) {
          return homeWin || awayWin;
        }
      }

      return false;
    } catch (error) {
      console.error(`Error evaluando apuesta para match ${matchId}:`, error);
      return false;
    }
  }

  // Evaluar múltiples apuestas de una jornada
  static async evaluarApuestasJornada(
    apuestas: Array<{
      matchId: number;
      type: string;
      label: string;
      [key: string]: any;
    }>
  ): Promise<Map<string, boolean>> {
    const resultados = new Map<string, boolean>();

    for (const apuesta of apuestas) {
      const key = `${apuesta.matchId}_${apuesta.type}_${apuesta.label}`;
      const cumplida = await this.evaluarApuesta(
        apuesta.matchId,
        apuesta.type,
        apuesta.label
      );
      resultados.set(key, cumplida);
      
      // Pequeña pausa para rate limit
      await new Promise(r => setTimeout(r, 100));
    }

    return resultados;
  }
}
