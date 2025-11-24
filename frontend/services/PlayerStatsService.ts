import EncryptedStorage from 'react-native-encrypted-storage';
import { ApiConfig } from '../utils/apiConfig';

const API_URL = ApiConfig.BASE_URL;

// Simple in-memory cache for player jornada stats: key = `${playerId}-${jornada}`
const PlayerStatsServiceClassCache: Map<string, any> = new Map();

/**
 * SERVICIO DE ESTADÍSTICAS DE JUGADORES (FRONTEND)
 * 
 * Este servicio SOLO consume datos del backend.
 * NO realiza cálculos de puntos - eso lo hace el backend.
 */

export interface PointsBreakdownEntry {
  label: string;
  amount: number | string;
  points: number;
}

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
  pointsBreakdown: PointsBreakdownEntry[] | null; // ✨ NUEVO: Desglose de puntos
  
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
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        console.error('[PlayerStatsService] No se encontró token de autenticación');
        throw new Error('No autenticado');
      }

      const queryParams = new URLSearchParams();
      if (options?.season) queryParams.append('season', String(options.season));
      if (options?.refresh) queryParams.append('refresh', 'true');

      const cacheKey = `${playerId}-${jornada}`;

      // Usar cache en memoria para evitar múltiples llamadas repetidas
      if (!options?.refresh && PlayerStatsServiceClassCache.has(cacheKey)) {
        // console.log('[PlayerStatsService] Cache hit:', cacheKey);
        return PlayerStatsServiceClassCache.get(cacheKey) as PlayerStats;
      }

      const url = `${API_URL}/player-stats/${playerId}/jornada/${jornada}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      // console.log('[PlayerStatsService] Solicitando estadísticas:', { playerId, jornada, url });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('[PlayerStatsService] Error en respuesta:', response.status, response.statusText);
        let errorMessage = 'Error al obtener estadísticas';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          // Si no se puede parsear el error como JSON
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // ✅ Solo guardar en cache si NO es refresh
      // Durante partidos en vivo con refresh, queremos datos frescos siempre
      if (!options?.refresh) {
        try {
          PlayerStatsServiceClassCache.set(cacheKey, result.data);
        } catch {}
      }

      return result.data;
    } catch (error) {
      console.error('[PlayerStatsService] Error en getPlayerJornadaStats:', error);
      throw error;
    }
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
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        console.error('[PlayerStatsService] No se encontró token de autenticación');
        throw new Error('No autenticado');
      }

      console.log('[PlayerStatsService] Solicitando estadísticas múltiples:', { playerId, jornadas: jornadas.length });

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
        console.error('[PlayerStatsService] Error en respuesta:', response.status, response.statusText);
        let errorMessage = 'Error al obtener estadísticas';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          // Si no se puede parsear el error como JSON
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[PlayerStatsService] Estadísticas múltiples obtenidas:', result.count || jornadas.length);
      return result.data;
    } catch (error) {
      console.error('[PlayerStatsService] Error en getPlayerMultipleJornadasStats:', error);
      throw error;
    }
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

    if (stats.penaltyWon) {
      display.push({
        label: 'Penaltis ganados',
        cantidad: stats.penaltyWon,
        puntos: '+2',
      });
    }

    if (stats.penaltyCommitted) {
      display.push({
        label: 'Penaltis cometidos',
        cantidad: stats.penaltyCommitted,
        puntos: '-2',
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

  /**
   * Obtener promedios por posición de todos los jugadores
   */
  async getAveragesByPosition(): Promise<any> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        console.warn('[PlayerStatsService] No hay sesión activa para obtener promedios');
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${API_URL}/player-stats/averages-by-position`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('[PlayerStatsService] Error en respuesta de promedios:', response.status);
        throw new Error('Error al obtener promedios por posición');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('[PlayerStatsService] Error obteniendo promedios:', error);
      throw error;
    }
  }

  /**
   * Obtener análisis del próximo rival para un jugador
   */
  async getNextOpponentAnalysis(playerId: number, currentJornada: number): Promise<any> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        console.warn('[PlayerStatsService] No hay sesión activa para análisis de rival');
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(
        `${API_URL}/player-stats/${playerId}/next-opponent?jornada=${currentJornada}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error('[PlayerStatsService] Error en respuesta de análisis rival:', response.status);
        throw new Error('Error al obtener análisis del próximo rival');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('[PlayerStatsService] Error obteniendo análisis del próximo rival:', error);
      throw error;
    }
  }

  /**
   * Limpia el caché de estadísticas de jugadores
   * Útil para forzar una recarga de datos frescos desde el backend
   */
  clearCache() {
    PlayerStatsServiceClassCache.clear();
    console.log('[PlayerStatsService] 🗑️ Caché limpiado');
  }
}

export const PlayerStatsService = new PlayerStatsServiceClass();
