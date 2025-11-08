import { PrismaClient, Prisma } from '@prisma/client';
import { calculatePlayerPoints, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv[2];
  const jornada = arg ? parseInt(arg, 10) : undefined;
  if (!jornada) {
    console.log('Uso: npx tsx scripts/backfill-defender-conceded-from-db-jornada.ts <jornada>');
    process.exit(1);
  }

  console.log(`🔁 Backfill defenders conceded from DB for jornada ${jornada}`);

  // Get distinct fixtureId values for the jornada
  const fixtures = await prisma.playerStats.findMany({
    where: { jornada },
    distinct: ['fixtureId'],
    select: { fixtureId: true },
  });

  let totalUpdated = 0;

  for (const f of fixtures) {
    const fixtureId = f.fixtureId;
    if (!fixtureId) continue;

    // compute goals per team in this fixture from player_stats
    const goalsByTeam = await prisma.playerStats.groupBy({
      by: ['teamId'],
      where: { fixtureId },
      _sum: { goals: true },
    });

    const goalsMap: Record<number, number> = {};
    for (const g of goalsByTeam) {
      if (g.teamId == null) continue;
      goalsMap[g.teamId] = (g._sum.goals ?? 0) as number;
    }

    // For each team in this fixture, determine conceded = sum of goals of other teams
    const teamIds = Object.keys(goalsMap).map((k) => parseInt(k, 10));
    for (const teamId of teamIds) {
      const conceded = teamIds.reduce((acc, t) => (t === teamId ? acc : acc + (goalsMap[t] || 0)), 0);

      // find defender rows for this fixture/team
      const defenderRows = await prisma.playerStats.findMany({
        where: { fixtureId, teamId, minutes: { gt: 0 } },
        select: { id: true, playerId: true, goals: true, conceded: true, pointsBreakdown: true, minutes: true, position: true },
      });

      for (const row of defenderRows) {
        try {
          // check player's position to be safe
          const player = await prisma.player.findUnique({ where: { id: row.playerId }, select: { position: true } });
          if (!player) continue;
          const role = normalizeRole(player.position || '') as Role;
          if (role !== 'Defender') continue;

          // reconstruct raw stats from row
          const raw: any = {
            games: { minutes: row.minutes ?? 0, position: row.position ?? null },
            goals: { total: row.goals ?? 0, conceded },
            goalkeeper: { conceded },
          };

          const result = calculatePlayerPoints(raw, role);

          await prisma.playerStats.update({
            where: { id: row.id },
            data: {
              conceded,
              pointsBreakdown: result.breakdown && result.breakdown.length ? (result.breakdown as any) : Prisma.JsonNull,
              totalPoints: Math.trunc(result.total),
              updatedAt: new Date(),
            },
          });

          totalUpdated++;
        } catch (err: any) {
          console.error('Error updating row', row.id, row.playerId, err.message || err);
        }
      }
    }
  }

  console.log(`✅ Done. Total defender rows updated: ${totalUpdated}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
