import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCarlosMartin() {
  try {
    // Buscar jugador Carlos Martín
    const players = await prisma.player.findMany({
      where: {
        name: {
          contains: 'Carlos Martin',
          mode: 'insensitive'
        }
      }
    });

    console.log('=== JUGADORES ENCONTRADOS ===');
    console.log(JSON.stringify(players, null, 2));

    if (players.length > 0) {
      const playerId = players[0].id;
      console.log(`\n=== ESTADÍSTICAS DE ${players[0].name} (ID: ${playerId}) ===`);
      
      // Obtener estadísticas recientes
      const stats = await prisma.playerStat.findMany({
        where: { playerId },
        orderBy: { jornada: 'desc' },
        take: 5
      });

      console.log('\nÚltimas 5 jornadas:');
      stats.forEach(stat => {
        console.log(`\nJornada ${stat.jornada}:`);
        console.log(`  - Minutos: ${stat.minutes}`);
        console.log(`  - Puntos: ${stat.totalPoints}`);
        console.log(`  - Desglose:`, stat.pointsBreakdown);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCarlosMartin();
