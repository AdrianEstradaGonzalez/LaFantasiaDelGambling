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
        
        // Manejo específico de errores según el código de estado
        if (response.status === 400) {
          // Errores de validación
          if (error.message) {
            throw new Error(error.message);
          }
          throw new Error('Datos inválidos. Verifica los campos del formulario.');
        }
        if (response.status === 409) {
          // Usuario ya existe
          throw new Error(error.message || 'Este correo ya está registrado. Intenta iniciar sesión.');
        }
        if (response.status === 500) {
          throw new Error('Error en el servidor. Inténtalo más tarde.');
        }
        
        throw new Error(error.message || `Error al registrarse (${response.status})`);
      }

      const result = await response.json();
      
      // Guardar tokens de forma consistente con LoginService
      if (result.accessToken) {
        await EncryptedStorage.setItem('accessToken', result.accessToken);
      }
      
      if (result.refreshToken) {
        await EncryptedStorage.setItem('refreshToken', result.refreshToken);
      }
      
      if (result.user?.id) {
        await EncryptedStorage.setItem('userId', result.user.id);
      }

      // Guardar estado de admin
      const isAdmin = result.user?.isAdmin ?? false;
      await EncryptedStorage.setItem('isAdmin', String(isAdmin));
      console.log('✅ isAdmin guardado:', isAdmin);

      // Guardar sesión completa con información del usuario
      if (result.user) {
        await EncryptedStorage.setItem('session', JSON.stringify({ user: result.user }));
        console.log('✅ Sesión guardada con nombre:', result.user.name);
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
