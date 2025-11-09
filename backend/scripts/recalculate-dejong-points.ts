import { PrismaClient } from '@prisma/client';
import { calculatePlayerPoints, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();
const DE_JONG_ID = 538;
const JORNADA = 12;
const SEASON = 2025;

async function recalculateDeJongPoints() {
  console.log('🔄 Recalculando puntos de De Jong - Jornada 12...\n');

  const stats = await prisma.playerStats.findUnique({
    where: {
      playerId_jornada_season: {
        playerId: DE_JONG_ID,
        jornada: JORNADA,
        season: SEASON
      }
    },
    include: {
      player: true
    }
  });

  if (!stats) {
    console.log('❌ No se encontraron stats');
    return;
  }

  console.log(`👤 ${stats.player.name} (${stats.player.teamName})`);
  console.log(`📊 Stats actuales:`);
  console.log(`   Puntos totales: ${stats.totalPoints}`);
  console.log(`   Minutos: ${stats.minutes}`);
  console.log(`   Amarillas: ${stats.yellowCards}`);
  console.log(`   Rojas: ${stats.redCards}\n`);

  // Preparar stats para el cálculo
  const statsForCalculation = {
    games: {
      minutes: stats.minutes || 0,
      position: stats.position || '',
      rating: stats.rating || null,
      captain: stats.captain || false,
      substitute: stats.substitute || false
    },
    goals: {
      total: stats.goals || 0,
      assists: stats.assists || 0,
      conceded: stats.conceded || 0,
      saves: stats.saves || 0
    },
    shots: {
      total: stats.shotsTotal || 0,
      on: stats.shotsOn || 0
    },
    passes: {
      total: stats.passesTotal || 0,
      key: stats.passesKey || 0,
      accuracy: stats.passesAccuracy || null
    },
    tackles: {
      total: stats.tacklesTotal || 0,
      blocks: stats.tacklesBlocks || 0,
      interceptions: stats.tacklesInterceptions || 0
    },
    duels: {
      total: stats.duelsTotal || 0,
      won: stats.duelsWon || 0
    },
    dribbles: {
      attempts: stats.dribblesAttempts || 0,
      success: stats.dribblesSuccess || 0,
      past: stats.dribblesPast || 0
    },
    fouls: {
      drawn: stats.foulsDrawn || 0,
      committed: stats.foulsCommitted || 0
    },
    cards: {
      yellow: stats.yellowCards || 0,
      red: stats.redCards || 0
    },
    penalty: {
      won: stats.penaltyWon || 0,
      committed: stats.penaltyCommitted || 0,
      scored: stats.penaltyScored || 0,
      missed: stats.penaltyMissed || 0,
      saved: stats.penaltySaved || 0
    }
  };

  const role = normalizeRole(stats.player.position as Role);
  const pointsResult = calculatePlayerPoints(statsForCalculation, role);

  console.log(`🔢 Puntos recalculados: ${pointsResult.total}`);
  console.log(`📋 Desglose:`);
  pointsResult.breakdown.forEach((item: any) => {
    if (item.amount !== 0) {
      console.log(`   ${item.label}: ${item.amount > 0 ? '+' : ''}${item.amount}`);
    }
  });

  // Actualizar en BD
  await prisma.playerStats.update({
    where: {
      playerId_jornada_season: {
        playerId: DE_JONG_ID,
        jornada: JORNADA,
        season: SEASON
      }
    },
    data: {
      totalPoints: pointsResult.total,
      pointsBreakdown: pointsResult.breakdown as any,
      updatedAt: new Date()
    }
  });

  console.log(`\n✅ Puntos actualizados: ${stats.totalPoints} → ${pointsResult.total}`);

  await prisma.$disconnect();
}

recalculateDeJongPoints();
