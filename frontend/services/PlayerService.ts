import { ApiConfig } from '../utils/apiConfig';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export interface PlayerWithPrice {
  id: number;
  name: string;
  position: string;
  teamId: number;
  teamName: string;
  teamCrest?: string;
  nationality?: string;
  shirtNumber?: number;
  photo?: string;
  price: number; // Precio en millones
  lastJornadaPoints?: number;
  totalPoints?: number; // ✨ Puntuación total de todas las jornadas
  availabilityStatus?: string; // 'AVAILABLE', 'INJURED', 'SUSPENDED'
  availabilityInfo?: string | null; // Información adicional
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStats {
  average: number;
  min: number;
  max: number;
  total: number;
}

export class PlayerService {
  private static BASE_URL = `${ApiConfig.BASE_URL}/players`;

  /**
   * Obtener todos los jugadores con precios 
   */
  static async getAllPlayers(filters?: {
    position?: string;
    teamId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    division?: string;
  }): Promise<PlayerWithPrice[]> {
    try {
      console.log('📡 [PlayerService] Iniciando getAllPlayers');
      console.log('📡 [PlayerService] Filtros:', filters ? JSON.stringify(filters) : 'ninguno');
      
      const params = new URLSearchParams();
      
      if (filters?.position) params.append('position', filters.position);
      if (filters?.teamId) params.append('teamId', filters.teamId.toString());
      if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.division) params.append('division', filters.division);

      const url = `${this.BASE_URL}${params.toString() ? '?' + params.toString() : ''}`;
      console.log('📡 [PlayerService] Haciendo fetch a:', url);
      
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }, 40000); // 40 segundos para cold-start en producción
      
      console.log('📡 [PlayerService] Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `Error ${response.status}`;
        try {
          const errorText = await response.text();
          console.error('❌ [PlayerService] Error response:', errorText);
          errorMessage = errorText || errorMessage;
        } catch (e) {
          console.error('❌ [PlayerService] No se pudo leer error response');
        }
        throw new Error(errorMessage);
      }

      console.log('📡 [PlayerService] Parseando JSON...');
      const json = await response.json();
      
      if (!json || typeof json !== 'object') {
        console.error('❌ [PlayerService] JSON inválido:', typeof json);
        throw new Error('Respuesta del servidor no es JSON válido');
      }
      
      if (!json.data || !Array.isArray(json.data)) {
        console.error('❌ [PlayerService] Estructura de respuesta inválida');
        throw new Error('Respuesta del servidor no contiene datos de jugadores');
      }
      
      console.log(`✅ [PlayerService] ${json.data.length} jugadores recibidos correctamente`);
      return json.data;
    } catch (error: any) {
      console.error('❌ [PlayerService] Error en getAllPlayers:', error?.message || 'Unknown error');
      if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
        throw new Error('Timeout al cargar jugadores. Por favor, verifica tu conexión e intenta nuevamente.');
      }
      throw error;
    }
  }

  /**
   * Obtener jugador por ID
   */
  static async getPlayerById(id: number): Promise<PlayerWithPrice> {
    try {
      const response = await fetchWithTimeout(`${this.BASE_URL}/${id}`, {}, 15000);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      return json.data;
    } catch (error) {
      console.error('Error obteniendo jugador:', error);
      throw error;
    }
  }

  static async getJornadaPoints(
    id: number,
    matchdays: number[],
    options?: { refreshLast?: boolean; season?: number }
  ): Promise<{
    success: boolean;
    data: {
      season: number;
      matchdays: number[];
      points: Array<{ matchday: number; points: number | null; source: 'api' | 'cache' }>;
      updatedMatchdays: number[];
    };
  }> {
    try {
      const response = await fetchWithTimeout(
        `${this.BASE_URL}/${id}/jornada-points`, 
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchdays,
            refreshLast: options?.refreshLast,
            season: options?.season,
          }),
        },
        15000
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || `Error ${response.status}`);
      }

      return json;
    } catch (error) {
      console.error('Error obteniendo puntos por jornada:', error);
      throw error;
    }
  }

  /**
   * Actualizar precio de un jugador
   */
  static async updatePlayerPrice(id: number, price: number): Promise<PlayerWithPrice> {
    try {
      if (price < 1 || price > 250) {
        throw new Error('El precio debe estar entre 1M y 250M');
      }

      const response = await fetchWithTimeout(`${this.BASE_URL}/${id}/price`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price }),
      }, 10000);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const json = await response.json();
      return json.data;
    } catch (error) {
      console.error('Error actualizando precio:', error);
      throw error;
    }
  }

  /**
   * Actualizar posición de un jugador
   */
  static async updatePlayerPosition(id: number, position: string): Promise<PlayerWithPrice> {
    try {
      const validPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
      if (!validPositions.includes(position)) {
        throw new Error(`La posición debe ser una de: ${validPositions.join(', ')}`);
      }

      const response = await fetchWithTimeout(`${this.BASE_URL}/${id}/position`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ position }),
      }, 10000);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const json = await response.json();
      return json.data;
    } catch (error) {
      console.error('Error actualizando posición:', error);
      throw error;
    }
  }

  /**
   * Actualizar equipo de un jugador
   */
  static async updatePlayerTeam(id: number, teamId: number): Promise<PlayerWithPrice> {
    try {
      const response = await fetchWithTimeout(`${this.BASE_URL}/${id}/team`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      }, 10000);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const json = await response.json();
      return json.data;
    } catch (error) {
      console.error('Error actualizando equipo:', error);
      throw error;
    }
  }

  /**
   * Actualizar puntos de la última jornada (cache)
   */
  static async updatePlayerLastPoints(id: number, points: number, jornada?: number): Promise<PlayerWithPrice> {
    const response = await fetchWithTimeout(`${this.BASE_URL}/${id}/last-points`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jornada != null ? { points, jornada } : { points })
    }, 10000);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.message || `Error ${response.status}`);
    }
    const json = await response.json();
    return json.data;
  }

  /**
   * Actualizar precios de múltiples jugadores
   */
  static async updateMultiplePrices(updates: { id: number; price: number }[]): Promise<void> {
    try {
      const promises = updates.map(({ id, price }) =>
        this.updatePlayerPrice(id, price)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error actualizando múltiples precios:', error);
      throw error;
    }
  }

  /**
   * Establecer todos los jugadores a un precio específico
   */
  static async resetAllPrices(price: number = 1): Promise<void> {
    try {
      if (price < 1 || price > 250) {
        throw new Error('El precio debe estar entre 1M y 250M');
      }

      // Obtener todos los jugadores
      const players = await this.getAllPlayers();
      
      // Crear actualizaciones para todos
      const updates = players.map(player => ({
        id: player.id,
        price
      }));

      // Actualizar en lotes de 50 para no saturar el servidor
      const batchSize = 50;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await this.updateMultiplePrices(batch);
        console.log(`Actualizados ${Math.min(i + batchSize, updates.length)}/${updates.length} jugadores`);
      }
    } catch (error) {
      console.error('Error estableciendo precios:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de jugadores
   */
  static async getStats(): Promise<PlayerStats> {
    try {
      const response = await fetchWithTimeout(`${this.BASE_URL}/stats`, {}, 10000);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      return json.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Eliminar un jugador por ID
   */
  static async deletePlayer(id: number): Promise<void> {
    try {
      const response = await fetchWithTimeout(`${this.BASE_URL}/${id}`, {
        method: 'DELETE',
      }, 10000);

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.message || `Error ${response.status}`);
      }

      return;
    } catch (error) {
      console.error('Error eliminando jugador:', error);
      throw error;
    }
  }

  /**
   * Sincronizar jugadores desde la API de LaLiga
   */
  static async syncPlayers(): Promise<{
    success: boolean;
    playersAdded: number;
    playersUpdated: number;
    errors: number;
  }> {
    try {
      const response = await fetchWithTimeout(`${this.BASE_URL}/sync`, {
        method: 'POST',
      }, 10000);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      return json.data;
    } catch (error) {
      console.error('Error sincronizando jugadores:', error);
      throw error;
    }
  }
}
