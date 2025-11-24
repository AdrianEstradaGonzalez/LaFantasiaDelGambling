import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTrossardPoints() {
  try {
    // Buscar a Trossard en PlayerPremier
    const trossard = await (prisma as any).playerPremier.findFirst({
      where: {
        name: {
          contains: 'Trossard',
          mode: 'insensitive'
        }
      }
    });

    if (!trossard) {
      console.log('❌ Trossard no encontrado en PlayerPremier');
      return;
    }

    console.log('\n✅ Jugador encontrado:');
    console.log(`   ID: ${trossard.id}`);
    console.log(`   Nombre: ${trossard.name}`);
    console.log(`   Posición: ${trossard.position}\n`);

    // Obtener estadísticas de J11 y J12
    const stats = await (prisma as any).playerPremierStats.findMany({
      where: {
        playerId: trossard.id,
        jornada: {
          in: [11, 12]
        },
        season: 2025
      },
      orderBy: {
        jornada: 'asc'
      }
    });

    console.log(`📊 Estadísticas encontradas: ${stats.length}\n`);

    for (const stat of stats) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🏟️  Jornada ${stat.jornada}`);
      console.log(`   Fixture ID: ${stat.fixtureId}`);
      console.log(`   Minutos: ${stat.minutes}`);
      console.log(`   Goles: ${stat.goals}`);
      console.log(`   Asistencias: ${stat.assists}`);
      console.log(`   ⭐ PUNTOS TOTALES: ${stat.totalPoints}`);
      console.log(`   Actualizado: ${stat.updatedAt}\n`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTrossardPoints();
