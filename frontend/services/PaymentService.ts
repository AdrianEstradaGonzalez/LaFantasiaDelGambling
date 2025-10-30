import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiConfig } from '../utils/apiConfig';

const API_URL = ApiConfig.BASE_URL;

export interface CreateCheckoutResponse {
  checkoutUrl: string;
  message: string;
}

export interface PaymentVerificationResponse {
  paid: boolean;
  userId: string;
  leagueName: string;
  amount: number;
}

export class PaymentService {
  /**
   * Crear sesión de pago de Stripe para liga premium
   */
  static async createPremiumCheckout(leagueName: string, division: 'primera' | 'segunda'): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No estás autenticado');
      }

      const response = await axios.post<CreateCheckoutResponse>(
        `${API_URL}/payment/create-checkout`,
        {
          leagueName,
          division,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data.checkoutUrl;
    } catch (error: any) {
      console.error('❌ Error creating checkout:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(error.message || 'Error al iniciar el proceso de pago');
    }
  }

  /**
   * Verificar el estado de un pago
   */
  static async verifyPayment(sessionId: string): Promise<PaymentVerificationResponse> {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No estás autenticado');
      }

      const response = await axios.get<PaymentVerificationResponse>(
        `${API_URL}/payment/verify`,
        {
          params: { session_id: sessionId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Error verifying payment:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(error.message || 'Error al verificar el pago');
    }
  }
}
