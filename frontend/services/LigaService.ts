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
  division?: 'primera' | 'segunda' | 'premier';
  isPremium?: boolean;
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
        if (error?.message?.includes('Liga completa')) return error.message;
        return 'Los datos proporcionados no son válidos';
      case 401:
        return 'Error de autenticación. Inicia sesión de nuevo';
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
          if (msg.includes('liga completa')) {
            return error.message;
          }
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
  if (!token) throw new Error('Usuario no autenticado');

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

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Usar mensajes amigables
    const friendlyMessage = this.mapErrorToFriendlyMessage(json, res.status);
    
    // Si es 401, limpiar tokens
    if (res.status === 401) {
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
      
      if (error.message.includes('Liga completa')) {
        throw new Error(error.message);
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

  // 📜 Obtener ligas del usuario autenticado
  static async obtenerLigasPorUsuario(userId: string) {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('No se encontró sesión activa. Por favor, inicia sesión.');
      }

      // Validar que userId sea válido
      if (!userId || userId.trim() === '') {
        throw new Error('ID de usuario inválido');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout (reducido de 30s)

      if (__DEV__) {
        console.log(`📡 Obteniendo ligas para userId: ${userId}`);
      }

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/user/${userId}`, {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (__DEV__) {
        console.log(`📡 Respuesta del servidor: ${res.status} ${res.statusText}`);
      }

      // Primero verificar el status code
      if (!res.ok) {
        let json: any = {};
        try {
          json = await res.json();
        } catch (parseError) {
          if (__DEV__) {
            console.error('Error parseando respuesta de error:', parseError);
          }
        }
        
        // Si es 401, hay un problema con la autenticación
        if (res.status === 401) {
          throw new Error('Error de autenticación. Por favor, cierra sesión e inicia sesión de nuevo.');
        }
        
        const friendlyMessage = this.mapErrorToFriendlyMessage(json, res.status);
        throw new Error(friendlyMessage);
      }

      // Parsear respuesta exitosa
      let json: any;
      const responseText = await res.text();
      
      if (__DEV__) {
        console.log('📥 Respuesta del servidor (raw):', responseText.substring(0, 200));
      }
      
      try {
        // Si la respuesta está vacía, devolver array vacío
        if (!responseText || responseText.trim() === '') {
          if (__DEV__) {
            console.warn('⚠️  Respuesta vacía del servidor, devolviendo array vacío');
          }
          return [];
        }
        
        json = JSON.parse(responseText);
      } catch (parseError) {
        if (__DEV__) {
          console.error('❌ Error parseando respuesta JSON exitosa:', parseError);
          console.error('Respuesta recibida:', responseText.substring(0, 500));
        }
        throw new Error('Respuesta inválida del servidor');
      }

      // Verificar que la respuesta sea un array
      if (!Array.isArray(json)) {
        if (__DEV__) {
          console.error('❌ Respuesta no es un array:', json);
        }
        // Si no es un array pero es un objeto vacío, devolver array vacío
        if (json && typeof json === 'object' && Object.keys(json).length === 0) {
          if (__DEV__) {
            console.warn('⚠️  Objeto vacío recibido, devolviendo array vacío');
          }
          return [];
        }
        throw new Error('Formato de respuesta inválido');
      }

      if (__DEV__) {
        console.log(`✅ ${json.length} ligas obtenidas del servidor`);
      }

      return json as Liga[];
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ LigaService.obtenerLigasPorUsuario error:', {
          message: error?.message,
          name: error?.name,
          stack: error?.stack
        });
      }
      
      // Handle network-specific errors
      if (error.name === 'AbortError') {
        throw new Error('La conexión tardó demasiado. Verifica tu conexión a internet.');
      }
      if (error.message?.includes('Network request failed') || 
          error.message?.includes('fetch') ||
          error.message?.includes('Failed to fetch')) {
        throw new Error('No se pudo conectar al servidor. Verifica tu conexión a internet.');
      }
      
      // Re-lanzar el error con el mensaje apropiado
      throw new Error(error?.message || 'No se pudieron obtener las ligas');
    }
  }

  // 🔄 Calcular puntos en tiempo real consultando API-Football
  // Solo funciona cuando la jornada está cerrada (partidos en curso)
  static async calculateRealTimePoints(leagueId: string) {
    // Read realtime cached points from backend endpoint instead of triggering heavy recalculation
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}/realtime`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 204) return { players: [], lastUpdate: null };

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const friendlyMessage = this.mapErrorToFriendlyMessage(json, res.status);
        throw new Error(friendlyMessage);
      }

      return json.players ?? [];
    } catch (error: any) {
      if (error.name === 'AbortError') throw new Error('La conexión tardó demasiado. Intenta de nuevo.');
      throw new Error(error?.message || 'No se pudieron obtener los puntos en tiempo real');
    }
  }

  // 🚀 Disparar cálculo de puntos para TODAS las ligas (en background)
  // No bloquea, responde inmediatamente mientras el cálculo se ejecuta en el servidor
  static async triggerPointsCalculation() {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      console.log('🚀 LigaService.triggerPointsCalculation - Disparando cálculo en background...');

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/trigger-points-calculation`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.warn('⚠️ No se pudo disparar cálculo:', json);
        return false;
      }

      console.log('✅ LigaService.triggerPointsCalculation - Cálculo iniciado en background');
      return true;
    } catch (error: any) {
      console.warn('⚠️ LigaService.triggerPointsCalculation error:', error);
      return false;
    }
  }

  // 💎 Actualizar liga a premium después de pago exitoso
  static async upgradeLeagueToPremium(leagueId: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      console.log(`💎 LigaService.upgradeLeagueToPremium - Actualizando liga ${leagueId} a premium...`);

      const res = await fetch(`${ApiConfig.BASE_URL}/leagues/${leagueId}/upgrade-to-premium`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = this.mapErrorToFriendlyMessage(json, res.status);
        throw new Error(errorMsg);
      }

      console.log('✅ LigaService.upgradeLeagueToPremium - Liga actualizada a premium');
      return json;
    } catch (error: any) {
      console.error('❌ LigaService.upgradeLeagueToPremium error:', error);
      throw error;
    }
  }

  // 🌍 Unirse a la liga pública DreamLeague
  static async joinDreamLeague(): Promise<any> {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      // Unirse usando el código fijo DREAMLEAGUE
      return await this.unirsePorCodigo('DREAMLEAGUE');
    } catch (error: any) {
      console.warn('LigaService.joinDreamLeague:', error);
      throw error;
    }
  }

  // 📄 Obtener clasificación paginada (especialmente para ligas grandes)
  static async getPaginatedClassification(
    leagueId: string, 
    jornada: number | 'Total' = 'Total',
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const jornadaParam = jornada === 'Total' ? 'Total' : jornada.toString();
      const url = `${ApiConfig.BASE_URL}/leagues/${leagueId}/classification/paginated?jornada=${jornadaParam}&page=${page}&limit=${limit}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const friendlyMessage = this.mapErrorToFriendlyMessage(json, res.status);
        throw new Error(friendlyMessage);
      }

      return json;
    } catch (error: any) {
      console.warn('LigaService.getPaginatedClassification:', error);
      throw new Error(error?.message || 'No se pudo cargar la clasificación paginada');
    }
  }

  // 🔍 Obtener posición del usuario en la clasificación
  static async getUserPosition(leagueId: string, jornada: number | 'Total' = 'Total') {
    try {
      const token = await this.getAccessToken();
      if (!token) throw new Error('Usuario no autenticado');

      const jornadaParam = jornada === 'Total' ? 'Total' : jornada.toString();
      const url = `${ApiConfig.BASE_URL}/leagues/${leagueId}/user-position?jornada=${jornadaParam}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const friendlyMessage = this.mapErrorToFriendlyMessage(json, res.status);
        throw new Error(friendlyMessage);
      }

      return json;
    } catch (error: any) {
      console.warn('LigaService.getUserPosition:', error);
      throw new Error(error?.message || 'No se pudo obtener la posición del usuario');
    }
  }
}
