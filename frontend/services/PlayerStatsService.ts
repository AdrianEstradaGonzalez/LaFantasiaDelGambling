import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiConfig } from '../utils/apiConfig';

const API_URL = ApiConfig.BASE_URL;

/**
 * SERVICIO DE ESTADÍSTICAS DE JUGADORES (FRONTEND)
 * 
 * Este servicio SOLO consume datos del backend.
 * NO realiza cálculos de puntos - eso lo hace el backend.
 */

export interface PlayerStats {
  id: string;
  playerId: number;
  jornada: number;
  season: number;
  
  // Información del partido
  fixtureId: number;
  teamId: number;
  
  // Puntos calculados (por el backend)
  totalPoints: number;
  
  // Games
  minutes: number | null;
  position: string | null;
  rating: string | null;
  captain: boolean;
  substitute: boolean;
  
  // Goals
  goals: number | null;
  assists: number | null;
  conceded: number | null;
  saves: number | null;
  
  // Shots
  shotsTotal: number | null;
  shotsOn: number | null;
  
  // Passes
  passesTotal: number | null;
  passesKey: number | null;
  passesAccuracy: number | null;
  
  // Tackles
  tacklesTotal: number | null;
  tacklesBlocks: number | null;
  tacklesInterceptions: number | null;
  
  // Duels
  duelsTotal: number | null;
  duelsWon: number | null;
  
  // Dribbles
  dribblesAttempts: number | null;
  dribblesSuccess: number | null;
  dribblesPast: number | null;
  
  // Fouls
  foulsDrawn: number | null;
  foulsCommitted: number | null;
  
  // Cards
  yellowCards: number | null;
  redCards: number | null;
  
  // Penalty
  penaltyWon: number | null;
  penaltyCommitted: number | null;
  penaltyScored: number | null;
  penaltyMissed: number | null;
  penaltySaved: number | null;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

class PlayerStatsServiceClass {
  /**
   * Obtiene estadísticas de un jugador en una jornada específica
   */
  async getPlayerJornadaStats(
    playerId: number,
    jornada: number,
    options?: {
      season?: number;
      refresh?: boolean;
    }
  ): Promise<PlayerStats> {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No autenticado');

    const queryParams = new URLSearchParams();
    if (options?.season) queryParams.append('season', String(options.season));
    if (options?.refresh) queryParams.append('refresh', 'true');

    const url = `${API_URL}/player-stats/${playerId}/jornada/${jornada}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener estadísticas');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Obtiene estadísticas de un jugador para múltiples jornadas
   */
  async getPlayerMultipleJornadasStats(
    playerId: number,
    jornadas: number[],
    options?: {
      season?: number;
      refresh?: boolean;
    }
  ): Promise<(PlayerStats | null)[]> {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No autenticado');

    const response = await fetch(`${API_URL}/player-stats/${playerId}/multiple-jornadas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jornadas,
        season: options?.season,
        refresh: options?.refresh,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener estadísticas');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Formatea las estadísticas para mostrar en la UI
   * Retorna un array de { label, cantidad, puntos } listo para renderizar
   */
  formatStatsForDisplay(stats: PlayerStats, role: string): Array<{
    label: string;
    cantidad: number | string;
    puntos: number | string;
  }> {
    // Este método es solo para formateo visual
    // Los puntos YA vienen calculados del backend
    
    const display: Array<{
      label: string;
      cantidad: number | string;
      puntos: number | string;
    }> = [];

    // Minutos
    if (stats.minutes) {
      display.push({
        label: 'Minutos jugados',
        cantidad: stats.minutes,
        puntos: '-', // No mostramos puntos individuales, solo el total
      });
    }

    // Goles y asistencias
    if (stats.goals) {
      display.push({
        label: 'Goles',
        cantidad: stats.goals,
        puntos: '-',
      });
    }

    if (stats.assists) {
      display.push({
        label: 'Asistencias',
        cantidad: stats.assists,
        puntos: '-',
      });
    }

    // Portero específico
    if (role === 'Goalkeeper') {
      if (stats.saves) {
        display.push({
          label: 'Paradas',
          cantidad: stats.saves,
          puntos: '-',
        });
      }

      if (stats.conceded !== null) {
        display.push({
          label: 'Goles encajados',
          cantidad: stats.conceded,
          puntos: '-',
        });
      }

      if (stats.penaltySaved) {
        display.push({
          label: 'Penaltis parados',
          cantidad: stats.penaltySaved,
          puntos: '-',
        });
      }
    }

    // Tiros
    if (stats.shotsOn) {
      display.push({
        label: 'Tiros a puerta',
        cantidad: stats.shotsOn,
        puntos: '-',
      });
    }

    // Pases clave
    if (stats.passesKey) {
      display.push({
        label: 'Pases clave',
        cantidad: stats.passesKey,
        puntos: '-',
      });
    }

    // Regates
    if (stats.dribblesSuccess) {
      display.push({
        label: 'Regates exitosos',
        cantidad: stats.dribblesSuccess,
        puntos: '-',
      });
    }

    // Duelos ganados
    if (stats.duelsWon) {
      display.push({
        label: 'Duelos ganados',
        cantidad: stats.duelsWon,
        puntos: '-',
      });
    }

    // Intercepciones
    if (stats.tacklesInterceptions) {
      display.push({
        label: 'Intercepciones',
        cantidad: stats.tacklesInterceptions,
        puntos: '-',
      });
    }

    // Faltas
    if (stats.foulsDrawn) {
      display.push({
        label: 'Faltas recibidas',
        cantidad: stats.foulsDrawn,
        puntos: '-',
      });
    }

    // Tarjetas
    if (stats.yellowCards) {
      display.push({
        label: 'Tarjetas amarillas',
        cantidad: stats.yellowCards,
        puntos: '-',
      });
    }

    if (stats.redCards) {
      display.push({
        label: 'Tarjetas rojas',
        cantidad: stats.redCards,
        puntos: '-',
      });
    }

    // Penaltis
    if (stats.penaltyScored) {
      display.push({
        label: 'Penaltis marcados',
        cantidad: stats.penaltyScored,
        puntos: '-',
      });
    }

    if (stats.penaltyMissed) {
      display.push({
        label: 'Penaltis fallados',
        cantidad: stats.penaltyMissed,
        puntos: '-',
      });
    }

    // Rating
    if (stats.rating) {
      display.push({
        label: 'Valoración',
        cantidad: parseFloat(stats.rating).toFixed(1),
        puntos: '-',
      });
    }

    return display;
  }
}

export const PlayerStatsService = new PlayerStatsServiceClass();
