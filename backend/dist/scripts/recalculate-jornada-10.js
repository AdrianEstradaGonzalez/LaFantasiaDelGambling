import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function recalculateJornada10() {
    try {
        console.log('🔄 Recalculando estadísticas de la Jornada 10...\n');
        // Importar el servicio de actualización
        const { updateAllPlayersStatsForJornada } = await import('../src/services/playerStats.service');
        // Recargar estadísticas de la jornada 10
        console.log('📊 Cargando estadísticas desde la API...');
        await updateAllPlayersStatsForJornada(10);
        console.log('\n✅ Recálculo completado!');
        // Verificar Carlos Martín
        console.log('\n📋 Verificando Carlos Martín...');
        const player = await prisma.player.findFirst({
            where: {
                name: {
                    contains: 'Carlos Martín',
                    mode: 'insensitive'
                }
            }
        });
        if (player) {
            const stats = await prisma.playerStats.findFirst({
                where: {
                    playerId: player.id,
                    jornada: 10
                }
            });
            if (stats) {
                console.log(`\n${player.name}:`);
                console.log(`  Minutos: ${stats.minutes}`);
                console.log(`  Puntos: ${stats.totalPoints}`);
                console.log(`  Desglose:`, stats.pointsBreakdown);
            }
        }
        // Buscar otros jugadores que puedan tener el mismo problema
        console.log('\n🔍 Buscando otros jugadores con problemas corregidos...');
        const fixed = await prisma.playerStats.findMany({
            where: {
                jornada: 10,
                minutes: 0,
                totalPoints: 0
            },
            include: {
                player: {
                    select: {
                        name: true,
                        teamName: true
                    }
                }
            },
            take: 10
        });
        if (fixed.length > 0) {
            console.log(`\nJugadores con 0 minutos (correcto):`);
            fixed.forEach(s => {
                console.log(`  - ${s.player.name} (${s.player.teamName})`);
            });
        }
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
recalculateJornada10();
