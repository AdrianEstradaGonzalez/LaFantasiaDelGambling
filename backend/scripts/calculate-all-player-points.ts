import { PrismaClient } from '@prisma/client';
import { getPlayerStatsForJornada } from '../src/services/playerStats.service.js';

const prisma = new PrismaClient();

async function calculateAllPlayerPoints() {
  try {
    console.log('\n⚽ CALCULANDO PUNTOS DE TODOS LOS JUGADORES...\n');

    // Obtener jornada actual desde la primera liga
    const firstLeague = await prisma.league.findFirst();

    if (!firstLeague) {
      console.error('❌ No hay ligas en la base de datos');
      return;
    }

    const currentJornada = firstLeague.currentJornada;
    console.log(`📊 Jornada actual: ${currentJornada}\n`);

    // Obtener todos los jugadores
    const allPlayers = await prisma.player.findMany({
      select: { id: true, name: true, position: true }
    });

    console.log(`👥 Total de jugadores a procesar: ${allPlayers.length}\n`);

    let processed = 0;
    let withStats = 0;
    let errors = 0;
    let updated = 0;
    let alreadyCorrect = 0;

    // Procesar cada jugador
    for (const player of allPlayers) {
      try {
        // Obtener estadísticas de todas las jornadas hasta la actual
        let totalPoints = 0;
        let jornadasJugadas = 0;

        for (let jornada = 1; jornada <= currentJornada; jornada++) {
          try {
            // Usar el mismo servicio que usa PlayerDetail
            const stats = await getPlayerStatsForJornada(
              player.id,
              jornada,
              { forceRefresh: false } // No forzar API, usar BD
            );

            if (stats && stats.totalPoints !== null && stats.totalPoints !== undefined) {
              totalPoints += stats.totalPoints;
              jornadasJugadas++;
            }
          } catch (error) {
            // Jornada sin datos para este jugador, continuar
          }
        }

        // Obtener datos actuales del jugador
        const currentPlayer = await prisma.player.findUnique({
          where: { id: player.id },
          select: { lastJornadaPoints: true, lastJornadaNumber: true }
        });

        // Verificar si necesita actualización
        const needsUpdate = 
          !currentPlayer || 
          currentPlayer.lastJornadaPoints !== totalPoints ||
          currentPlayer.lastJornadaNumber !== currentJornada;

        if (needsUpdate) {
          // Actualizar Player con puntos acumulados
          await prisma.player.update({
            where: { id: player.id },
            data: {
              lastJornadaPoints: totalPoints,
              lastJornadaNumber: currentJornada
            }
          });

          // Actualizar o crear PlayerJornadaPoints con puntos por jornada
          const existingPoints = await prisma.playerJornadaPoints.findUnique({
            where: {
              playerId_season: {
                playerId: player.id,
                season: 2025
              }
            }
          });

          // Construir objeto con puntos de cada jornada
          const jornadaPointsData: any = {};
          for (let j = 1; j <= currentJornada; j++) {
            try {
              const stats = await getPlayerStatsForJornada(player.id, j, { forceRefresh: false });
              jornadaPointsData[`pointsJ${j}`] = stats?.totalPoints ?? 0;
            } catch {
              jornadaPointsData[`pointsJ${j}`] = 0;
            }
          }

          if (existingPoints) {
            await prisma.playerJornadaPoints.update({
              where: {
                playerId_season: {
                  playerId: player.id,
                  season: 2025
                }
              },
              data: jornadaPointsData
            });
          } else {
            await prisma.playerJornadaPoints.create({
              data: {
                playerId: player.id,
                season: 2025,
                ...jornadaPointsData
              }
            });
          }

          updated++;
          console.log(`✅ ${processed + 1}/${allPlayers.length} - ${player.name}: ${totalPoints} pts (${jornadasJugadas} jornadas) - ACTUALIZADO`);
        } else {
          alreadyCorrect++;
          console.log(`✓ ${processed + 1}/${allPlayers.length} - ${player.name}: ${totalPoints} pts - YA CORRECTO`);
        }

        processed++;
        if (totalPoints > 0) {
          withStats++;
        }

      } catch (error) {
        errors++;
        console.error(`❌ Error con ${player.name}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESO COMPLETADO\n');
    console.log('📊 Resumen:');
    console.log(`   - Jugadores procesados: ${processed}`);
    console.log(`   - Con estadísticas: ${withStats}`);
    console.log(`   - Sin datos: ${processed - withStats}`);
    console.log(`   - Actualizados: ${updated}`);
    console.log(`   - Ya correctos: ${alreadyCorrect}`);
    console.log(`   - Errores: ${errors}\n`);

  } catch (error) {
    console.error('❌ Error general:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

calculateAllPlayerPoints();
