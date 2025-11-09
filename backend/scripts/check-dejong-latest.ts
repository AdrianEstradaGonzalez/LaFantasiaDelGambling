import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDeJongLatest() {
  console.log('🔍 Buscando últimas stats de De Jong...\n');

  const deJong = await prisma.player.findFirst({
    where: {
      name: { contains: 'Jong' },
      teamName: { contains: 'Barcelona' }
    }
  });

  if (!deJong) {
    console.log('❌ No se encontró a De Jong');
    return;
  }

  console.log(`👤 ${deJong.name} (${deJong.teamName}) - ID: ${deJong.id}\n`);

  // Buscar TODAS sus stats recientes
  const allStats = await prisma.playerStats.findMany({
    where: {
      playerId: deJong.id,
      season: 2025
    },
    orderBy: {
      jornada: 'desc'
    },
    take: 5
  });

  console.log(`📋 Últimas 5 jornadas:\n`);
  
  for (const stat of allStats) {
    console.log(`Jornada ${stat.jornada}:`);
    console.log(`   Minutos: ${stat.minutes ?? 0}`);
    console.log(`   Amarillas: ${stat.yellowCards ?? 0}`);
    console.log(`   Rojas: ${stat.redCards ?? 0}`);
    console.log(`   Puntos: ${stat.totalPoints}`);
    console.log(`   Fixture ID: ${stat.fixtureId}`);
    console.log('');
  }

  await prisma.$disconnect();
}

checkDeJongLatest();
