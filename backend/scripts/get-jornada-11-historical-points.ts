import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getJornada11HistoricalPoints() {
  console.log('📊 Calculando puntos históricos acumulados hasta jornada 11...\n');

  // Obtener todas las ligas de primera
  const leagues = await prisma.league.findMany({
    where: { division: 'primera' },
    include: {
      members: {
        include: {
          user: {
            select: { name: true }
          },
          lineup: {
            where: { jornadaNumber: { lte: 11 } }, // Jornadas 1-11
            include: {
              players: {
                include: {
                  playerStats: {
                    where: {
                      jornadaNumber: { lte: 11 }
                    },
                    select: {
                      jornadaNumber: true,
                      totalPoints: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

async function getJornada11HistoricalPoints() {
  console.log('📊 Calculando puntos históricos acumulados hasta jornada 11...\n');

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

  const updates: Array<{ leagueId: string; userId: string; username: string; historicalPoints: number }> = [];

  for (const league of leagues) {
    console.log(`\n🏆 Liga: ${league.name} (${league.id})`);
    
    for (const member of league.members) {
      // Obtener todas las plantillas del usuario en esta liga para jornadas 1-11
      const squads = await prisma.squad.findMany({
        where: {
          leagueId: league.id,
          userId: member.userId,
          jornadaNumber: { lte: 11 }
        },
        include: {
          players: {
            include: {
              player: {
                include: {
                  playerStats: {
                    where: {
                      jornadaNumber: { lte: 11 }
                    },
                    select: {
                      jornadaNumber: true,
                      totalPoints: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Calcular puntos totales de jornadas 1-11
      let historicalTotal = 0;

      for (const squad of squads) {
        for (const squadPlayer of squad.players) {
          const statsSum = squadPlayer.player.playerStats.reduce((sum: number, stat: any) => sum + stat.totalPoints, 0);
          historicalTotal += statsSum;
        }
      }

      updates.push({
        leagueId: league.id,
        userId: member.userId,
        username: member.user.name || 'Unknown',
        historicalPoints: historicalTotal
      });

      console.log(`  - ${member.user.name || 'Unknown'}: ${historicalTotal} pts (jornadas 1-11)`);
    }
  }

  console.log('\n\n📝 Resumen de actualizaciones necesarias:\n');
  
  const updateStatements = updates.map(u => 
    `UPDATE "LeagueMember" SET points = ${u.historicalPoints} WHERE "leagueId" = '${u.leagueId}' AND "userId" = '${u.userId}'; -- ${u.username}`
  ).join('\n');

  console.log(updateStatements);

  console.log('\n\n✅ Script de SQL generado arriba ☝️');
}

getJornada11HistoricalPoints()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
