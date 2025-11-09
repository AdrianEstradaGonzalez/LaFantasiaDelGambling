import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findDeJong() {
  console.log('🔍 Buscando a De Jong del Barcelona...\n');

  const players = await prisma.player.findMany({
    where: {
      name: {
        contains: 'Jong'
      },
      teamName: {
        contains: 'Barcelona'
      }
    }
  });

  console.log(`📊 Encontrados ${players.length} jugadores:\n`);
  
  for (const player of players) {
    console.log(`\n👤 ${player.name} (${player.teamName}) - ID: ${player.id}`);
    
    // Buscar sus stats
    const stats = await prisma.playerStats.findMany({
      where: {
        playerId: player.id,
        season: 2025,
        OR: [
          { yellowCards: { gt: 0 } },
          { redCards: { gt: 0 } }
        ]
      },
      orderBy: {
        jornada: 'desc'
      }
    });

    console.log(`   📋 Stats con tarjetas (${stats.length}):`);
    
    for (const stat of stats) {
      console.log(`   Jornada ${stat.jornada}: ${stat.yellowCards ?? 0} amarillas, ${stat.redCards ?? 0} rojas - ${stat.minutes ?? 0} mins`);
    }
  }

  await prisma.$disconnect();
}

findDeJong();
