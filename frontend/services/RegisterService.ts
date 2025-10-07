import EncryptedStorage from 'react-native-encrypted-storage';
import { ApiConfig } from '../utils/apiConfig';

export type RegisterData = {
  username: string;
  email: string;
  password: string;
  repeatPassword?: string;
};

export const RegisterService = {
  register: async (data: RegisterData) => {
    try {
      const response = await fetch(`${ApiConfig.BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: data.username,
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Error ${response.status}`);
      }

      const result = await response.json();

      if (result.token) {
        await EncryptedStorage.setItem('token', result.token);
      }

      return result;
    } catch (error: any) {
      console.error('Error en RegisterService:', error);
      throw new Error(error.message || 'Error al registrarse');
    }
  },
};
