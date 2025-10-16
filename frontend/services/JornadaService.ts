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
}
