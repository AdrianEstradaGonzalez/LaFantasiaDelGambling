import { PrismaClient, Prisma } from '@prisma/client';
import { calculatePlayerPoints, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv[2];
  const jornada = arg ? parseInt(arg, 10) : undefined;

  if (!jornada) {
    console.log('Uso: npx tsx scripts/backfill-pointsBreakdown-jornada.ts <jornada>');
    process.exit(1);
  }

  console.log(`🔁 Backfill pointsBreakdown for jornada ${jornada}`);

  // Use raw SQL to select rows with NULL JSON (Prisma's JSON filters are awkward)
  const rows: any[] = await prisma.$queryRaw`
    SELECT * FROM player_stats WHERE jornada = ${jornada} AND season = 2025 AND "pointsBreakdown" IS NULL
  `;

  console.log(`Found ${rows.length} player_stats rows with NULL pointsBreakdown`);

  let updated = 0;

  for (const row of rows) {
    // Reconstruct an API-like stats object from the flat columns
    const stats: any = {
      games: {
        minutes: row.minutes ?? 0,
        position: row.position ?? null,
        rating: row.rating ?? null,
        captain: row.captain ?? false,
        substitute: row.substitute ?? false,
      },
      goals: {
        total: row.goals ?? 0,
        assists: row.assists ?? 0,
        conceded: row.conceded ?? 0,
      },
      goalkeeper: {
        saves: row.saves ?? 0,
        conceded: row.conceded ?? 0,
      },
      shots: {
        total: row.shotsTotal ?? 0,
        on: row.shotsOn ?? 0,
      },
      passes: {
        total: row.passesTotal ?? 0,
        key: row.passesKey ?? 0,
        accuracy: row.passesAccuracy ?? null,
      },
      tackles: {
        total: row.tacklesTotal ?? 0,
        blocks: row.tacklesBlocks ?? 0,
        interceptions: row.tacklesInterceptions ?? 0,
      },
      duels: {
        total: row.duelsTotal ?? 0,
        won: row.duelsWon ?? 0,
      },
      dribbles: {
        attempts: row.dribblesAttempts ?? 0,
        success: row.dribblesSuccess ?? 0,
        past: row.dribblesPast ?? 0,
      },
      fouls: {
        drawn: row.foulsDrawn ?? 0,
        committed: row.foulsCommitted ?? 0,
      },
      cards: {
        yellow: row.yellowCards ?? 0,
        red: row.redCards ?? 0,
      },
      penalty: {
        won: row.penaltyWon ?? 0,
        committed: row.penaltyCommitted ?? 0,
        scored: row.penaltyScored ?? 0,
        missed: row.penaltyMissed ?? 0,
        saved: row.penaltySaved ?? 0,
      },
    };

    const role = normalizeRole(row.position || '') as Role;
    try {
      const result = calculatePlayerPoints(stats, role);

      await prisma.playerStats.update({
        where: { id: row.id },
        data: {
          // Cast to any to satisfy Prisma typing for JSON input
          pointsBreakdown: (result.breakdown && result.breakdown.length ? (result.breakdown as any) : Prisma.JsonNull) as any,
          totalPoints: Math.trunc(result.total),
          updatedAt: new Date(),
        },
      });
      updated++;
    } catch (err) {
      console.error(`Error processing playerStats id=${row.id} playerId=${row.playerId}:`, err);
    }
  }

  console.log(`✅ Updated ${updated} rows (out of ${rows.length})`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
