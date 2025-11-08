import { PrismaClient, Prisma } from '@prisma/client';
import { calculatePlayerPoints, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();

(async function main() {
  try {
    const jornada = parseInt(process.argv[2] || '12', 10);
    console.log('Fixing missing breakdowns for jornada', jornada);

    const rows = await prisma.playerStats.findMany({
      where: { jornada, season: 2025 },
      select: {
        id: true,
        playerId: true,
        minutes: true,
        position: true,
        rating: true,
        captain: true,
        substitute: true,
        goals: true,
        assists: true,
        conceded: true,
        saves: true,
        shotsTotal: true,
        shotsOn: true,
        passesTotal: true,
        passesKey: true,
        passesAccuracy: true,
        tacklesTotal: true,
        tacklesBlocks: true,
        tacklesInterceptions: true,
        duelsTotal: true,
        duelsWon: true,
        dribblesAttempts: true,
        dribblesSuccess: true,
        dribblesPast: true,
        foulsDrawn: true,
        foulsCommitted: true,
        yellowCards: true,
        redCards: true,
        penaltyWon: true,
        penaltyCommitted: true,
        penaltyScored: true,
        penaltyMissed: true,
        penaltySaved: true,
        pointsBreakdown: true,
      },
    });

    const toUpdate: any[] = [];

    for (const row of rows) {
      const role = normalizeRole(row.position ?? '') as Role;
      const labels = Array.isArray(row.pointsBreakdown) ? (row.pointsBreakdown as any[]).map(x => String(x.label)) : [];

      let needs = false;

      if (role === 'Defender' && (row.duelsWon ?? 0) >= 2 && !labels.includes('Duelos ganados')) needs = true;
      if ((role === 'Defender' && (row.tacklesInterceptions ?? 0) >= 2) || (role === 'Midfielder' && (row.tacklesInterceptions ?? 0) >= 2)) {
        if (!labels.includes('Intercepciones')) needs = true;
      }
      if ((row.yellowCards ?? 0) > 0 && !labels.includes('Tarjetas amarillas')) needs = true;
      if ((row.redCards ?? 0) > 0 && !labels.includes('Tarjeta roja')) needs = true;
      if ((role === 'Midfielder' || role === 'Attacker') && (row.passesKey ?? 0) > 0 && !labels.includes('Pases clave')) needs = true;
      if ((role === 'Midfielder' || role === 'Attacker') && (row.dribblesSuccess ?? 0) >= 2 && !labels.includes('Regates exitosos')) needs = true;
      if (role === 'Goalkeeper' && (row.saves ?? 0) > 0 && !labels.includes('Paradas')) needs = true;
      if (role === 'Goalkeeper' && (row.penaltySaved ?? 0) > 0 && !labels.includes('Penaltis parados')) needs = true;

      if (needs) toUpdate.push(row.playerId);
    }

    const uniqueIds = Array.from(new Set(toUpdate));
    console.log('Players to recalc/update:', uniqueIds.length);

    let updated = 0;
    for (const playerId of uniqueIds) {
      const row = await prisma.playerStats.findFirst({ where: { playerId, jornada, season: 2025 } });
      if (!row) continue;

      // Reconstruct API-like stats object from flat columns (same as backfill)
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

      const role = normalizeRole(row.position ?? '') as Role;
      const result = calculatePlayerPoints(stats, role);

      await prisma.playerStats.update({
        where: { id: row.id },
        data: {
          pointsBreakdown: (result.breakdown && result.breakdown.length ? (result.breakdown as any) : Prisma.JsonNull) as any,
          totalPoints: Math.trunc(result.total),
          updatedAt: new Date(),
        },
      });
      updated++;
    }

    console.log('✅ Done. Updated rows:', updated);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
