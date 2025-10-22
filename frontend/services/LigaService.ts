import EncryptedStorage from 'react-native-encrypted-storage';
import { ApiConfig } from '../utils/apiConfig';

export type Liga = {
  id: string;
  name: string;
  leaderId: string;
  createdAt: string;
};

export type CreateLeagueData = {
  name: string;
};

export type AddMemberData = {
  userId: string;
};

export class LigaService {
  // 🔑 Obtener token seguro
  private static async getAccessToken(): Promise<string | null> {
    return await EncryptedStorage.getItem('accessToken');
  }

  // 🎯 Mapear errores de API a mensajes amigables
  private static mapErrorToFriendlyMessage(error: any, statusCode?: number): string {
    // Si es un error de validación de Zod
    if (error?.details && Array.isArray(error.details)) {
      const firstError = error.details[0];
      return firstError?.message || 'Datos inválidos';
    }

    // Errores específicos por código de estado
    switch (statusCode) {
      case 400:
        if (error?.message?.includes('caracteres')) return error.message;
        return 'Los datos proporcionados no son válidos';
      case 401:
        return 'Tu sesión ha expirado. Inicia sesión de nuevo';
      case 403:
        return 'No tienes permisos para realizar esta acción';
      case 404:
        return 'La liga que buscas no existe';
      case 409:
        // Este error solo debería ocurrir si hay colisión de código (muy raro)
        return 'Error al generar código único. Intenta de nuevo';
      case 500:
        return 'Error del servidor. Inténtalo de nuevo más tarde';
      default:
        // Mensajes específicos por contenido
        if (error?.message) {
          const msg = error.message.toLowerCase();
          if (msg.includes('name') || msg.includes('nombre')) {
            if (msg.includes('short') || msg.includes('corto') || msg.includes('caracteres')) {
              return 'El nombre de la liga debe tener al menos 3 caracteres';
            }
            if (msg.includes('long') || msg.includes('largo')) {
              return 'El nombre de la liga es demasiado largo';
            }
            if (msg.includes('invalid') || msg.includes('inválido')) {
              return 'El nombre de la liga contiene caracteres no permitidos';
            }
          }
          if (msg.includes('código único') || msg.includes('code')) {
            return 'Error al generar código único. Intenta de nuevo';
          }
          return error.message;
        }
        return 'Ocurrió un error inesperado';
    }
  }

    // ➕ Crear liga (devuelve liga con código generado)
static async crearLiga(data: CreateLeagueData): Promise<Liga & { code: string }> {
  const token = await this.getAccessToken();
  console.log('🔍 LigaService.crearLiga - Token encontrado:', !!token);
  if (!token) throw new Error('Usuario no autenticado');

  console.log('🔍 LigaService.crearLiga - URL:', `${ApiConfig.BASE_URL}/leagues`);
  console.log('🔍 LigaService.crearLiga - Headers:', { 'Authorization': `Bearer ${token.substring(0, 20)}...` });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  const res = await fetch(`${ApiConfig.BASE_URL}/leagues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, 
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  console.log('🔍 LigaService.crearLiga - Status:', res.status);

  const json = await res.json().catch(() => ({}));
  console.log('🔍 LigaService.crearLiga - Respuesta:', json);

  if (!res.ok) {
    // Usar mensajes amigables
    const friendlyMessage = this.mapErrorToFriendlyMessage(json, res.status);
    
    // Si es 401, limpiar tokens
    if (res.status === 401) {
      console.log('🔍 LigaService.crearLiga - Token expirado, limpiando storage');
      await EncryptedStorage.removeItem('accessToken');
      await EncryptedStorage.removeItem('refreshToken');
      await EncryptedStorage.removeItem('userId');
    }
    
    throw new Error(friendlyMessage);
  }

  return json as Liga & { code: string };
}


  // ❌ Eliminar liga
  static async eliminarLiga(leagueId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Error al eliminar la liga');
      }
    } catch (error: any) {
      console.warn('LigaService.eliminarLiga:', error);
      throw new Error(error?.message || 'No se pudo eliminar la liga');
    }
  }

  // 👥 Agregar miembro
  static async agregarMiembro(leagueId: string, data: AddMemberData) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || 'Error al agregar miembro');

      return json;
    } catch (error: any) {
      console.warn('LigaService.agregarMiembro:', error);
      throw new Error(error?.message || 'No se pudo agregar el miembro');
    }
  }

  // 👥 Unirse a liga por código
  static async unirsePorCodigo(codigo: string) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/join/${codigo}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const friendlyMessage = this.mapErrorToFriendlyMessage(json, res.status);
        throw new Error(friendlyMessage);
      }

      return json;
    } catch (error: any) {
      console.warn('LigaService.unirsePorCodigo:', error);
      
      if (error.message.includes('Código de liga inválido')) {
        throw new Error('El código de liga no existe o es incorrecto');
      }
      
      throw new Error(error?.message || 'No se pudo unir a la liga');
    }
  }

  // ❌ Quitar miembro
  static async quitarMiembro(leagueId: string, userId: string) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Error al eliminar miembro');
      }
    } catch (error: any) {
      console.warn('LigaService.quitarMiembro:', error);
      throw new Error(error?.message || 'No se pudo eliminar el miembro');
    }
  }

  // 👥 Listar miembros (con filtro opcional de jornada)
  static async listarMiembros(leagueId: string, jornada?: number | 'Total') {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      // Construir URL con parámetro de query si se especifica jornada
      let url = `${ApiConfig.BASE_URL}/leagues/${leagueId}/members`;
      if (jornada && jornada !== 'Total') {
        url += `?jornada=${jornada}`;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || 'Error al listar miembros');

      return json;
    } catch (error: any) {
      console.warn('LigaService.listarMiembros:', error);
      throw new Error(error?.message || 'No se pudieron cargar los miembros');
    }
  }

  // � Obtener TODAS las clasificaciones (Total + cada jornada) en una sola llamada
  static async getAllClassifications(leagueId: string) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}/classifications`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || 'Error al obtener clasificaciones');

      return json;
    } catch (error: any) {
      console.warn('LigaService.getAllClassifications:', error);
      throw new Error(error?.message || 'No se pudieron cargar las clasificaciones');
    }
  }

  // �📜 Obtener ligas del usuario autenticado
  static async obtenerLigasPorUsuario(userId: string) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      console.log('🔍 LigaService.obtenerLigasPorUsuario - URL:', `${ApiConfig.BASE_URL}/leagues/user/${userId}`);
      console.log('🔍 LigaService.obtenerLigasPorUsuario - Token:', !!token);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout (aumentado desde 10s)

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/user/${userId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('🔍 LigaService.obtenerLigasPorUsuario - Status:', res.status);

      const json = await res.json().catch(() => ({}));
      console.log('🔍 LigaService.obtenerLigasPorUsuario - Response:', json);

      if (!res.ok) {
        const friendlyMessage = this.mapErrorToFriendlyMessage(json, res.status);
        throw new Error(friendlyMessage);
      }

      return json as Liga[];
    } catch (error: any) {
      if (__DEV__) {
        console.warn('LigaService.obtenerLigasPorUsuario:', error);
      }
      
      // Handle network-specific errors
      if (error.name === 'AbortError') {
        throw new Error('La conexión tardó demasiado. Verifica tu conexión a internet.');
      }
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error('No se pudo conectar al servidor. Verifica que el backend esté ejecutándose.');
      }
      
      throw new Error(error?.message || 'No se pudieron obtener las ligas');
    }
  }
}
