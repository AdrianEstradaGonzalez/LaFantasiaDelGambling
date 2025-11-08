import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Restaura los puntos de member.points desde pointsPerJornada["11"]
 * para todas las ligas de primera
 */

async function restoreFromPointsPerJornada() {
  console.log('🔄 Restaurando puntos históricos desde pointsPerJornada["11"]...\n');

  const leagues = await prisma.league.findMany({
    where: { division: 'primera' },
    include: {
      members: {
        include: {
          user: {
            select: { name: true }
          }
        }
      }
    }
  });

  let totalUpdated = 0;

  for (const league of leagues) {
    console.log(`\n🏆 Liga: ${league.name}`);
    
    for (const member of league.members) {
      const ppj = member.pointsPerJornada as any;
      const j11Points = ppj?.['11'] || 0;
      
      // Actualizar member.points con el valor de J11
      await prisma.leagueMember.update({
        where: {
          leagueId_userId: {
            leagueId: league.id,
            userId: member.userId
          }
        },
        data: { points: j11Points }
      });

      totalUpdated++;
      console.log(`  ✅ ${member.user.name}: ${j11Points} pts (restaurado de J11)`);
    }
  }

  console.log(`\n\n✅ ${totalUpdated} members actualizados con puntos de jornada 11`);
}

restoreFromPointsPerJornada()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
