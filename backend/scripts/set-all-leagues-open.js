import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAllLeaguesOpen() {
  try {
    console.log('🔓 Actualizando todas las ligas a estado "open"...\n');

    const result = await prisma.league.updateMany({
      data: {
        jornadaStatus: 'open'
      }
    });

    console.log(`✅ ${result.count} ligas actualizadas a estado "open"\n`);

    // Mostrar estado de las ligas
    const leagues = await prisma.league.findMany({
      select: {
        id: true,
        name: true,
        currentJornada: true,
        jornadaStatus: true,
        division: true
      }
    });

    console.log('📋 Estado de las ligas:');
    leagues.forEach(league => {
      console.log(`  - ${league.name} (${league.division}): Jornada ${league.currentJornada} - ${league.jornadaStatus}`);
    });
    console.log();

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAllLeaguesOpen();
