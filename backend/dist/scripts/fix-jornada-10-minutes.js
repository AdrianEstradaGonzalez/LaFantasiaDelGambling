import { PrismaClient } from '@prisma/client';
import { PlayerStatsService } from '../src/services/playerStats.service.js';
const prisma = new PrismaClient();
async function recalculateJornada10() {
    try {
        console.log('🔄 Recalculando estadísticas de la Jornada 10...\n');
        const jornada = 10;
        const season = Number(process.env.FOOTBALL_API_SEASON ?? 2024);
        console.log(`📅 Jornada: ${jornada}`);
        console.log(`⚽ Temporada: ${season}\n`);
        // Llamar al servicio de actualización
        await PlayerStatsService.updateAllPlayersStatsForJornada(jornada);
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
                console.log(`\n✅ ${player.name}:`);
                console.log(`  Minutos: ${stats.minutes}`);
                console.log(`  Puntos: ${stats.totalPoints}`);
                console.log(`  Desglose:`, stats.pointsBreakdown);
            }
        }
        // Verificar jugadores con problemas corregidos
        console.log('\n🔍 Jugadores que tenían 90 minutos incorrectamente...');
        const potentialIssues = await prisma.playerStats.findMany({
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
        if (potentialIssues.length > 0) {
            console.log(`\n✅ Jugadores con 0 minutos (correcto - no jugaron):`);
            potentialIssues.forEach(s => {
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
