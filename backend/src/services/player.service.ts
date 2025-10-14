import axios from 'axios';
import { PlayerRepository, PlayerData } from '../repositories/player.repo';

const API_BASE = 'https://v3.football.api-sports.io';
const LA_LIGA_LEAGUE_ID = 140;
const SEASON_DEFAULT = 2025;
const HEADERS = {
  'x-apisports-key': '66ba89a63115cb5dc1155294ad753e09',
};

interface ApiPlayer {
  id: number;
  name: string;
  position?: string;
  nationality?: string;
  shirtNumber?: number;
  photo?: string;
  teamId: number;
  teamName: string;
  teamCrest?: string;
}

export class PlayerService {
  /**
   * Genera un precio aleatorio entre 1M y 250M basado en la posición
   */
  private static generatePrice(position: string): number {
    const ranges = {
      Goalkeeper: { min: 1, max: 80 },
      Defender: { min: 1, max: 150 },
      Midfielder: { min: 5, max: 200 },
      Attacker: { min: 10, max: 250 },
    };

    const range = ranges[position as keyof typeof ranges] || { min: 1, max: 100 };
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }

  /**
   * Normalizar posición de la API
   */
  private static normalizePosition(pos?: string): string {
    const normalized = (pos ?? '').toUpperCase();
    if (['G', 'GOALKEEPER'].includes(normalized)) return 'Goalkeeper';
    if (['D', 'DEFENDER'].includes(normalized)) return 'Defender';
    if (['M', 'MIDFIELDER'].includes(normalized)) return 'Midfielder';
    if (['F', 'ATTACKER'].includes(normalized)) return 'Attacker';
    return pos || 'Midfielder';
  }

  /**
   * Sincronizar jugadores desde la API de LaLiga
   */
  static async syncPlayersFromAPI(): Promise<{ 
    success: boolean; 
    playersAdded: number; 
    playersUpdated: number;
    errors: number;
  }> {
    const allPlayers: PlayerData[] = [];
    let page = 1;
    let totalPages = 1;
    const seen = new Set<number>();
    let errors = 0;

    try {
      console.log('🚀 Iniciando sincronización de jugadores desde API...');

      do {
        try {
          const { data } = await axios.get(`${API_BASE}/players`, {
            headers: HEADERS,
            timeout: 15000,
            params: { 
              league: LA_LIGA_LEAGUE_ID, 
              season: SEASON_DEFAULT, 
              page 
            },
          });

          const list = data?.response ?? [];
          totalPages = data?.paging?.total ?? 1; // SIN límite - obtener TODAS las páginas

          for (const item of list) {
            const player = item?.player;
            const stats = item?.statistics?.[0];

            if (!player?.id || seen.has(player.id)) continue;
            seen.add(player.id);

            const position = this.normalizePosition(stats?.games?.position || player.position);
            const price = this.generatePrice(position);

            allPlayers.push({
              id: player.id,
              name: player.name,
              position,
              teamId: stats?.team?.id,
              teamName: stats?.team?.name,
              teamCrest: stats?.team?.logo,
              nationality: player.nationality,
              shirtNumber: stats?.games?.number,
              photo: player.photo,
              price,
            });
          }

          console.log(`📄 Página ${page}/${totalPages} procesada: ${list.length} jugadores (Total acumulado: ${allPlayers.length})`);
          page += 1;
          await new Promise(r => setTimeout(r, 200)); // Aumentar delay para evitar rate limit
        } catch (e: any) {
          const status = e?.response?.status;
          if (status === 429 || status === 403) {
            console.warn('⚠️ Rate limit alcanzado, esperando 2 segundos...');
            await new Promise(r => setTimeout(r, 2000));
            // Reintentar la misma página
            continue;
          }
          console.warn('Error en página:', e?.message);
          errors++;
          break;
        }
      } while (page <= totalPages);

      console.log(`✅ Total de jugadores obtenidos de la API: ${allPlayers.length}`);

      // Guardar en la base de datos en lotes
      const batchSize = 50;
      let playersAdded = 0;
      let playersUpdated = 0;

      for (let i = 0; i < allPlayers.length; i += batchSize) {
        const batch = allPlayers.slice(i, i + batchSize);
        try {
          // Verificar cuáles existen
          const existingIds = await Promise.all(
            batch.map(p => PlayerRepository.getPlayerById(p.id))
          );
          
          const newPlayers = batch.filter((_, idx) => !existingIds[idx]);
          const updatedPlayers = batch.filter((_, idx) => existingIds[idx]);

          await PlayerRepository.upsertMany(batch);
          
          playersAdded += newPlayers.length;
          playersUpdated += updatedPlayers.length;

          console.log(`💾 Lote ${Math.floor(i / batchSize) + 1}: ${newPlayers.length} nuevos, ${updatedPlayers.length} actualizados`);
        } catch (e) {
          console.warn('Error guardando lote:', e);
          errors++;
        }
      }

      console.log(`🎉 Sincronización completada: ${playersAdded} añadidos, ${playersUpdated} actualizados`);

      return {
        success: true,
        playersAdded,
        playersUpdated,
        errors,
      };
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      return {
        success: false,
        playersAdded: 0,
        playersUpdated: 0,
        errors: errors + 1,
      };
    }
  }

  /**
   * Obtener todos los jugadores de la base de datos
   */
  static async getAllPlayers() {
    return PlayerRepository.getAllPlayers();
  }

  /**
   * Obtener jugador por ID
   */
  static async getPlayerById(id: number) {
    const player = await PlayerRepository.getPlayerById(id);
    if (!player) {
      throw new Error('Jugador no encontrado');
    }
    return player;
  }

  /**
   * Obtener jugadores por equipo
   */
  static async getPlayersByTeam(teamId: number) {
    return PlayerRepository.getPlayersByTeam(teamId);
  }

  /**
   * Obtener jugadores por posición
   */
  static async getPlayersByPosition(position: string) {
    return PlayerRepository.getPlayersByPosition(position);
  }

  /**
   * Buscar jugadores
   */
  static async searchPlayers(query: string) {
    return PlayerRepository.searchPlayers(query);
  }

  /**
   * Actualizar precio de jugador
   */
  static async updatePlayerPrice(id: number, price: number) {
    if (price < 1 || price > 250) {
      throw new Error('El precio debe estar entre 1M y 250M');
    }
    return PlayerRepository.updatePlayerPrice(id, price);
  }

  /**
   * Obtener estadísticas
   */
  static async getStats() {
    return PlayerRepository.getPriceStats();
  }
}
