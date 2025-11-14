/**
 * Script para recalcular las estadísticas de DEFENSAS de una jornada
 * con los goles encajados correctos (goles del equipo rival)
 * Uso: npx tsx scripts/recalculate-defenders-jornada.ts [--jornada 12]
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { calculatePlayerPoints, normalizeRole } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '07bc9c707fe2d6169fff6e17d4a9e6fd';
const LA_LIGA_LEAGUE_ID = 140;
const SEASON = 2025;

const HEADERS = {
  'x-apisports-key': API_KEY,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result: { jornada?: number } = {};

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--jornada' && args[i + 1]) {
      result.jornada = Number(args[i + 1]);
      i++;
      continue;
    }
    if (a.startsWith('--jornada=')) {
      result.jornada = Number(a.split('=')[1]);
      continue;
    }
  }

  return result;
}

async function getFixturesForJornada(jornada: number) {
  try {
    console.log(`🔍 Obteniendo fixtures de la jornada ${jornada}...`);
    const { data } = await axios.get(`${API_BASE}/fixtures`, {
      headers: HEADERS,
      params: {
        league: LA_LIGA_LEAGUE_ID,
        season: SEASON,
        round: `Regular Season - ${jornada}`,
      },
      timeout: 10000,
    });
    const fixtures = data?.response || [];
    console.log(`✅ ${fixtures.length} fixtures encontrados`);
    return fixtures;
  } catch (error: any) {
    console.error('❌ Error obteniendo fixtures:', error?.message || error);
    return [];
  }
}

async function getFixturePlayerStats(fixtureObj: any) {
  try {
    const fixtureId = fixtureObj.fixture?.id;
    const { data } = await axios.get(`${API_BASE}/fixtures/players`, {
      headers: HEADERS,
      params: { fixture: fixtureId },
      timeout: 10000,
    });

    const teamsData = data?.response || [];
    const homeGoals = Number(fixtureObj.goals?.home ?? 0);
    const awayGoals = Number(fixtureObj.goals?.away ?? 0);

    const defendersToUpdate: Array<{
      playerId: number;
      playerName: string;
      teamId: number;
      teamConceded: number;
      rawStats: any;
    }> = [];

    for (const teamData of teamsData) {
      const teamId = teamData.team?.id;
      if (!teamId) continue;

      const teamIsHome = teamData.team?.id === fixtureObj.teams?.home?.id;
      const teamConceded = teamIsHome ? awayGoals : homeGoals;

      const players = teamData.players || [];
      for (const playerData of players) {
        const playerId = playerData.player?.id;
        if (!playerId) continue;

        const dbPlayer = await prisma.player.findUnique({
          where: { id: playerId },
          select: { position: true, name: true },
        });

        if (!dbPlayer) continue;

        const role = normalizeRole(dbPlayer.position);
        
        // Solo procesar defensas
        if (role !== 'Defender') continue;

        const apiStats = playerData.statistics?.[0] || {};

        const normalizedStats: any = {
          games: {
            minutes: apiStats.games?.minutes ?? 0,
            position: apiStats.games?.position ?? null,
            rating: apiStats.games?.rating ?? null,
            captain: apiStats.games?.captain ?? false,
            substitute: apiStats.games?.substitute ?? false,
          },
          goals: {
            total: apiStats.goals?.total ?? 0,
            assists: apiStats.goals?.assists ?? 0,
            conceded: teamConceded, // ✅ Inyectar goles del equipo rival
          },
          goalkeeper: {
            saves: 0,
            conceded: 0,
          },
          shots: {
            total: apiStats.shots?.total ?? 0,
            on: apiStats.shots?.on ?? 0,
          },
          passes: {
            total: apiStats.passes?.total ?? 0,
            key: apiStats.passes?.key ?? 0,
            accuracy: apiStats.passes?.accuracy ?? null,
          },
          tackles: {
            total: apiStats.tackles?.total ?? 0,
            blocks: apiStats.tackles?.blocks ?? 0,
            interceptions: apiStats.tackles?.interceptions ?? 0,
          },
          duels: {
            total: apiStats.duels?.total ?? 0,
            won: apiStats.duels?.won ?? 0,
          },
          dribbles: {
            attempts: apiStats.dribbles?.attempts ?? 0,
            success: apiStats.dribbles?.success ?? 0,
            past: apiStats.dribbles?.past ?? 0,
          },
          fouls: {
            drawn: apiStats.fouls?.drawn ?? 0,
            committed: apiStats.fouls?.committed ?? 0,
          },
          cards: {
            yellow: apiStats.cards?.yellow ?? 0,
            red: apiStats.cards?.red ?? 0,
          },
          penalty: {
            won: apiStats.penalty?.won ?? 0,
            committed: apiStats.penalty?.commited ?? apiStats.penalty?.committed ?? 0,
            scored: apiStats.penalty?.scored ?? 0,
            missed: apiStats.penalty?.missed ?? 0,
            saved: 0,
          },
        };

        defendersToUpdate.push({
          playerId,
          playerName: dbPlayer.name,
          teamId,
          teamConceded,
          rawStats: normalizedStats,
        });
      }
    }

    return { fixtureId, defendersToUpdate };
  } catch (error: any) {
    console.error(`❌ Error obteniendo stats del fixture:`, error?.message || error);
    return { fixtureId: null, defendersToUpdate: [] };
  }
}

async function main() {
  const { jornada } = parseArgs();

  if (!jornada) {
    const league = await prisma.league.findFirst({ select: { currentJornada: true } });
    if (!league?.currentJornada) {
      console.error('Debe indicar la jornada con --jornada N o verificar la tabla league.');
      process.exit(1);
    }
    console.log(`Usando jornada actual: ${league.currentJornada}`);
  }

  const targetJornada = jornada || (await prisma.league.findFirst())?.currentJornada!;

  console.log(`\n🔄 Recalculando DEFENSAS de la jornada ${targetJornada}\n`);

  const fixtures = await getFixturesForJornada(targetJornada);
  if (fixtures.length === 0) {
    console.log('⚠️  No se encontraron fixtures');
    process.exit(0);
  }

  let totalDefendersUpdated = 0;

  for (const fixture of fixtures) {
    const homeTeam = fixture.teams?.home?.name;
    const awayTeam = fixture.teams?.away?.name;
    const homeGoals = fixture.goals?.home ?? 0;
    const awayGoals = fixture.goals?.away ?? 0;

    console.log(`\n⚽ ${homeTeam} ${homeGoals} - ${awayGoals} ${awayTeam}`);

    const { fixtureId, defendersToUpdate } = await getFixturePlayerStats(fixture);

    if (!fixtureId || defendersToUpdate.length === 0) {
      console.log('  ℹ️  No hay defensas para actualizar en este partido');
      continue;
    }

    for (const defender of defendersToUpdate) {
      const pointsResult = calculatePlayerPoints(defender.rawStats, 'Defender');

      await prisma.playerStats.upsert({
        where: {
          playerId_jornada_season: {
            playerId: defender.playerId,
            jornada: targetJornada,
            season: SEASON,
          },
        },
        update: {
          conceded: defender.teamConceded,
          totalPoints: pointsResult.total,
          pointsBreakdown: pointsResult.breakdown as any,
          updatedAt: new Date(),
        },
        create: {
          playerId: defender.playerId,
          jornada: targetJornada,
          season: SEASON,
          fixtureId,
          teamId: defender.teamId,
          conceded: defender.teamConceded,
          totalPoints: pointsResult.total,
          pointsBreakdown: pointsResult.breakdown as any,
          minutes: defender.rawStats.games.minutes,
          position: defender.rawStats.games.position,
          rating: defender.rawStats.games.rating,
          captain: defender.rawStats.games.captain,
          substitute: defender.rawStats.games.substitute,
          goals: defender.rawStats.goals.total,
          assists: defender.rawStats.goals.assists,
          saves: 0,
          shotsTotal: defender.rawStats.shots.total,
          shotsOn: defender.rawStats.shots.on,
          passesTotal: defender.rawStats.passes.total,
          passesKey: defender.rawStats.passes.key,
          passesAccuracy: defender.rawStats.passes.accuracy ? parseInt(String(defender.rawStats.passes.accuracy), 10) : null,
          tacklesTotal: defender.rawStats.tackles.total,
          tacklesBlocks: defender.rawStats.tackles.blocks,
          tacklesInterceptions: defender.rawStats.tackles.interceptions,
          duelsTotal: defender.rawStats.duels.total,
          duelsWon: defender.rawStats.duels.won,
          dribblesAttempts: defender.rawStats.dribbles.attempts,
          dribblesSuccess: defender.rawStats.dribbles.success,
          dribblesPast: defender.rawStats.dribbles.past,
          foulsDrawn: defender.rawStats.fouls.drawn,
          foulsCommitted: defender.rawStats.fouls.committed,
          yellowCards: defender.rawStats.cards.yellow,
          redCards: defender.rawStats.cards.red,
          penaltyWon: defender.rawStats.penalty.won,
          penaltyCommitted: defender.rawStats.penalty.committed,
          penaltyScored: defender.rawStats.penalty.scored,
          penaltyMissed: defender.rawStats.penalty.missed,
          penaltySaved: 0,
        },
      });

      console.log(`  ✅ ${defender.playerName}: ${defender.teamConceded} goles encajados → ${pointsResult.total} puntos`);
      totalDefendersUpdated++;
    }

    // Pequeño delay para no saturar la API
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n🎉 Recalculo completado: ${totalDefendersUpdated} defensas actualizados\n`);
  await prisma.$disconnect();
}

main();
