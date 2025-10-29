import axios from 'axios';
import { ApiConfig } from '../utils/apiConfig';
import EncryptedStorage from 'react-native-encrypted-storage';

const API_URL = ApiConfig.BASE_URL;

export interface JornadaResetResult {
  success: boolean;
  message: string;
  data: {
    leaguesProcessed: number;
    totalEvaluations: number;
  };
}

export interface JornadaEvaluationResult {
  success: boolean;
  message: string;
  data: {
    evaluatedBets: number;
    updatedMembers: number;
    balances: Record<string, {
      userId: string;
      totalProfit: number;
      wonBets: number;
      lostBets: number;
    }>;
  };
}

export class JornadaService {
  /**
   * Resetear jornada para todas las ligas
   */
  static async resetAllLeagues(jornada: number): Promise<JornadaResetResult> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      console.log('🔑 JornadaService.resetAllLeagues - Token encontrado:', !!token);
      
      const response = await axios.post(
        `${API_URL}/jornada/reset-all`,
        { jornada },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error reseteando jornada:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al resetear jornada');
    }
  }

  /**
   * Resetear jornada para una liga específica
   */
  static async resetLeague(leagueId: string, jornada: number): Promise<JornadaEvaluationResult> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      
      const response = await axios.post(
        `${API_URL}/jornada/reset/${leagueId}`,
        { jornada },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error reseteando liga:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al resetear liga');
    }
  }

  /**
   * Evaluar apuestas sin aplicar cambios (solo testing)
   */
  static async evaluateLeague(leagueId: string, jornada: number): Promise<JornadaEvaluationResult> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      
      const response = await axios.post(
        `${API_URL}/jornada/evaluate/${leagueId}`,
        { jornada },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error evaluando liga:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al evaluar liga');
    }
  }

  /**
   * Abrir jornada (antes "Cerrar") - Bloquea apuestas y modificaciones
   * No requiere jornada, usa la actual de la liga
   */
  static async openJornada(leagueId: string): Promise<{
    success: boolean;
    message: string;
    leagueName: string;
    jornada: number;
  }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      
      const response = await axios.post(
        `${API_URL}/jornada/open/${leagueId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error abriendo jornada:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al abrir jornada');
    }
  }

  /**
   * Cerrar jornada (proceso completo: evalúa apuestas, calcula puntos, actualiza presupuestos, etc.)
   * No requiere jornada, usa la actual de la liga
   */
  static async closeJornada(leagueId: string): Promise<{
    success: boolean;
    message: string;
    leagueName: string;
    jornada: number;
    evaluations: Array<{
      betId: string;
      won: boolean;
      profit: number;
    }>;
    updatedMembers: number;
    clearedSquads: number;
    deletedBetOptions: number;
  }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      
      console.log(`🔒 Cerrando jornada para liga ${leagueId} (proceso completo)...`);
      
      const response = await axios.post(
        `${API_URL}/jornada/close/${leagueId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutos (puede tardar con muchos jugadores)
        }
      );

      console.log('✅ Jornada cerrada exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error cerrando jornada:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al cerrar jornada');
    }
  }

  /**
   * Obtener estado actual de la jornada
   */
  static async getJornadaStatus(leagueId: string): Promise<{
    currentJornada: number;
    status: string;
    leagueName: string;
    division?: string;
  }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      
      const response = await axios.get(
        `${API_URL}/jornada/status/${leagueId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo estado de jornada:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al obtener estado de jornada');
    }
  }

  /**
   * Abrir jornada para TODAS las ligas (bloquea cambios)
   */
  static async openAllJornadas(): Promise<{
    success: boolean;
    message: string;
    leaguesProcessed: number;
    leagues: Array<{
      id: string;
      name: string;
      jornada: number;
    }>;
  }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      
      const response = await axios.post(
        `${API_URL}/jornada/open-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error abriendo todas las jornadas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al abrir jornadas');
    }
  }

  /**
   * Cerrar jornada para TODAS las ligas (proceso completo: evalúa apuestas, calcula puntos, actualiza presupuestos, etc.)
   */
  static async closeAllJornadas(): Promise<{
    success: boolean;
    message: string;
    leaguesProcessed: number;
    totalEvaluations: number;
    totalUpdatedMembers: number;
    totalClearedSquads: number;
    leagues: Array<{
      id: string;
      name: string;
      oldJornada: number;
      newJornada: number;
      evaluations: number;
      updatedMembers: number;
      clearedSquads: number;
    }>;
  }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      
      console.log('🔒 Cerrando TODAS las jornadas (proceso completo)...');
      
      const response = await axios.post(
        `${API_URL}/jornada/close-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 180000, // 3 minutos (puede tardar con muchas ligas/jugadores)
        }
      );

      console.log('✅ Jornadas cerradas exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error cerrando todas las jornadas:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al cerrar jornadas');
    }
  }
}
