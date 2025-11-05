import { PrismaClient } from '@prisma/client';
import { PlayerStatsService } from '../src/services/playerStats.service.js';

const prisma = new PrismaClient();

/**
 * Script para cargar las puntuaciones de TODOS los jugadores de la PREMIER LEAGUE
 * para TODAS las jornadas desde la API y guardarlas en la base de datos.
 * 
 * Carga todas las jornadas (1 hasta la actual) para cada jugador que esté en PlayerPremier
 * pero no tenga stats en PlayerPremierStats.
 */
async function loadAllPremierStats() {
  try {
    console.log('🚀 Iniciando carga de puntuaciones de jugadores de PREMIER LEAGUE...\n');

    const currentJornada = 11; // Ajustar según la jornada actual de Premier League
    const season = 2025; // Premier League temporada 2024-2025 (API usa año de inicio)
    
    console.log(`📅 Jornada actual Premier League: ${currentJornada}`);
    console.log(`⚽ Temporada: ${season} (2024-2025)\n`);
    console.log(`⚽ Temporada: ${season}\n`);

    // Obtener todos los jugadores de la Premier League
    const allPlayers = await (prisma as any).playerPremier.findMany({
      select: { id: true, name: true, teamName: true }
    });

    console.log(`👥 Total de jugadores Premier en BD: ${allPlayers.length}\n`);

    // Para cada jugador, verificar qué jornadas le faltan
    let totalStatsToLoad = 0;
    const playersWithMissingStats: Array<{
      player: { id: number; name: string; teamName: string };
      missingJornadas: number[];
    }> = [];

    console.log('🔍 Analizando jornadas faltantes por jugador...\n');

    for (const player of allPlayers) {
      // Obtener stats existentes para este jugador en PlayerPremierStats
      const existingStats = await (prisma as any).playerPremierStats.findMany({
        where: {
          playerId: player.id,
          season: season
        },
        select: { jornada: true }
      });

      const existingJornadas = new Set(existingStats.map((s: any) => s.jornada));
      const missingJornadas: number[] = [];

      // Verificar qué jornadas faltan (de 1 hasta la actual)
      for (let j = 1; j <= currentJornada; j++) {
        if (!existingJornadas.has(j)) {
          missingJornadas.push(j);
        }
      }

      if (missingJornadas.length > 0) {
        playersWithMissingStats.push({ player, missingJornadas });
        totalStatsToLoad += missingJornadas.length;
      }
    }

    console.log(`📊 Resumen del análisis:`);
    console.log(`   - Jugadores con stats completas: ${allPlayers.length - playersWithMissingStats.length}`);
    console.log(`   - Jugadores con stats faltantes: ${playersWithMissingStats.length}`);
    console.log(`   - Total de stats a cargar: ${totalStatsToLoad}\n`);

    if (totalStatsToLoad === 0) {
      console.log('✨ Todos los jugadores tienen stats completas para todas las jornadas');
      return;
    }

    // Cargar stats para cada jugador y cada jornada faltante
    let loaded = 0;
    let failed = 0;
    let skipped = 0;
    let processed = 0;
    const failedPlayers = new Set<number>(); // Jugadores que fallan en la primera jornada (no existen)

    console.log('━'.repeat(60));
    console.log('Iniciando carga de estadísticas...');
    console.log('━'.repeat(60));

    for (const { player, missingJornadas } of playersWithMissingStats) {
      // Si el jugador ya falló antes (no existe en API), saltar todas sus jornadas
      if (failedPlayers.has(player.id)) {
        processed += missingJornadas.length;
        skipped += missingJornadas.length;
        continue;
      }

      console.log(`\n👤 ${player.name} (${player.teamName}) - ${missingJornadas.length} jornadas faltantes`);
      console.log(`   Jornadas: ${missingJornadas.join(', ')}`);

      let playerHasData = false; // Para detectar si el jugador existe en la API

      for (const jornada of missingJornadas) {
        processed++;
        const progress = `[${processed}/${totalStatsToLoad}]`;

        try {
          console.log(`   ${progress} J${jornada}: Cargando...`);

          // Llamar al servicio para obtener y guardar las stats
          const stats = await PlayerStatsService.getPlayerStatsForJornada(
            player.id,
            jornada,
            { season, forceRefresh: true, division: 'premier' }
          );

          if (stats && stats.totalPoints !== null) {
            playerHasData = true; // El jugador existe en la API
            if (stats.totalPoints > 0) {
              loaded++;
              console.log(`   ${progress} J${jornada}: ✅ ${stats.totalPoints} puntos`);
            } else {
              skipped++;
              console.log(`   ${progress} J${jornada}: ⚠️  Sin datos (no jugó)`);
            }
          } else {
            skipped++;
            console.log(`   ${progress} J${jornada}: ⚠️  Sin datos (no jugó)`);
          }

          // Pequeño delay para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error: any) {
          // Si falla en la primera jornada, probablemente el jugador no existe
          if (jornada === missingJornadas[0] && error.message.includes('No se encontró ninguna versión del jugador')) {
            failedPlayers.add(player.id);
            console.error(`   ${progress} J${jornada}: ⚠️  Jugador no existe en API - saltando resto de jornadas`);
            // Contar el resto de jornadas como skipped
            const remainingJornadas = missingJornadas.length - 1;
            skipped += remainingJornadas;
            processed += remainingJornadas;
            break; // Salir del loop de jornadas para este jugador
          }
          
          failed++;
          console.error(`   ${progress} J${jornada}: ❌ Error: ${error.message}`);
          
          // Delay más largo en caso de error (posible rate limit)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📊 RESUMEN FINAL - Fase 1: Carga de estadísticas por jornada');
    console.log('━'.repeat(60));
    console.log(`✅ Cargados exitosamente: ${loaded}`);
    console.log(`⚠️  Sin datos (no jugaron): ${skipped}`);
    console.log(`❌ Errores: ${failed}`);
    console.log(`📈 Total procesados: ${loaded + skipped + failed}/${totalStatsToLoad}`);
    console.log(`👥 Jugadores procesados: ${playersWithMissingStats.length}/${allPlayers.length}`);
    console.log('━'.repeat(60));

    // ====================================================================
    // FASE 2: Actualizar lastJornadaPoints con la suma total de todas las jornadas
    // ====================================================================
    console.log('\n🔄 Iniciando Fase 2: Actualización de puntos totales en PlayerPremier...\n');
    
    let playersUpdated = 0;
    let playersWithoutStats = 0;

    for (const player of allPlayers) {
      try {
        // Obtener todas las stats del jugador
        const allStats = await (prisma as any).playerPremierStats.findMany({
          where: {
            playerId: player.id,
            season: season
          },
          select: { totalPoints: true, jornada: true }
        });

        if (allStats.length === 0) {
          playersWithoutStats++;
          console.log(`⚠️  ${player.name}: Sin estadísticas para actualizar`);
          continue;
        }

        // Calcular la suma total de puntos
        const totalPoints = allStats.reduce((sum: number, stat: any) => sum + (stat.totalPoints || 0), 0);
        
        // Encontrar la jornada más reciente
        const lastJornada = Math.max(...allStats.map((s: any) => s.jornada));

        // Actualizar el jugador con la suma total de puntos
        await (prisma as any).playerPremier.update({
          where: { id: player.id },
          data: {
            lastJornadaPoints: totalPoints,  // Suma total de todos los puntos
            lastJornadaNumber: lastJornada,  // Número de la última jornada jugada
          }
        });

        playersUpdated++;
        console.log(`✅ ${player.name}: ${totalPoints} puntos totales | Última jornada: J${lastJornada}`);

      } catch (error: any) {
        console.error(`❌ Error actualizando ${player.name}: ${error.message}`);
      }
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📊 RESUMEN FINAL - Fase 2: Actualización de puntos totales');
    console.log('━'.repeat(60));
    console.log(`✅ Jugadores actualizados: ${playersUpdated}`);
    console.log(`⚠️  Jugadores sin stats: ${playersWithoutStats}`);
    console.log(`👥 Total de jugadores: ${allPlayers.length}`);
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('❌ Error fatal en el script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
loadAllPremierStats()
  .then(() => {
    console.log('\n✨ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error al ejecutar el script:', error);
    process.exit(1);
  });
