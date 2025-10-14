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
   * Mapea todas las variantes de posiciones a las 4 categorías canónicas
   */
  private static normalizePosition(pos?: string): string {
    if (!pos) return 'Midfielder';
    
    const normalized = pos.trim().toLowerCase();
    
    // Porteros
    if (normalized === 'g' || normalized === 'goalkeeper' || normalized.includes('goal') || normalized.includes('keeper')) {
      return 'Goalkeeper';
    }
    
    // Defensas
    if (normalized === 'd' || normalized === 'defender' || normalized.includes('defen') || normalized.includes('back')) {
      return 'Defender';
    }
    
    // Centrocampistas (incluye mediocentros defensivos, centrales, ofensivos)
    // Se evalúa ANTES que delanteros para capturar "Defensive Midfield", "Central Midfield", etc.
    if (normalized === 'm' || normalized === 'midfielder' || normalized.includes('midfield') || normalized.includes('midf')) {
      return 'Midfielder';
    }
    
    // Delanteros (incluye extremos/wingers, atacantes, delanteros centro)
    if (normalized === 'f' || normalized === 'attacker' || normalized === 'forward' || normalized.includes('attack') || normalized.includes('forward') || normalized.includes('striker') || normalized.includes('wing')) {
      return 'Attacker';
    }
    
    // Default
    return 'Midfielder';
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
    const allPlayersMap = new Map<number, PlayerData & { appearances: number }>();
    let page = 1;
    let totalPages = 1;
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
            if (!player?.id) continue;

            // 🔍 LOG COMPLETO: Mostrar objeto raw de la API para jugadores específicos
            const playerNameLower = (player.name || '').toLowerCase();
            if (playerNameLower.includes('yamal') || playerNameLower.includes('nico williams') || playerNameLower.includes('vinícius') || playerNameLower.includes('eyong')) {
              console.log(`\n🔍 ===== DATOS RAW DE LA API PARA ${player.name.toUpperCase()} =====`);
              console.log(JSON.stringify(item, null, 2));
              console.log('===== FIN DATOS RAW =====\n');
            }

            // ⚠️ IMPORTANTE: Un jugador puede tener múltiples estadísticas (equipos diferentes)
            // Por ejemplo, jugadores cedidos aparecen con stats del equipo original Y del equipo cedido
            const allStats = item?.statistics || [];

            for (const stats of allStats) {
              // Posición ORIGINAL de la API (antes de normalizar)
              const rawPosition = stats?.games?.position || player.position;
              const position = this.normalizePosition(rawPosition);
              const price = this.generatePrice(position);

              // Número de apariciones (partidos jugados)
              const appearances = stats?.games?.appearences || stats?.games?.lineups || 0;

              // 🔍 LOG: Ver posición original vs normalizada
              if (page === 1 && allPlayersMap.size < 5) {
                console.log(`📊 Jugador: ${player.name} | Posición API: "${rawPosition}" → Normalizada: "${position}"`);
              }

              const playerData = {
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
                appearances
              };

              // Si el jugador ya existe, quedarse con el que tiene más apariciones
              // (el equipo donde está cedido/jugando actualmente)
              const existing = allPlayersMap.get(player.id);
              if (!existing || appearances > existing.appearances) {
                if (existing && appearances > existing.appearances) {
                  console.log(`🔄 ${player.name}: Reemplazando ${existing.teamName} (${existing.appearances} partidos) por ${stats?.team?.name} (${appearances} partidos)`);
                }
                allPlayersMap.set(player.id, playerData);
              } else if (existing && appearances < existing.appearances) {
                console.log(`⏭️ ${player.name}: Manteniendo ${existing.teamName} (${existing.appearances} partidos), ignorando ${stats?.team?.name} (${appearances} partidos)`);
              }
            }
          }

          console.log(`📄 Página ${page}/${totalPages} procesada: ${list.length} jugadores (Total únicos: ${allPlayersMap.size})`);
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

      // Convertir el Map a array de jugadores (sin el campo 'appearances')
      const allPlayers = Array.from(allPlayersMap.values()).map(({ appearances, ...player }) => player);

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
    const players = await PlayerRepository.getAllPlayers();
    
    // Ordenar por equipo y luego por posición en el orden lógico
    const positionOrder: Record<string, number> = {
      'Goalkeeper': 1,
      'Defender': 2,
      'Midfielder': 3,
      'Attacker': 4
    };
    
    return players.sort((a, b) => {
      // Primero ordenar por equipo (alfabéticamente)
      const teamCompare = a.teamName.localeCompare(b.teamName);
      if (teamCompare !== 0) return teamCompare;
      
      // Luego por posición (orden lógico)
      const posA = positionOrder[a.position] || 999;
      const posB = positionOrder[b.position] || 999;
      if (posA !== posB) return posA - posB;
      
      // Finalmente por nombre
      return a.name.localeCompare(b.name);
    });
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
   * Actualizar posición de jugador
   */
  static async updatePlayerPosition(id: number, position: string) {
    const validPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
    if (!validPositions.includes(position)) {
      throw new Error(`La posición debe ser una de: ${validPositions.join(', ')}`);
    }
    return PlayerRepository.updatePlayerPosition(id, position);
  }

  /**
   * Obtener estadísticas
   */
  static async getStats() {
    return PlayerRepository.getPriceStats();
  }
}
