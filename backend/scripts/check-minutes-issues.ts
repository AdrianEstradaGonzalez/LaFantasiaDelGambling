import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlayersWithIssues() {
  try {
    // Buscar jugadores con 90 minutos en una jornada específica
    const lastJornada = await prisma.playerStats.findFirst({
      orderBy: { jornada: 'desc' },
      select: { jornada: true }
    });

    if (!lastJornada) {
      console.log('No hay estadísticas disponibles');
      return;
    }

    console.log(`=== REVISANDO JORNADA ${lastJornada.jornada} ===\n`);

    // Buscar todos los jugadores con 90 minutos en la última jornada
    const playersWithFullMinutes = await prisma.playerStats.findMany({
      where: {
        jornada: lastJornada.jornada,
        minutes: 90
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            teamName: true,
            position: true
          }
        }
      },
      orderBy: {
        totalPoints: 'asc' // Los que tienen 0 puntos con 90 minutos son sospechosos
      },
      take: 20
    });

    console.log(`\nJugadores con exactamente 90 minutos:`);
    console.log(`Total encontrados: ${playersWithFullMinutes.length}\n`);

    playersWithFullMinutes.forEach(stat => {
      const suspicious = stat.totalPoints === 0 || stat.totalPoints === 1;
      const flag = suspicious ? '🚨' : '✅';
      console.log(`${flag} ${stat.player.name} (${stat.player.teamName})`);
      console.log(`   Posición: ${stat.player.position}`);
      console.log(`   Minutos: ${stat.minutes}`);
      console.log(`   Puntos: ${stat.totalPoints}`);
      console.log(`   Desglose:`, stat.pointsBreakdown);
      console.log('');
    });

    // También buscar jugadores con 0 puntos pero más de 60 minutos
    console.log(`\n=== JUGADORES CON 0 PUNTOS Y MÁS DE 60 MINUTOS ===\n`);
    const suspiciousPlayers = await prisma.playerStats.findMany({
      where: {
        jornada: lastJornada.jornada,
        minutes: { gte: 60 },
        totalPoints: { lte: 1 }
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            teamName: true,
            position: true
          }
        }
      }
    });

    suspiciousPlayers.forEach((stat: any) => {
      console.log(`🔍 ${stat.player.name}`);
      console.log(`   Equipo: ${stat.player.teamName}`);
      console.log(`   Posición: ${stat.player.position}`);
      console.log(`   Minutos: ${stat.minutes}`);
      console.log(`   Puntos: ${stat.totalPoints}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlayersWithIssues();
