/**
 * SERVICIO DE ESTADO DE JUGADORES
 * 
 * Responsable de:
 * - Consultar estado de lesiones desde API Football
 * - Detectar suspensiones por tarjetas rojas
 * - Actualizar campo availabilityStatus en BD
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const FALLBACK_APISPORTS_KEY = '099ef4c6c0803639d80207d4ac1ad5da';

function buildHeaders() {
  const candidates = [
    process.env.FOOTBALL_API_KEY,
    process.env.APISPORTS_API_KEY,
    process.env.API_FOOTBALL_KEY,
    process.env.APISPORTS_KEY,
  ].filter(Boolean) as string[];

  if (candidates.length > 0) return { 'x-apisports-key': candidates[0] };

  const rapidCandidates = [
    process.env.RAPIDAPI_KEY,
    process.env.RAPIDAPI_FOOTBALL_KEY,
    process.env.API_FOOTBALL_RAPID_KEY,
  ].filter(Boolean) as string[];

  if (rapidCandidates.length > 0)
    return { 'x-rapidapi-key': rapidCandidates[0], 'x-rapidapi-host': 'v3.football.api-sports.io' };

  return { 'x-apisports-key': FALLBACK_APISPORTS_KEY };
}

const api = axios.create({ 
  baseURL: API_BASE, 
  timeout: 15000, 
  headers: buildHeaders() 
});

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Obtiene el estado de un jugador desde la API
 * @param playerId - ID del jugador en API Football
 * @param season - Temporada (2024 o 2025)
 * @returns Estado del jugador: AVAILABLE, INJURED, SUSPENDED
 */
export async function getPlayerAvailabilityFromAPI(
  playerId: number,
  season: number = 2025
): Promise<{ status: string; info: string | null }> {
  try {
    console.log(`🔍 Verificando estado del jugador ${playerId}...`);
    
    // Consultar endpoint /injuries de La Liga (league=140)
    try {
      const injuriesResponse = await api.get('/injuries', {
        params: {
          league: 140, // La Liga
          season: season,
        },
      });

      if (injuriesResponse.data.results > 0) {
        // Buscar el jugador específico en la lista de lesionados
        const playerInjury = injuriesResponse.data.response.find(
          (injury: any) => injury.player.id === playerId
        );

        if (playerInjury) {
          const reason = playerInjury.player.reason || 'Lesionado';
          const type = playerInjury.player.type?.toLowerCase() || '';
          
          console.log(`   🏥 Jugador ${playerId} encontrado en injuries: type=${type}, reason=${reason}`);
          
          // Verificar si es suspensión o lesión
          if (type.includes('red card') || type.includes('suspension') || reason.toLowerCase().includes('suspension')) {
            console.log(`   � Jugador ${playerId} SUSPENDIDO`);
            return {
              status: 'SUSPENDED',
              info: reason,
            };
          } else {
            console.log(`   🏥 Jugador ${playerId} LESIONADO`);
            return {
              status: 'INJURED',
              info: reason,
            };
          }
        }
      }
    } catch (err: any) {
      console.log(`   ⚠️  Error consultando /injuries:`, err.response?.data?.message || err.message);
    }

    // Fallback: Verificar con endpoint /players para el campo injured
    const seasons = season === 2025 ? [2025, 2024] : [2024, 2025];
    
    for (const s of seasons) {
      try {
        const playerResponse = await api.get('/players', {
          params: {
            id: playerId,
            season: s,
          },
        });

        if (playerResponse.data.results > 0) {
          const playerData = playerResponse.data.response[0];
          
          console.log(`   ℹ️  Jugador ${playerId} - Season ${s}: injured=${playerData.player.injured}`);
          
          // Si el jugador está lesionado según la API
          if (playerData.player.injured === true) {
            console.log(`   🏥 Jugador ${playerId} LESIONADO (campo injured)`);
            return {
              status: 'INJURED',
              info: 'Lesionado',
            };
          }
          
          // Si encontramos datos, no probar con otra temporada
          break;
        }
      } catch (err: any) {
        console.log(`   ⚠️  Error con temporada ${s}:`, err.message);
        continue;
      }
    }

    // Verificar si tiene suspensión activa por tarjeta roja en BD
    const suspension = await checkRedCardSuspension(playerId, season);
    if (suspension) {
      console.log(`   🟥 Jugador ${playerId} SUSPENDIDO (BD)`);
      return suspension;
    }

    console.log(`   ✅ Jugador ${playerId} DISPONIBLE`);
    // Si no está lesionado ni suspendido, está disponible
    return {
      status: 'AVAILABLE',
      info: null,
    };

  } catch (error: any) {
    console.error(`❌ Error al obtener estado del jugador ${playerId}:`, error.message);
    // En caso de error, asumir que está disponible
    return {
      status: 'AVAILABLE',
      info: null,
    };
  }
}

/**
 * Verifica si un jugador tiene suspensión activa por tarjeta roja
 */
async function checkRedCardSuspension(
  playerId: number,
  season: number
): Promise<{ status: string; info: string | null } | null> {
  try {
    // Buscar el último partido del jugador en la BD
    const lastStats = await prisma.playerStats.findFirst({
      where: {
        playerId: playerId,
        season: season,
      },
      orderBy: {
        jornada: 'desc',
      },
    });

    if (!lastStats) {
      return null;
    }

    // Si recibió tarjeta roja en el último partido
    if (lastStats.redCards && lastStats.redCards > 0) {
      // Verificar si ya jugó otro partido después
      const nextStats = await prisma.playerStats.findFirst({
        where: {
          playerId: playerId,
          season: season,
          jornada: {
            gt: lastStats.jornada,
          },
        },
      });

      // Si no ha jugado después, aún está suspendido
      if (!nextStats) {
        return {
          status: 'SUSPENDED',
          info: 'Sancionado (tarjeta roja)',
        };
      }
    }

    // También verificar acumulación de amarillas (5+ = 1 partido)
    const recentStats = await prisma.playerStats.findMany({
      where: {
        playerId: playerId,
        season: season,
      },
      orderBy: {
        jornada: 'desc',
      },
      take: 5, // Últimos 5 partidos
    });

    const totalYellows = recentStats.reduce((sum, stats) => 
      sum + (stats.yellowCards || 0), 0
    );

    if (totalYellows >= 5) {
      return {
        status: 'SUSPENDED',
        info: 'Sancionado (acumulación de tarjetas)',
      };
    }

    return null;
  } catch (error: any) {
    console.error(`Error al verificar suspensión del jugador ${playerId}:`, error.message);
    return null;
  }
}

/**
 * Actualiza el estado de disponibilidad de un jugador en la BD
 */
export async function updatePlayerAvailability(
  playerId: number,
  season: number = 2024
): Promise<void> {
  try {
    const availability = await getPlayerAvailabilityFromAPI(playerId, season);
    
    await prisma.player.update({
      where: { id: playerId },
      data: {
        availabilityStatus: availability.status,
        availabilityInfo: availability.info,
      },
    });

    console.log(`✅ Jugador ${playerId}: ${availability.status}${availability.info ? ` - ${availability.info}` : ''}`);
  } catch (error: any) {
    console.error(`❌ Error al actualizar jugador ${playerId}:`, error.message);
  }
}

/**
 * Actualiza el estado de todos los jugadores
 */
export async function updateAllPlayersAvailability(season: number = 2024): Promise<void> {
  try {
    console.log('🔄 Iniciando sincronización de estado de jugadores...\n');

    const players = await prisma.player.findMany({
      select: { id: true, name: true },
    });

    console.log(`📊 Total de jugadores a procesar: ${players.length}\n`);

    let processed = 0;
    let available = 0;
    let injured = 0;
    let suspended = 0;

    for (const player of players) {
      await updatePlayerAvailability(player.id, season);
      processed++;

      // Contar estadísticas
      const updated = await prisma.player.findUnique({
        where: { id: player.id },
        select: { availabilityStatus: true },
      });

      if (updated?.availabilityStatus === 'AVAILABLE') available++;
      else if (updated?.availabilityStatus === 'INJURED') injured++;
      else if (updated?.availabilityStatus === 'SUSPENDED') suspended++;

      // Delay para no saturar la API
      await delay(400);

      if (processed % 10 === 0) {
        console.log(`\n📈 Progreso: ${processed}/${players.length} jugadores procesados`);
      }
    }

    console.log('\n\n✅ Sincronización completada');
    console.log(`📊 Resumen:`);
    console.log(`   - Disponibles: ${available}`);
    console.log(`   - Lesionados: ${injured}`);
    console.log(`   - Suspendidos: ${suspended}`);
    console.log(`   - Total procesados: ${processed}`);

  } catch (error: any) {
    console.error('❌ Error en la sincronización:', error.message);
    throw error;
  }
}

/**
 * Obtiene todos los jugadores con su estado de disponibilidad
 */
export async function getAllPlayersAvailability() {
  try {
    const players = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
        position: true,
        teamName: true,
        availabilityStatus: true,
        availabilityInfo: true,
        price: true,
        photo: true,
      },
      orderBy: [
        { availabilityStatus: 'asc' }, // Lesionados/suspendidos primero
        { name: 'asc' },
      ],
    });

    return players;
  } catch (error: any) {
    console.error('❌ Error al obtener jugadores:', error.message);
    throw error;
  }
}
