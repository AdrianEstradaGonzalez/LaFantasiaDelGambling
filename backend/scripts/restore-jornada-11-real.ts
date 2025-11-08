import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreJornada11Real() {
  console.log('📊 Calculando puntos REALES de jornada 11...\n');

  // Liga CBO creada el 31 de octubre, solo jornada 11
  const leagueId = 'cmhe4097k00518kc4tsms6h5g';

  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    include: {
      user: { select: { name: true } }
    }
  });

  console.log(`Liga CBO: ${members.length} miembros\n`);

  for (const member of members) {
    // Obtener la plantilla del usuario
    const squad = await prisma.squad.findFirst({
      where: {
        leagueId,
        userId: member.userId
      },
      include: {
        players: true
      }
    });

    if (!squad) {
      console.log(`  - ${member.user.name || 'Unknown'}: 0 pts (sin plantilla)`);
      await prisma.leagueMember.update({
        where: {
          leagueId_userId: {
            leagueId,
            userId: member.userId
          }
        },
        data: { points: 0 }
      });
      continue;
    }

    const playerIds = squad.players.map((p: any) => p.playerId);

    // Obtener SOLO los stats de la jornada 11
    const stats = await prisma.playerStats.findMany({
      where: {
        playerId: { in: playerIds },
        jornada: 11,
        season: 2025
      },
      select: {
        playerId: true,
        totalPoints: true
      }
    });

    const jornada11Points = stats.reduce((sum: number, stat: any) => sum + stat.totalPoints, 0);

    // Actualizar member.points con los puntos de jornada 11
    await prisma.leagueMember.update({
      where: {
        leagueId_userId: {
          leagueId,
          userId: member.userId
        }
      },
      data: { points: jornada11Points }
    });

    console.log(`  - ${member.user.name || 'Unknown'}: ${jornada11Points} pts jornada 11 (${stats.length} jugadores)`);
  }

  console.log('\n✅ Puntos de jornada 11 restaurados correctamente');
}

restoreJornada11Real()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
