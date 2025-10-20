import axios from 'axios';
import { ApiConfig } from '../utils/apiConfig';
import EncryptedStorage from 'react-native-encrypted-storage';

const API_URL = ApiConfig.BASE_URL;

export interface BetOption {
  id: string;
  leagueId: string;
  jornada: number;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  betType: string;
  betLabel: string;
  odd: number;
  createdAt: string;
  // Campos adicionales para compatibilidad
  local?: string;
  visitante?: string;
  localCrest?: string;
  visitanteCrest?: string;
  fecha?: string;
  hora?: string;
  type?: string;
  label?: string;
}

export class BetOptionService {
  /**
   * Obtener opciones de apuesta para una liga y jornada
   */
  static async getBetOptions(leagueId: string, jornada: number): Promise<BetOption[]> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.get(`${API_URL}/bet-options/${leagueId}/${jornada}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting bet options:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al obtener opciones de apuesta');
    }
  }

  /**
   * Obtener opciones de apuesta, generándolas automáticamente si no existen
   * Este es el método principal que debe usar el frontend
   */
  static async getOrGenerateBetOptions(leagueId: string, jornada: number): Promise<BetOption[]> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.get(`${API_URL}/bet-options/${leagueId}/${jornada}/get-or-generate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting or generating bet options:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al obtener opciones de apuesta');
    }
  }

  /**
   * Generar opciones de apuesta manualmente (para admin)
   */
  static async generateBetOptions(leagueId: string, jornada: number): Promise<{ success: boolean; generated: number }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.post(
        `${API_URL}/bet-options/${leagueId}/${jornada}/generate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error generating bet options:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al generar opciones de apuesta');
    }
  }

  /**
   * Guardar opciones de apuesta para una liga y jornada
   */
  static async saveBetOptions(
    leagueId: string,
    jornada: number,
    options: Array<{
      matchId: number;
      homeTeam: string;
      awayTeam: string;
      betType: string;
      betLabel: string;
      odd: number;
    }>
  ): Promise<{ success: boolean; created: number }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.post(
        `${API_URL}/bet-options/${leagueId}/${jornada}`,
        { options },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error saving bet options:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.error || 'Error al guardar opciones de apuesta');
    }
  }

  /**
   * Verificar si existen opciones de apuesta para una liga y jornada
   */
  static async checkOptionsExist(leagueId: string, jornada: number): Promise<boolean> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.get(`${API_URL}/bet-options/${leagueId}/${jornada}/exists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.exists;
    } catch (error: any) {
      console.error('Error checking bet options:', error?.response?.data || error.message);
      return false;
    }
  }
}
