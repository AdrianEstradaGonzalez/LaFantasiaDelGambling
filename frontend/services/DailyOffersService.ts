import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import { ApiConfig } from '../utils/apiConfig';

const API_BASE = ApiConfig.BASE_URL;

export interface DailyOffer {
  id: string;
  date: string;
  playerId: number;
  playerName: string;
  division: string;
  originalPrice: number;
  offerPrice: number;
  discount: number;
  createdAt: string;
}

export class DailyOffersService {
  /**
   * Obtener ofertas del día
   */
  static async getTodayOffers(division?: 'primera' | 'segunda' | 'premier'): Promise<DailyOffer[]> {
    try {
      const token = await EncryptedStorage.getItem('token');
      
      const params = division ? `?division=${division}` : '';
      const response = await axios.get(`${API_BASE}/daily-offers${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      if (response.data.success) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error('Error obteniendo ofertas diarias:', error);
      return [];
    }
  }

  /**
   * Verificar si un jugador está en oferta
   */
  static async isPlayerOnOffer(playerId: number): Promise<{ isOnOffer: boolean; offerPrice?: number; discount?: number }> {
    try {
      const token = await EncryptedStorage.getItem('token');
      
      const response = await axios.get(`${API_BASE}/daily-offers/player/${playerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      });

      if (response.data.success) {
        return response.data.data;
      }

      return { isOnOffer: false };
    } catch (error) {
      console.error('Error verificando oferta de jugador:', error);
      return { isOnOffer: false };
    }
  }
}
