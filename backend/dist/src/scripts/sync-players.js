import { PlayerService } from '../services/player.service';
/**
 * Script para sincronizar jugadores desde la API de LaLiga
 * Ejecutar con: npm run sync-players
 */
async function syncPlayers() {
    try {
        console.log('🚀 Iniciando sincronización de jugadores desde la API de LaLiga...\n');
        const result = await PlayerService.syncPlayersFromAPI();
        console.log('\n📊 Resumen de la sincronización:');
        console.log('-----------------------------------');
        console.log(`✅ Jugadores añadidos: ${result.playersAdded}`);
        console.log(`🔄 Jugadores actualizados: ${result.playersUpdated}`);
        console.log(`❌ Errores: ${result.errors}`);
        console.log(`🎉 Estado: ${result.success ? 'ÉXITO' : 'FALLIDO'}`);
        console.log('-----------------------------------\n');
        // Obtener estadísticas
        const stats = await PlayerService.getStats();
        console.log('📈 Estadísticas de jugadores en la base de datos:');
        console.log('-----------------------------------');
        console.log(`Total de jugadores: ${stats.total}`);
        console.log(`Precio promedio: ${Math.round(stats.average)}M`);
        console.log(`Precio mínimo: ${stats.min}M`);
        console.log(`Precio máximo: ${stats.max}M`);
        console.log('-----------------------------------\n');
        console.log('✨ Sincronización completada exitosamente');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error fatal durante la sincronización:', error);
        process.exit(1);
    }
}
// Ejecutar la sincronización
syncPlayers();
