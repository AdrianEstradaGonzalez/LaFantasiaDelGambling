import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';
import { calculatePlayerPoints, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || process.env.APISPORTS_API_KEY || '';

const api = axios.create({ baseURL: API_BASE, timeout: 15000, headers: { 'x-apisports-key': API_KEY } });

async function fetchFixture(fixtureId: number) {
  const resp = await api.get('/fixtures', { params: { fixture: fixtureId } });
  return resp.data?.response?.[0] ?? null;
}

function reconstructRawFromRow(row: any) {
  return {
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
    shots: { total: row.shotsTotal ?? 0, on: row.shotsOn ?? 0 },
    passes: { total: row.passesTotal ?? 0, key: row.passesKey ?? 0, accuracy: row.passesAccuracy ?? null },
    tackles: { total: row.tacklesTotal ?? 0, blocks: row.tacklesBlocks ?? 0, interceptions: row.tacklesInterceptions ?? 0 },
    duels: { total: row.duelsTotal ?? 0, won: row.duelsWon ?? 0 },
    dribbles: { attempts: row.dribblesAttempts ?? 0, success: row.dribblesSuccess ?? 0, past: row.dribblesPast ?? 0 },
    fouls: { drawn: row.foulsDrawn ?? 0, committed: row.foulsCommitted ?? 0 },
    cards: { yellow: row.yellowCards ?? 0, red: row.redCards ?? 0 },
    penalty: { won: row.penaltyWon ?? 0, committed: row.penaltyCommitted ?? 0, scored: row.penaltyScored ?? 0, missed: row.penaltyMissed ?? 0, saved: row.penaltySaved ?? 0 },
  };
}

async function main() {
  const arg = process.argv[2];
  const jornada = arg ? parseInt(arg, 10) : undefined;
  if (!jornada) {
    console.log('Uso: npx tsx scripts/backfill-defender-conceded-jornada.ts <jornada>');
    process.exit(1);
  }

  console.log(`🔁 Backfilling defender conceded for jornada ${jornada}`);

  // Find defender stats for this jornada where minutes>0 (played)
  const rows = await prisma.playerStats.findMany({ where: { jornada, minutes: { gt: 0 } } });
  console.log(`Found ${rows.length} player_stats rows for jornada ${jornada}`);

  let updated = 0;

  for (const row of rows) {
    try {
      // get player position from player table (defender check)
      const player = await prisma.player.findUnique({ where: { id: row.playerId }, select: { position: true } });
      if (!player) continue;
      if (player.position !== 'Defender') continue; // only defenders

      const fixtureId = row.fixtureId;
      if (!fixtureId || fixtureId === 0) continue;

      let teamConceded: number | null = null;
      try {
        const fixture = await fetchFixture(fixtureId);
        if (fixture) {
          const homeGoals = Number(fixture.goals?.home ?? 0);
          const awayGoals = Number(fixture.goals?.away ?? 0);
          const teamIsHome = fixture.teams?.home?.id === row.teamId;
          teamConceded = teamIsHome ? awayGoals : homeGoals;
        }
      } catch (err) {
        // ignore API errors, we'll fallback to DB-derived value
      }

      // Fallback: compute team conceded from DB (max conceded in same fixture & team)
      if (teamConceded == null) {
        const agg = await prisma.playerStats.aggregate({
          _max: { conceded: true },
          where: { fixtureId, teamId: row.teamId },
        });
        const maxConceded = agg._max?.conceded;
        if (typeof maxConceded === 'number') teamConceded = maxConceded;
      }

      if (teamConceded == null) {
        console.log(`  ⚠️ Could not determine teamConceded for fixture ${fixtureId} player ${row.playerId}`);
        continue;
      }

      // If conceded already equals teamConceded, skip
      if ((row.conceded ?? 0) === teamConceded && row.pointsBreakdown) continue;

      // reconstruct raw stats and inject conceded
      const raw = reconstructRawFromRow(row);
      raw.goals.conceded = teamConceded;
      raw.goalkeeper = raw.goalkeeper || {};
      raw.goalkeeper.conceded = teamConceded;

      const role = normalizeRole(player.position || '') as Role;
      const result = calculatePlayerPoints(raw, role);

      await prisma.playerStats.update({
        where: { id: row.id },
        data: {
          conceded: teamConceded,
          pointsBreakdown: result.breakdown && result.breakdown.length ? (result.breakdown as any) : Prisma.JsonNull,
          totalPoints: Math.trunc(result.total),
          updatedAt: new Date(),
        },
      });

      updated++;
      if (updated % 50 === 0) console.log(`  Updated ${updated} rows so far...`);
    } catch (err: any) {
      console.error('Error processing row', row.id, row.playerId, err.message || err);
    }
  }

  console.log(`✅ Finished. Updated ${updated} defender rows for jornada ${jornada}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
