/**
 * SERVICIO DE ESTADO DE JUGADORES - VERSION SIMPLIFICADA
 * 
 * Usa solo el campo "injured" del endpoint /players que indica estado ACTUAL
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const FALLBACK_APISPORTS_KEY = '07bc9c707fe2d6169fff6e17d4a9e6fd';

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
 * Obtiene el estado ACTUAL de un jugador desde la API
 * Usa solo el campo "injured" que indica si está lesionado AHORA
 */
export async function getPlayerAvailabilityFromAPI(
  playerId: number,
  season: number = 2025
): Promise<{ status: string; info: string | null }> {
  try {
    console.log(`🔍 Verificando estado del jugador ${playerId}...`);
    
    // Probar con temporada actual y anterior como fallback
    const seasons = [season, season - 1];
    
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
          const isInjured = playerData.player.injured;
          
          console.log(`   ℹ️  Jugador ${playerId} - Season ${s}: injured=${isInjured}`);
          
          // El campo "injured" indica el estado ACTUAL del jugador
          if (isInjured === true) {
            console.log(`   🏥 Jugador ${playerId} LESIONADO (estado actual)`);
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

    // Verificar suspensión por tarjetas en BD
    const suspension = await checkRedCardSuspension(playerId, season);
    if (suspension) {
      console.log(`   🟥 Jugador ${playerId} SUSPENDIDO (tarjetas)`);
      return suspension;
    }

    console.log(`   ✅ Jugador ${playerId} DISPONIBLE`);
    return {
      status: 'AVAILABLE',
      info: null,
    };

  } catch (error: any) {
    console.error(`❌ Error al obtener estado del jugador ${playerId}:`, error.message);
    return {
      status: 'AVAILABLE',
      info: null,
    };
  }
}

/**
 * Verifica si un jugador tiene suspensión activa por tarjetas
 */
async function checkRedCardSuspension(
  playerId: number,
  season: number
): Promise<{ status: string; info: string | null } | null> {
  try {
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

    // Tarjeta roja en el último partido
    if (lastStats.redCards && lastStats.redCards > 0) {
      const nextStats = await prisma.playerStats.findFirst({
        where: {
          playerId: playerId,
          season: season,
          jornada: {
            gt: lastStats.jornada,
          },
        },
      });

      if (!nextStats) {
        return {
          status: 'SUSPENDED',
          info: 'Sancionado (tarjeta roja)',
        };
      }
    }

    // Acumulación de 5+ amarillas
    const recentStats = await prisma.playerStats.findMany({
      where: {
        playerId: playerId,
        season: season,
      },
      orderBy: {
        jornada: 'desc',
      },
      take: 5,
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
 * Actualiza el estado de un jugador en BD
 */
export async function updatePlayerAvailability(
  playerId: number,
  season: number = 2025
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
export async function updateAllPlayersAvailability(season: number = 2025): Promise<void> {
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

      const updated = await prisma.player.findUnique({
        where: { id: player.id },
        select: { availabilityStatus: true },
      });

      if (updated?.availabilityStatus === 'AVAILABLE') available++;
      else if (updated?.availabilityStatus === 'INJURED') injured++;
      else if (updated?.availabilityStatus === 'SUSPENDED') suspended++;

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
 * Obtiene todos los jugadores con su estado
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
        { availabilityStatus: 'asc' },
        { name: 'asc' },
      ],
    });

    return players;
  } catch (error: any) {
    console.error('❌ Error al obtener jugadores:', error.message);
    throw error;
  }
}
