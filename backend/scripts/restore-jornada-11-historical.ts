import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreJornada11Historical() {
  console.log('📊 Recalculando puntos históricos hasta jornada 11...\n');

  // Obtener todas las ligas de primera
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

  console.log(`Encontradas ${leagues.length} ligas primera\n`);

  let totalUpdated = 0;

  for (const league of leagues) {
    console.log(`\n🏆 Liga: ${league.name} (${league.id})`);
    
    for (const member of league.members) {
      // Obtener la plantilla actual del usuario
      const squad = await prisma.squad.findFirst({
        where: {
          leagueId: league.id,
          userId: member.userId
        },
        include: {
          players: true
        }
      });

      if (!squad) {
        console.log(`  - ${member.user.name || 'Unknown'}: 0 pts (sin plantilla)`);
        
        // Actualizar a 0 si no tiene plantilla
        await prisma.leagueMember.update({
          where: {
            leagueId_userId: {
              leagueId: league.id,
              userId: member.userId
            }
          },
          data: { points: 0 }
        });
        totalUpdated++;
        continue;
      }

      // Obtener los IDs de los jugadores de la plantilla
      const playerIds = squad.players.map((p: any) => p.playerId);

      // Calcular puntos totales de jornadas 1-11 para estos jugadores
      const stats = await prisma.playerStats.findMany({
        where: {
          playerId: { in: playerIds },
          jornada: { lte: 11 },
          season: 2025
        },
        select: {
          playerId: true,
          jornada: true,
          totalPoints: true
        }
      });

      const historicalTotal = stats.reduce((sum: number, stat: any) => sum + stat.totalPoints, 0);

      // Actualizar member.points con el histórico
      await prisma.leagueMember.update({
        where: {
          leagueId_userId: {
            leagueId: league.id,
            userId: member.userId
          }
        },
        data: { points: historicalTotal }
      });

      totalUpdated++;
      console.log(`  - ${member.user.name || 'Unknown'}: ${historicalTotal} pts (actualizado)`);
    }
  }

  console.log(`\n\n✅ ${totalUpdated} members actualizados con puntos históricos hasta jornada 11`);
}

restoreJornada11Historical()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
