import { PrismaClient } from '@prisma/client';
import { PlayerStatsService } from '../src/services/playerStats.service.js';

const prisma = new PrismaClient();

/**
 * Script para cargar las puntuaciones de TODOS los jugadores desde la API
 * y guardarlas en la base de datos.
 * 
 * Carga todos los jugadores que no tengan stats en BD para la jornada actual.
 */
async function loadAllPlayerStats() {
  try {
    console.log('🚀 Iniciando carga de puntuaciones de todos los jugadores...\n');

    // Obtener la jornada actual de la liga
    const league = await prisma.league.findFirst({
      select: { currentJornada: true, jornadaStatus: true }
    });

    if (!league) {
      throw new Error('No se encontró ninguna liga en la base de datos');
    }

    const currentJornada = league.currentJornada;
    console.log(`📅 Jornada actual: ${currentJornada}`);
    console.log(`🔒 Estado: ${league.jornadaStatus}\n`);

    // Obtener todos los jugadores
    const allPlayers = await prisma.player.findMany({
      select: { id: true, name: true, teamName: true }
    });

    console.log(`👥 Total de jugadores en BD: ${allPlayers.length}\n`);

    // Obtener jugadores que YA tienen stats para esta jornada
    const existingStats = await prisma.playerStats.findMany({
      where: {
        jornada: currentJornada,
        season: Number(process.env.FOOTBALL_API_SEASON ?? 2025)
      },
      select: { playerId: true }
    });

    const playersWithStats = new Set(existingStats.map(s => s.playerId));
    console.log(`✅ Jugadores con stats ya cargadas: ${playersWithStats.size}`);

    // Filtrar jugadores que NO tienen stats
    const playersToLoad = allPlayers.filter(p => !playersWithStats.has(p.id));
    console.log(`📥 Jugadores a cargar: ${playersToLoad.length}\n`);

    if (playersToLoad.length === 0) {
      console.log('✨ Todos los jugadores ya tienen stats cargadas para esta jornada');
      return;
    }

    // Cargar stats para cada jugador
    let loaded = 0;
    let failed = 0;
    let skipped = 0;

    console.log('━'.repeat(60));
    console.log('Iniciando carga de estadísticas...');
    console.log('━'.repeat(60));

    for (let i = 0; i < playersToLoad.length; i++) {
      const player = playersToLoad[i];
      const progress = `[${i + 1}/${playersToLoad.length}]`;

      try {
        console.log(`${progress} 🔄 Cargando: ${player.name} (${player.teamName})`);

        // Llamar al servicio para obtener y guardar las stats
        const stats = await PlayerStatsService.getPlayerStatsForJornada(
          player.id,
          currentJornada,
          { forceRefresh: true }
        );

        if (stats && stats.totalPoints !== null) {
          loaded++;
          console.log(`${progress} ✅ ${player.name}: ${stats.totalPoints} puntos`);
        } else {
          skipped++;
          console.log(`${progress} ⚠️  ${player.name}: Sin datos (no jugó)`);
        }

        // Pequeño delay para no saturar la API
        if (i < playersToLoad.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error: any) {
        failed++;
        console.error(`${progress} ❌ Error en ${player.name}:`, error.message);
        
        // Delay más largo en caso de error (posible rate limit)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📊 RESUMEN FINAL');
    console.log('━'.repeat(60));
    console.log(`✅ Cargados exitosamente: ${loaded}`);
    console.log(`⚠️  Sin datos (no jugaron): ${skipped}`);
    console.log(`❌ Errores: ${failed}`);
    console.log(`📈 Total procesados: ${loaded + skipped + failed}/${playersToLoad.length}`);
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('❌ Error fatal en el script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
loadAllPlayerStats()
  .then(() => {
    console.log('\n✨ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error al ejecutar el script:', error);
    process.exit(1);
  });
