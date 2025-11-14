/**
 * Script para actualizar manualmente estadísticas de penaltis de un jugador
 * Uso: npx tsx scripts/update-player-penalty.ts [playerId] [jornada] [penaltyCommitted]
 */

import { PrismaClient } from '@prisma/client';
import { calculatePlayerPoints } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();

async function updatePlayerPenalty(playerId: number, jornada: number, penaltyCommitted: number) {
  try {
    console.log(`\n🔄 Actualizando estadísticas de penaltis...\n`);
    console.log(`   - Player ID: ${playerId}`);
    console.log(`   - Jornada: ${jornada}`);
    console.log(`   - Penaltis cometidos: ${penaltyCommitted}`);

    // Buscar las estadísticas
    const stats = await prisma.playerStats.findFirst({
      where: {
        playerId: playerId,
        jornada: jornada,
        season: 2025
      }
    });

    if (!stats) {
      console.log(`❌ No se encontraron estadísticas para este jugador en la jornada ${jornada}`);
      return;
    }

    console.log(`\n📊 Estadísticas actuales:`);
    console.log(`   - Penaltis cometidos: ${stats.penaltyCommitted}`);
    console.log(`   - Puntos totales: ${stats.totalPoints}`);

    // Actualizar penaltis cometidos
    await prisma.playerStats.update({
      where: {
        id: stats.id
      },
      data: {
        penaltyCommitted: penaltyCommitted
      }
    });

    // Recalcular puntos
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      console.log(`❌ No se encontró el jugador con ID ${playerId}`);
      return;
    }

    // Preparar datos para recalcular puntos
    const statsForCalc = {
      games: {
        minutes: stats.minutes,
        captain: stats.captain,
        substitute: stats.substitute
      },
      goals: {
        total: stats.goals,
        assists: stats.assists,
        conceded: stats.conceded,
        saves: stats.saves
      },
      shots: {
        total: stats.shotsTotal,
        on: stats.shotsOn
      },
      passes: {
        total: stats.passesTotal,
        key: stats.passesKey,
        accuracy: stats.passesAccuracy
      },
      tackles: {
        total: stats.tacklesTotal,
        blocks: stats.tacklesBlocks,
        interceptions: stats.tacklesInterceptions
      },
      duels: {
        total: stats.duelsTotal,
        won: stats.duelsWon
      },
      dribbles: {
        attempts: stats.dribblesAttempts,
        success: stats.dribblesSuccess,
        past: stats.dribblesPast
      },
      fouls: {
        drawn: stats.foulsDrawn,
        committed: stats.foulsCommitted
      },
      cards: {
        yellow: stats.yellowCards,
        red: stats.redCards
      },
      penalty: {
        won: stats.penaltyWon,
        committed: penaltyCommitted, // ✅ Valor actualizado
        scored: stats.penaltyScored,
        missed: stats.penaltyMissed,
        saved: stats.penaltySaved
      },
      goalkeeper: {
        saves: stats.saves,
        conceded: stats.conceded
      }
    };

    // Normalizar posición
    const normalizeRole = (pos: string | null): 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker' => {
      if (!pos) return 'Midfielder';
      const lower = pos.toLowerCase();
      if (lower.includes('goalkeeper') || lower === 'g') return 'Goalkeeper';
      if (lower.includes('defender') || lower === 'd') return 'Defender';
      if (lower.includes('attacker') || lower === 'f') return 'Attacker';
      return 'Midfielder';
    };

    const role = normalizeRole(stats.position);
    const pointsResult = calculatePlayerPoints(statsForCalc, role);

    // Actualizar puntos
    await prisma.playerStats.update({
      where: {
        id: stats.id
      },
      data: {
        totalPoints: pointsResult.total,
        pointsBreakdown: pointsResult.breakdown as any
      }
    });

    console.log(`\n✅ Estadísticas actualizadas:`);
    console.log(`   - Penaltis cometidos: ${penaltyCommitted}`);
    console.log(`   - Puntos antiguos: ${stats.totalPoints}`);
    console.log(`   - Puntos nuevos: ${pointsResult.total}`);
    console.log(`   - Diferencia: ${pointsResult.total - stats.totalPoints} puntos`);

    console.log(`\n📋 Breakdown de puntos:`);
    pointsResult.breakdown.forEach((item: any) => {
      console.log(`   - ${item.label}: ${item.amount} → ${item.points > 0 ? '+' : ''}${item.points} pts`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener argumentos de línea de comandos
const playerId = parseInt(process.argv[2]);
const jornada = parseInt(process.argv[3]);
const penaltyCommitted = parseInt(process.argv[4]);

if (!playerId || !jornada || isNaN(penaltyCommitted)) {
  console.log('❌ Uso: npx tsx scripts/update-player-penalty.ts [playerId] [jornada] [penaltyCommitted]');
  console.log('   Ejemplo: npx tsx scripts/update-player-penalty.ts 1234 12 1');
  process.exit(1);
}

updatePlayerPenalty(playerId, jornada, penaltyCommitted);
