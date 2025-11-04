import { PrismaClient } from '@prisma/client';
import { getPlayerStatsForJornada } from '../src/services/playerStats.service.js';

const prisma = new PrismaClient();

async function calculateAllPlayerPoints() {
  try {
    console.log('\n⚽ CALCULANDO PUNTOS DE JUGADORES DE SEGUNDA DIVISIÓN...\n');

    // Obtener jornada actual desde la primera liga
    const firstLeague = await prisma.league.findFirst();

    if (!firstLeague) {
      console.error('❌ No hay ligas en la base de datos');
      return;
    }

    const currentJornada = firstLeague.currentJornada;
    console.log(`📊 Jornada actual: ${currentJornada}\n`);

    // Obtener todos los jugadores de Segunda División
    const allPlayers = await (prisma as any).playerSegunda.findMany({
      select: { id: true, name: true, position: true }
    });

    console.log(`👥 Total de jugadores de Segunda a procesar: ${allPlayers.length}\n`);

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

        console.log(`\n🔄 Procesando ${player.name}...`);

        for (let jornada = 1; jornada <= currentJornada; jornada++) {
          try {
            // Si NO existe en BD, carga desde API y lo guarda
            // Si YA existe en BD, lo usa directamente
            const stats = await getPlayerStatsForJornada(
              player.id,
              jornada,
              { forceRefresh: false } // Solo cargar de API si NO existe en BD
            );

            if (stats && stats.totalPoints !== null && stats.totalPoints !== undefined) {
              totalPoints += stats.totalPoints;
              jornadasJugadas++;
              console.log(`  J${jornada}: ${stats.totalPoints} pts`);
            } else {
              console.log(`  J${jornada}: Sin datos`);
            }
          } catch (error) {
            console.log(`  J${jornada}: Error - ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }

        // Obtener datos actuales del jugador de Segunda
        const currentPlayer = await (prisma as any).playerSegunda.findUnique({
          where: { id: player.id },
          select: { lastJornadaPoints: true, lastJornadaNumber: true }
        });

        // Verificar si necesita actualización
        const needsUpdate = 
          !currentPlayer || 
          currentPlayer.lastJornadaPoints !== totalPoints ||
          currentPlayer.lastJornadaNumber !== currentJornada;

        if (needsUpdate) {
          // Actualizar PlayerSegunda con puntos acumulados
          await (prisma as any).playerSegunda.update({
            where: { id: player.id },
            data: {
              lastJornadaPoints: totalPoints,
              lastJornadaNumber: currentJornada
            }
          });

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
