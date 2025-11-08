import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv[2];
  const jornada = arg ? parseInt(arg, 10) : undefined;
  if (!jornada) {
    console.log('Uso: npx tsx scripts/recompute-league-member-points-jornada.ts <jornada>');
    process.exit(1);
  }

  console.log(`🔁 Recomputing league member points for jornada ${jornada}`);

  const season = Number(process.env.FOOTBALL_API_SEASON ?? 2025);

  // Get all leagues (optionally filter by division if needed)
  const leagues = await prisma.league.findMany({ include: { members: true } });

  let totalUpdated = 0;

  for (const league of leagues) {
    console.log(`\nProcessing league ${league.name} (${league.id}) members: ${league.members.length}`);
    for (const member of league.members) {
      // Get squad for this member in this league
      const squad = await prisma.squad.findUnique({
        where: { userId_leagueId: { userId: member.userId, leagueId: member.leagueId } },
        include: { players: { select: { playerId: true, isCaptain: true } } },
      });

      if (!squad) {
        // No squad -> 0 points
        await prisma.leagueMember.update({ where: { leagueId_userId: { leagueId: member.leagueId, userId: member.userId } }, data: { points: 0 } });
        continue;
      }

      let totalPoints = 0;

      for (const p of squad.players) {
        const stat = await prisma.playerStats.findUnique({
          where: { playerId_jornada_season: { playerId: p.playerId, jornada, season } },
          select: { totalPoints: true },
        });
        if (stat && typeof stat.totalPoints === 'number') {
          totalPoints += p.isCaptain ? stat.totalPoints * 2 : stat.totalPoints;
        }
      }

      await prisma.leagueMember.update({
        where: { leagueId_userId: { leagueId: member.leagueId, userId: member.userId } },
        data: { points: totalPoints },
      });

      totalUpdated++;
      console.log(`  Updated member ${member.userId} -> ${totalPoints} pts`);
    }
  }

  console.log(`\n✅ Done. Updated points for ${totalUpdated} league members`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
