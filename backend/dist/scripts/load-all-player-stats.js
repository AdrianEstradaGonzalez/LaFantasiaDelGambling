import { PrismaClient } from '@prisma/client';
import { PlayerStatsService } from '../src/services/playerStats.service.js';
const prisma = new PrismaClient();
/**
 * Script para cargar las puntuaciones de TODOS los jugadores para TODAS las jornadas
 * desde la API y guardarlas en la base de datos.
 *
 * Carga todas las jornadas (1 hasta la actual) para cada jugador que esté en Player
 * pero no tenga stats en PlayerStats.
 */
async function loadAllPlayerStats() {
    try {
        console.log('🚀 Iniciando carga de puntuaciones de todos los jugadores para todas las jornadas...\n');
        // Obtener la jornada actual de la liga
        const league = await prisma.league.findFirst({
            select: { currentJornada: true, jornadaStatus: true }
        });
        if (!league) {
            throw new Error('No se encontró ninguna liga en la base de datos');
        }
        const currentJornada = league.currentJornada;
        const season = Number(process.env.FOOTBALL_API_SEASON ?? 2025);
        console.log(`📅 Jornada actual: ${currentJornada}`);
        console.log(`🔒 Estado: ${league.jornadaStatus}`);
        console.log(`⚽ Temporada: ${season}\n`);
        // Obtener todos los jugadores
        const allPlayers = await prisma.player.findMany({
            select: { id: true, name: true, teamName: true }
        });
        console.log(`👥 Total de jugadores en BD: ${allPlayers.length}\n`);
        // Para cada jugador, verificar qué jornadas le faltan
        let totalStatsToLoad = 0;
        const playersWithMissingStats = [];
        console.log('🔍 Analizando jornadas faltantes por jugador...\n');
        for (const player of allPlayers) {
            // Obtener stats existentes para este jugador
            const existingStats = await prisma.playerStats.findMany({
                where: {
                    playerId: player.id,
                    season: season
                },
                select: { jornada: true }
            });
            const existingJornadas = new Set(existingStats.map(s => s.jornada));
            const missingJornadas = [];
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
        console.log('━'.repeat(60));
        console.log('Iniciando carga de estadísticas...');
        console.log('━'.repeat(60));
        for (const { player, missingJornadas } of playersWithMissingStats) {
            console.log(`\n👤 ${player.name} (${player.teamName}) - ${missingJornadas.length} jornadas faltantes`);
            console.log(`   Jornadas: ${missingJornadas.join(', ')}`);
            for (const jornada of missingJornadas) {
                processed++;
                const progress = `[${processed}/${totalStatsToLoad}]`;
                try {
                    console.log(`   ${progress} J${jornada}: Cargando...`);
                    // Llamar al servicio para obtener y guardar las stats
                    const stats = await PlayerStatsService.getPlayerStatsForJornada(player.id, jornada, { season, forceRefresh: true });
                    if (stats && stats.totalPoints !== null) {
                        loaded++;
                        console.log(`   ${progress} J${jornada}: ✅ ${stats.totalPoints} puntos`);
                    }
                    else {
                        skipped++;
                        console.log(`   ${progress} J${jornada}: ⚠️  Sin datos (no jugó)`);
                    }
                    // Pequeño delay para no saturar la API
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                catch (error) {
                    failed++;
                    console.error(`   ${progress} J${jornada}: ❌ Error: ${error.message}`);
                    // Delay más largo en caso de error (posible rate limit)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        console.log('\n' + '━'.repeat(60));
        console.log('📊 RESUMEN FINAL');
        console.log('━'.repeat(60));
        console.log(`✅ Cargados exitosamente: ${loaded}`);
        console.log(`⚠️  Sin datos (no jugaron): ${skipped}`);
        console.log(`❌ Errores: ${failed}`);
        console.log(`📈 Total procesados: ${loaded + skipped + failed}/${totalStatsToLoad}`);
        console.log(`👥 Jugadores procesados: ${playersWithMissingStats.length}/${allPlayers.length}`);
        console.log('━'.repeat(60));
    }
    catch (error) {
        console.error('❌ Error fatal en el script:', error);
        throw error;
    }
    finally {
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
