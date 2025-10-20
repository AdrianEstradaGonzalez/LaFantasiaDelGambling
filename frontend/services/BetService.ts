import axios from 'axios';
import { ApiConfig } from '../utils/apiConfig';
import EncryptedStorage from 'react-native-encrypted-storage';

const API_URL = ApiConfig.BASE_URL;

export interface BettingBudget {
  total: number;
  used: number;
  available: number;
}

export interface Bet {
  id: string;
  leagueId: string;
  userId: string;
  userName?: string;
  jornada: number;
  matchId: number;
  betType: string;
  betLabel: string;
  odd: number;
  amount: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost';
  createdAt: string;
}

export class BetService {
  /**
   * Obtener presupuesto de apuestas disponible
   */
  static async getBettingBudget(leagueId: string): Promise<BettingBudget> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await axios.get(`${API_URL}/bets/budget/${leagueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting betting budget:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al obtener presupuesto');
    }
  }

  /**
   * Obtener todas las apuestas de la liga para la jornada actual
   */
  static async getLeagueBets(leagueId: string): Promise<Bet[]> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.get(`${API_URL}/bets/all/${leagueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting league bets:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al obtener apuestas de la liga');
    }
  }

  /**
   * Crear una nueva apuesta
   */
  static async placeBet(params: {
    leagueId: string;
    matchId: number;
    homeTeam: string;
    awayTeam: string;
    betType: string;
    betLabel: string;
    odd: number;
    amount: number;
  }): Promise<Bet> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await axios.post(
        `${API_URL}/bets/${params.leagueId}`,
        {
          matchId: params.matchId,
          homeTeam: params.homeTeam,
          awayTeam: params.awayTeam,
          betType: params.betType,
          betLabel: params.betLabel,
          odd: params.odd,
          amount: params.amount,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error placing bet:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al crear apuesta');
    }
  }

  /**
   * Obtener apuestas del usuario en la jornada actual
   */
  static async getUserBets(leagueId: string): Promise<Bet[]> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await axios.get(`${API_URL}/bets/${leagueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting user bets:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al obtener apuestas');
    }
  }

  /**
   * Actualizar monto de una apuesta
   */
  static async updateBetAmount(leagueId: string, betId: string, amount: number): Promise<Bet> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await axios.put(
        `${API_URL}/bets/${leagueId}/${betId}`,
        { amount },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating bet amount:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al actualizar apuesta');
    }
  }

  /**
   * Eliminar una apuesta
   */
  static async deleteBet(leagueId: string, betId: string): Promise<void> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      await axios.delete(`${API_URL}/bets/${leagueId}/${betId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error: any) {
      console.error('Error deleting bet:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al eliminar apuesta');
    }
  }

  /**
   * Evaluar apuestas pendientes de una liga específica
   */
  static async evaluateBets(leagueId: string): Promise<{
    evaluated: number;
    won: number;
    lost: number;
    pending: number;
    details: Array<{
      betId: string;
      matchId: number;
      homeTeam: string;
      awayTeam: string;
      betType: string;
      betLabel: string;
      result: 'won' | 'lost' | 'pending';
      reason?: string;
    }>;
  }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await axios.post(
        `${API_URL}/admin/evaluate-bets/${leagueId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error evaluating bets:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al evaluar apuestas');
    }
  }

  /**
   * Evaluar todas las apuestas pendientes de todas las ligas
   */
  static async evaluateAllBets(): Promise<{
    totalEvaluated: number;
    totalWon: number;
    totalLost: number;
    totalPending: number;
    leagueResults: Array<{
      leagueId: string;
      leagueName: string;
      evaluated: number;
      won: number;
      lost: number;
      pending: number;
    }>;
    details: Array<{
      betId: string;
      leagueId: string;
      matchId: number;
      homeTeam: string;
      awayTeam: string;
      betType: string;
      betLabel: string;
      result: 'won' | 'lost' | 'pending';
      reason?: string;
    }>;
  }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await axios.post(
        `${API_URL}/admin/evaluate-all-bets`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error evaluating all bets:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al evaluar todas las apuestas');
    }
  }
}
