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
      const token = await EncryptedStorage.getItem('accessToken');
      
      // Si no hay token, retornar array vacío sin hacer la petición
      if (!token) {
        console.log('⚠️ DailyOffers: No hay token disponible');
        return [];
      }
      
      console.log(`🔍 DailyOffers: Cargando ofertas para división: ${division || 'todas'}`);
      const params = division ? `?division=${division}` : '';
      const url = `${API_BASE}/daily-offers${params}`;
      console.log(`📍 DailyOffers: URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      console.log(`✅ DailyOffers: Response status: ${response.status}`);
      console.log(`📦 DailyOffers: Data:`, response.data);

      if (response.data.success) {
        console.log(`🎁 DailyOffers: ${response.data.data.length} ofertas encontradas`);
        return response.data.data;
      }

      console.log('⚠️ DailyOffers: Response no exitosa');
      return [];
    } catch (error: any) {
      console.error('❌ DailyOffers Error:', error.response?.status, error.response?.data || error.message);
      // Si es error 401, simplemente retornar array vacío
      if (error?.response?.status === 401) {
        console.log('🔒 DailyOffers: No autorizado (token inválido o expirado)');
        return [];
      }
      return [];
    }
  }

  /**
   * Verificar si un jugador está en oferta
   */
  static async isPlayerOnOffer(playerId: number): Promise<{ isOnOffer: boolean; offerPrice?: number; discount?: number }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      
      // Si no hay token, retornar que no está en oferta
      if (!token) {
        return { isOnOffer: false };
      }
      
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
    } catch (error: any) {
      // Si es error 401, simplemente retornar false sin loguear error
      if (error?.response?.status === 401) {
        return { isOnOffer: false };
      }
      console.error('Error verificando oferta de jugador:', error);
      return { isOnOffer: false };
    }
  }
}
