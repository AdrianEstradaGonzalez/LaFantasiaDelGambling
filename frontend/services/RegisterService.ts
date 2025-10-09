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
          name: data.username,
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Error ${response.status}`);
      }

      const result = await response.json();
      
      // 🔍 DEBUG: Ver qué recibimos del backend
      console.log('RegisterService - Respuesta del backend:', JSON.stringify(result, null, 2));

      // Guardar tokens de forma consistente con LoginService
      if (result.accessToken) {
        await EncryptedStorage.setItem('accessToken', result.accessToken);
        console.log('✅ AccessToken guardado');
      } else {
        console.log('❌ No se recibió accessToken');
      }
      
      if (result.refreshToken) {
        await EncryptedStorage.setItem('refreshToken', result.refreshToken);
        console.log('✅ RefreshToken guardado');
      }
      
      if (result.user?.id) {
        await EncryptedStorage.setItem('userId', result.user.id);
        console.log('✅ UserId guardado:', result.user.id);
      } else {
        console.log('❌ No se recibió user.id, result.user:', result.user);
      }

      // 🔍 Verificar que se guardaron correctamente
      const savedAccessToken = await EncryptedStorage.getItem('accessToken');
      const savedUserId = await EncryptedStorage.getItem('userId');
      console.log('🔍 Verificación post-guardado:', {
        accessToken: !!savedAccessToken,
        userId: savedUserId
      });

      return result;
    } catch (error: any) {
      console.error('Error en RegisterService:', error);
      throw new Error(error.message || 'Error al registrarse');
    }
  },
};
