import { PrismaClient } from '@prisma/client';
import { PlayerStatsService } from './playerStats.service.js';
import { PlayerService } from './player.service.js';

const prisma = new PrismaClient();

/**
 * SERVICIO: Cálculo de puntos en tiempo real para TODAS las ligas
 * 
 * Este servicio:
 * 1. Obtiene todas las ligas con jornada cerrada (partidos en curso)
 * 2. Para cada liga, obtiene todas las plantillas
 * 3. Recopila TODOS los jugadores únicos (sin duplicados)
 * 4. Calcula los puntos de cada jugador UNA SOLA VEZ desde la API
 * 5. Los datos quedan guardados en player_stats para que el frontend los lea
 */

export class PointsCalculationService {
  static async calculateAllPoints() {
    console.log('🚀 [PointsCalculationService] Iniciando cálculo de puntos para todas las ligas...\n');
    
    let totalLeagues = 0;
    let leaguesProcessed = 0;
    let totalPlayers = 0;
    let totalCalculated = 0;
    let totalErrors = 0;

    try {
      // 1. Obtener todas las ligas
      const leagues = await prisma.league.findMany({
        select: {
          id: true,
          name: true,
          currentJornada: true,
          jornadaStatus: true
        }
      });

      totalLeagues = leagues.length;
      console.log(`📊 [PointsCalculationService] Encontradas ${totalLeagues} ligas\n`);

      if (totalLeagues === 0) {
        console.log('⚠️  [PointsCalculationService] No hay ligas');
        return {
          leaguesProcessed: 0,
          totalPlayers: 0,
          totalCalculated: 0,
          totalErrors: 0
        };
      }

      // 2. Procesar cada liga
      for (const league of leagues) {
        // Solo calcular si la jornada está cerrada (partidos en curso)
        if (league.jornadaStatus !== 'closed') {
          console.log(`⏭️  [PointsCalculationService] Liga "${league.name}" - Jornada ${league.currentJornada} no está cerrada (status: ${league.jornadaStatus}), saltando...`);
          continue;
        }

        console.log(`\n🏆 [PointsCalculationService] Procesando liga: "${league.name}" (ID: ${league.id})`);
        console.log(`📅 [PointsCalculationService] Jornada actual: ${league.currentJornada} (estado: ${league.jornadaStatus})`);

        leaguesProcessed++;

        // 3. Obtener todas las plantillas de esta liga
        const squads = await prisma.squad.findMany({
          where: {
            leagueId: league.id
          },
          include: {
            players: true,
            user: {
              select: {
                name: true
              }
            }
          }
        });

        console.log(`👥 [PointsCalculationService] Encontradas ${squads.length} plantillas en esta liga`);

        // 4. Recopilar TODOS los jugadores únicos de todas las plantillas
        const uniquePlayerIds = new Set<number>();
        const playerSquadMap = new Map<number, string[]>(); // playerId -> [usernames]

        for (const squad of squads) {
          // Validar que tenga exactamente 11 jugadores
          if (squad.players.length !== 11) {
            console.log(`   ⚠️  Usuario "${squad.user.name}" tiene ${squad.players.length} jugadores (necesita 11), saltando...`);
            continue;
          }

          for (const player of squad.players) {
            uniquePlayerIds.add(player.playerId);
            
            // Tracking: registrar qué usuarios tienen este jugador
            if (!playerSquadMap.has(player.playerId)) {
              playerSquadMap.set(player.playerId, []);
            }
            playerSquadMap.get(player.playerId)!.push(squad.user.name || 'Usuario desconocido');
          }
        }

        console.log(`⚡ [PointsCalculationService] Total de jugadores únicos a calcular: ${uniquePlayerIds.size}`);
        totalPlayers += uniquePlayerIds.size;

        // 5. Calcular puntos para cada jugador ÚNICO (UNA SOLA VEZ)
        let calculatedCount = 0;
        let errorCount = 0;

        for (const playerId of uniquePlayerIds) {
          const users = playerSquadMap.get(playerId) || [];
          console.log(`   🔄 Calculando jugador ID ${playerId} (usado por: ${users.join(', ')})...`);
          
          try {
            // Verificar si el jugador existe en la BD
            const player = await prisma.player.findUnique({
              where: { id: playerId }
            });

            if (!player) {
              console.log(`   ⚠️  Jugador ID ${playerId} no existe en BD, cargando desde API...`);
              // Cargar jugador desde API
              await PlayerService.getPlayerById(playerId);
            }

            // Calcular stats con forceRefresh para obtener datos en tiempo real
            await PlayerStatsService.getPlayerStatsForJornada(
              playerId,
              league.currentJornada,
              {
                season: 2025,
                forceRefresh: true // 🔥 Forzar actualización desde API
              }
            );

            calculatedCount++;
            totalCalculated++;
            console.log(`   ✅ Puntos calculados para jugador ID ${playerId}`);
          } catch (error: any) {
            errorCount++;
            totalErrors++;
            console.log(`   ❌ Error calculando jugador ID ${playerId}: ${error.message}`);
          }
        }

        console.log(`\n📈 [PointsCalculationService] Resumen liga "${league.name}":`);
        console.log(`   ✅ Calculados: ${calculatedCount}`);
        console.log(`   ❌ Errores: ${errorCount}`);
      }

      console.log('\n\n🎉 [PointsCalculationService] ¡Cálculo de puntos completado para todas las ligas!');
      console.log(`📊 Resumen global:`);
      console.log(`   🏆 Ligas procesadas: ${leaguesProcessed}/${totalLeagues}`);
      console.log(`   👤 Jugadores únicos: ${totalPlayers}`);
      console.log(`   ✅ Calculados: ${totalCalculated}`);
      console.log(`   ❌ Errores: ${totalErrors}`);

      return {
        leaguesProcessed,
        totalPlayers,
        totalCalculated,
        totalErrors
      };
      
    } catch (error) {
      console.error('\n❌ [PointsCalculationService] Error fatal:', error);
      throw error;
    }
  }
}
