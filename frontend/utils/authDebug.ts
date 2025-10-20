import EncryptedStorage from 'react-native-encrypted-storage';

/**
 * Utilidad para depurar problemas de autenticación
 */
export class AuthDebug {
  /**
   * Verifica el estado de autenticación y registra información útil
   */
  static async checkAuthStatus(): Promise<{
    hasToken: boolean;
    hasUserId: boolean;
    tokenPreview?: string;
  }> {
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      const userId = await EncryptedStorage.getItem('userId');

      const result = {
        hasToken: !!token,
        hasUserId: !!userId,
        tokenPreview: token ? `${token.substring(0, 20)}...` : undefined,
      };

      console.log('[AuthDebug] Estado de autenticación:', result);
      return result;
    } catch (error) {
      console.error('[AuthDebug] Error verificando estado de autenticación:', error);
      return {
        hasToken: false,
        hasUserId: false,
      };
    }
  }

  /**
   * Intenta recuperar y mostrar todos los datos de autenticación almacenados
   */
  static async getAllAuthData(): Promise<{
    accessToken?: string;
    userId?: string;
    isAdmin?: string;
  }> {
    try {
      const accessToken = await EncryptedStorage.getItem('accessToken');
      const userId = await EncryptedStorage.getItem('userId');
      const isAdmin = await EncryptedStorage.getItem('isAdmin');

      const data = {
        accessToken: accessToken ? `${accessToken.substring(0, 30)}...` : undefined,
        userId: userId ?? undefined,
        isAdmin: isAdmin ?? undefined,
      };

      console.log('[AuthDebug] Datos de autenticación:', data);
      return data;
    } catch (error) {
      console.error('[AuthDebug] Error obteniendo datos de autenticación:', error);
      return {};
    }
  }

  /**
   * Limpia todos los datos de autenticación (útil para testing)
   */
  static async clearAuthData(): Promise<void> {
    try {
      await EncryptedStorage.removeItem('accessToken');
      await EncryptedStorage.removeItem('userId');
      await EncryptedStorage.removeItem('isAdmin');
      console.log('[AuthDebug] Datos de autenticación limpiados');
    } catch (error) {
      console.error('[AuthDebug] Error limpiando datos de autenticación:', error);
    }
  }
}
