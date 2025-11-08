import { PrismaClient } from '@prisma/client';
import { normalizeRole, type Role } from '../src/shared/pointsCalculator.js';
import { DEFENDER_POINTS, MIDFIELDER_POINTS } from '../src/shared/pointsConfig.js';

(async function main() {
  const prisma = new PrismaClient();
  try {
    const jornada = parseInt(process.argv[2] || '12', 10);
    console.log('Checking expected breakdown for jornada', jornada);

    const rows = await prisma.playerStats.findMany({
      where: { jornada, season: 2025 },
      select: {
        playerId: true,
        position: true,
        duelsWon: true,
        tacklesInterceptions: true,
        yellowCards: true,
        redCards: true,
        passesKey: true,
        dribblesSuccess: true,
        penaltySaved: true,
        saves: true,
        pointsBreakdown: true,
        minutes: true,
        goals: true,
        assists: true,
      },
    });

    const mismatches: any[] = [];

    for (const r of rows) {
      const role = normalizeRole(r.position ?? '') as Role;
      const labels = Array.isArray(r.pointsBreakdown) ? (r.pointsBreakdown as any[]).map((b: any) => String(b.label)) : [];

      // Duels: only defenders get duels points
      if (role === 'Defender' && (r.duelsWon ?? 0) >= DEFENDER_POINTS.DUELS_WON_PER_POINT) {
        if (!labels.includes('Duelos ganados')) mismatches.push({ playerId: r.playerId, issue: 'missing_duels', duelsWon: r.duelsWon, role, labels });
      }

      // Interceptions: defenders and midfielders
      if ((role === 'Defender' && (r.tacklesInterceptions ?? 0) >= DEFENDER_POINTS.INTERCEPTIONS_PER_POINT) ||
          (role === 'Midfielder' && (r.tacklesInterceptions ?? 0) >= MIDFIELDER_POINTS.INTERCEPTIONS_PER_POINT)) {
        if (!labels.includes('Intercepciones')) mismatches.push({ playerId: r.playerId, issue: 'missing_interceptions', tacklesInterceptions: r.tacklesInterceptions, role, labels });
      }

      // Cards (yellow/red) should always appear if >0
      if ((r.redCards ?? 0) > 0 && !labels.includes('Tarjeta roja')) mismatches.push({ playerId: r.playerId, issue: 'missing_red', redCards: r.redCards, labels });
      if ((r.yellowCards ?? 0) > 0 && !labels.includes('Tarjetas amarillas')) mismatches.push({ playerId: r.playerId, issue: 'missing_yellow', yellowCards: r.yellowCards, labels });

      // Passes key: midfielders and attackers and maybe defenders — code gives points for Midfielder and Attacker
      if ((role === 'Midfielder' || role === 'Attacker') && (r.passesKey ?? 0) >= MIDFIELDER_POINTS.KEY_PASSES_PER_POINT) {
        if (!labels.includes('Pases clave')) mismatches.push({ playerId: r.playerId, issue: 'missing_key_pass', passesKey: r.passesKey, role, labels });
      }

      // Dribbles success: midfielders and attackers
      if ((role === 'Midfielder' || role === 'Attacker') && (r.dribblesSuccess ?? 0) >= MIDFIELDER_POINTS.DRIBBLES_SUCCESS_PER_POINT) {
        if (!labels.includes('Regates exitosos')) mismatches.push({ playerId: r.playerId, issue: 'missing_dribble', dribblesSuccess: r.dribblesSuccess, role, labels });
      }

      // Penalty saved / saves -> Goalkeepers
      if (role === 'Goalkeeper') {
        if ((r.saves ?? 0) > 0 && !labels.includes('Paradas')) mismatches.push({ playerId: r.playerId, issue: 'missing_saves', saves: r.saves, role, labels });
        if ((r.penaltySaved ?? 0) > 0 && !labels.includes('Penaltis parados')) mismatches.push({ playerId: r.playerId, issue: 'missing_pen_saved', penaltySaved: r.penaltySaved, role, labels });
      }
    }

    console.log('Mismatches found:', mismatches.length);
    console.log('Sample (up to 30):', JSON.stringify(mismatches.slice(0,30), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
