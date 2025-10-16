import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseState() {
  try {
    console.log('\n🔍 Verificando estado de la base de datos...\n');

    // 1. Verificar ligas
    const leagues = await prisma.league.findMany({
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    console.log('📋 LIGAS:');
    for (const league of leagues) {
      console.log(`  - ${league.name} (${league.id}): ${league._count.members} miembros`);
    }

    // 2. Verificar apuestas por jornada
    console.log('\n🎲 APUESTAS POR JORNADA:');
    for (let j = 1; j <= 15; j++) {
      const bets = await prisma.bet.findMany({
        where: { jornada: j },
        include: {
          leagueMember: {
            include: {
              user: true,
            },
          },
        },
      });

      if (bets.length > 0) {
        console.log(`\n  Jornada ${j}: ${bets.length} apuestas`);
        for (const bet of bets) {
          console.log(
            `    - Usuario ${bet.leagueMember.user.name}: ${bet.betType} - ${bet.betLabel} ` +
            `(${bet.amount}M × ${bet.odd}) - Status: ${bet.status}`
          );
        }
      }
    }

    // 3. Verificar plantillas
    console.log('\n\n⚽ PLANTILLAS:');
    const squads = await prisma.squad.findMany({
      include: {
        players: true,
        user: true,
        league: true,
      },
    });

    for (const squad of squads) {
      console.log(
        `  - Usuario ${squad.user.name} en liga ${squad.league.name}: ` +
        `${squad.players.length} jugadores`
      );
      
      if (squad.players.length > 0) {
        console.log(`    Jugadores:`);
        for (const player of squad.players) {
          console.log(`      - ${player.playerName} (${player.role})`);
        }
      }
    }

    // 4. Verificar presupuestos de miembros
    console.log('\n\n💰 PRESUPUESTOS Y PUNTOS:');
    const members = await prisma.leagueMember.findMany({
      include: {
        user: true,
        league: true,
      },
    });

    for (const member of members) {
      console.log(
        `  - ${member.user.name} en ${member.league.name}:\n` +
        `    Budget: ${member.budget}M | Betting: ${member.bettingBudget}M | Puntos: ${member.points}`
      );
    }

    console.log('\n✅ Verificación completada\n');
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseState();
