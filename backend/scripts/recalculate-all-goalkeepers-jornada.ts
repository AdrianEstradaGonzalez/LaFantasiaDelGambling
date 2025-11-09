/**
 * Script para recalcular TODOS los porteros de la jornada actual
 * forzando una nueva consulta a la API
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { calculatePlayerPoints, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '07bc9c707fe2d6169fff6e17d4a9e6fd';
const LA_LIGA_LEAGUE_ID = 140;
const SEASON = 2025;

const HEADERS = {
  'x-apisports-key': API_KEY,
};

async function recalculateGoalkeepers() {
  console.log('🔄 Recalculando TODOS los porteros de la jornada actual\n');

  // Obtener jornada actual
  const league = await prisma.league.findFirst({
    select: { currentJornada: true }
  });

  if (!league?.currentJornada) {
    console.log('❌ No hay jornada actual');
    return;
  }

  const jornada = league.currentJornada;
  console.log(`📅 Jornada: ${jornada}\n`);

  // Obtener todos los fixtures de esta jornada
  console.log('🔍 Obteniendo fixtures de la API...');
  const { data } = await axios.get(`${API_BASE}/fixtures`, {
    headers: HEADERS,
    params: {
      league: LA_LIGA_LEAGUE_ID,
      season: SEASON,
      round: `Regular Season - ${jornada}`
    },
    timeout: 15000
  });

  const fixtures = data?.response || [];
  console.log(`✅ ${fixtures.length} fixtures encontrados\n`);

  let updated = 0;
  let skipped = 0;

  for (const fixture of fixtures) {
    const fixtureId = fixture.fixture.id;
    const status = fixture.fixture.status.short;
    const homeTeam = fixture.teams.home.name;
    const awayTeam = fixture.teams.away.name;
    const score = `${fixture.goals.home}-${fixture.goals.away}`;

    // Solo procesar partidos finalizados o en curso
    if (!['FT', '1H', 'HT', '2H', 'ET', 'P', 'PEN', 'AET'].includes(status)) {
      console.log(`⏭️  ${homeTeam} vs ${awayTeam}: Aún no comenzó (${status})`);
      skipped++;
      continue;
    }

    console.log(`⚽ ${homeTeam} ${score} ${awayTeam} (${status})`);

    // 🔥 Obtener paradas del equipo desde /fixtures/statistics
    const teamSaves = new Map<number, number>();
    try {
      const { data: statsData } = await axios.get(`${API_BASE}/fixtures/statistics`, {
        headers: HEADERS,
        params: { fixture: fixtureId },
        timeout: 15000
      });
      const statistics = statsData?.response || [];
      for (const teamStats of statistics) {
        const teamId = teamStats.team?.id;
        if (!teamId) continue;
        const stats = teamStats.statistics || [];
        const saveStat = stats.find((s: any) => s.type === 'Goalkeeper Saves');
        const saves = saveStat?.value ? parseInt(String(saveStat.value), 10) : 0;
        teamSaves.set(teamId, saves);
      }
    } catch (error) {
      console.warn(`⚠️  Error obteniendo estadísticas del equipo para fixture ${fixtureId}`);
    }

    // Obtener stats de jugadores
    const { data: playersData } = await axios.get(`${API_BASE}/fixtures/players`, {
      headers: HEADERS,
      params: { fixture: fixtureId },
      timeout: 15000
    });

    const teams = playersData?.response || [];

    for (const teamData of teams) {
      const teamId = teamData.team.id;
      const players = teamData.players || [];

      for (const playerData of players) {
        const playerId = playerData.player.id;
        const playerName = playerData.player.name;

        // Verificar si es portero
        const dbPlayer = await prisma.player.findUnique({
          where: { id: playerId },
          select: { position: true }
        });

        if (!dbPlayer || dbPlayer.position !== 'Goalkeeper') continue;

        const stats = playerData.statistics?.[0];
        if (!stats) continue;

        // Construir stats normalizadas
        const normalizedStats: any = {
          games: {
            minutes: stats.games?.minutes ?? 0,
            position: stats.games?.position ?? null,
            rating: stats.games?.rating ?? null,
            captain: stats.games?.captain ?? false,
            substitute: stats.games?.substitute ?? false,
          },
          goals: {
            total: stats.goals?.total ?? 0,
            assists: stats.goals?.assists ?? 0,
            conceded: stats.goals?.conceded ?? 0,
          },
          goalkeeper: {
            saves: stats.goalkeeper?.saves ?? 0,
            conceded: stats.goalkeeper?.conceded ?? stats.goals?.conceded ?? 0,
          },
          shots: {
            total: stats.shots?.total ?? 0,
            on: stats.shots?.on ?? 0,
          },
          passes: {
            total: stats.passes?.total ?? 0,
            key: stats.passes?.key ?? 0,
            accuracy: stats.passes?.accuracy ?? null,
          },
          tackles: {
            total: stats.tackles?.total ?? 0,
            blocks: stats.tackles?.blocks ?? 0,
            interceptions: stats.tackles?.interceptions ?? 0,
          },
          duels: {
            total: stats.duels?.total ?? 0,
            won: stats.duels?.won ?? 0,
          },
          dribbles: {
            attempts: stats.dribbles?.attempts ?? 0,
            success: stats.dribbles?.success ?? 0,
            past: stats.dribbles?.past ?? 0,
          },
          fouls: {
            drawn: stats.fouls?.drawn ?? 0,
            committed: stats.fouls?.committed ?? 0,
          },
          cards: {
            yellow: stats.cards?.yellow ?? 0,
            red: stats.cards?.red ?? 0,
          },
          penalty: {
            won: stats.penalty?.won ?? 0,
            committed: stats.penalty?.committed ?? 0,
            scored: stats.penalty?.scored ?? 0,
            missed: stats.penalty?.missed ?? 0,
            saved: stats.penalty?.saved ?? 0,
          },
        };

        // 🔥 INYECTAR PARADAS DEL EQUIPO (la API no las proporciona en /fixtures/players)
        if (normalizedStats.games.minutes > 0) {
          const teamSavesValue = teamSaves.get(teamId) ?? 0;
          normalizedStats.goalkeeper.saves = teamSavesValue;
        }

        // Calcular puntos
        const role = normalizeRole('Goalkeeper') as Role;
        const pointsResult = calculatePlayerPoints(normalizedStats, role);

        // Log detallado
        console.log(`   📋 ${playerName}`);
        console.log(`      - Minutos: ${normalizedStats.games.minutes}`);
        console.log(`      - Paradas API: ${stats.goalkeeper?.saves ?? 'null'}`);
        console.log(`      - Paradas normalizadas: ${normalizedStats.goalkeeper.saves}`);
        console.log(`      - Goles encajados: ${normalizedStats.goalkeeper.conceded}`);
        console.log(`      - Puntos totales: ${pointsResult.total}`);

        // Actualizar en base de datos
        await prisma.playerStats.upsert({
          where: {
            playerId_jornada_season: {
              playerId,
              jornada,
              season: SEASON
            }
          },
          create: {
            playerId,
            fixtureId,
            jornada,
            season: SEASON,
            teamId,
            totalPoints: pointsResult.total,
            pointsBreakdown: pointsResult.breakdown as any,
            minutes: normalizedStats.games.minutes,
            position: normalizedStats.games.position,
            rating: normalizedStats.games.rating ? String(normalizedStats.games.rating) : null,
            captain: normalizedStats.games.captain,
            substitute: normalizedStats.games.substitute,
            goals: normalizedStats.goals.total,
            assists: normalizedStats.goals.assists,
            conceded: normalizedStats.goalkeeper.conceded,
            saves: normalizedStats.goalkeeper.saves,
            shotsTotal: normalizedStats.shots.total,
            shotsOn: normalizedStats.shots.on,
            passesTotal: normalizedStats.passes.total,
            passesKey: normalizedStats.passes.key,
            passesAccuracy: normalizedStats.passes.accuracy ? parseInt(String(normalizedStats.passes.accuracy), 10) : null,
            tacklesTotal: normalizedStats.tackles.total,
            tacklesBlocks: normalizedStats.tackles.blocks,
            tacklesInterceptions: normalizedStats.tackles.interceptions,
            duelsTotal: normalizedStats.duels.total,
            duelsWon: normalizedStats.duels.won,
            dribblesAttempts: normalizedStats.dribbles.attempts,
            dribblesSuccess: normalizedStats.dribbles.success,
            dribblesPast: normalizedStats.dribbles.past,
            foulsDrawn: normalizedStats.fouls.drawn,
            foulsCommitted: normalizedStats.fouls.committed,
            yellowCards: normalizedStats.cards.yellow,
            redCards: normalizedStats.cards.red,
            penaltyWon: normalizedStats.penalty.won,
            penaltyCommitted: normalizedStats.penalty.committed,
            penaltyScored: normalizedStats.penalty.scored,
            penaltyMissed: normalizedStats.penalty.missed,
            penaltySaved: normalizedStats.penalty.saved,
          },
          update: {
            fixtureId,
            teamId,
            totalPoints: pointsResult.total,
            pointsBreakdown: pointsResult.breakdown as any,
            minutes: normalizedStats.games.minutes,
            position: normalizedStats.games.position,
            rating: normalizedStats.games.rating ? String(normalizedStats.games.rating) : null,
            captain: normalizedStats.games.captain,
            substitute: normalizedStats.games.substitute,
            goals: normalizedStats.goals.total,
            assists: normalizedStats.goals.assists,
            conceded: normalizedStats.goalkeeper.conceded,
            saves: normalizedStats.goalkeeper.saves,
            shotsTotal: normalizedStats.shots.total,
            shotsOn: normalizedStats.shots.on,
            passesTotal: normalizedStats.passes.total,
            passesKey: normalizedStats.passes.key,
            passesAccuracy: normalizedStats.passes.accuracy ? parseInt(String(normalizedStats.passes.accuracy), 10) : null,
            tacklesTotal: normalizedStats.tackles.total,
            tacklesBlocks: normalizedStats.tackles.blocks,
            tacklesInterceptions: normalizedStats.tackles.interceptions,
            duelsTotal: normalizedStats.duels.total,
            duelsWon: normalizedStats.duels.won,
            dribblesAttempts: normalizedStats.dribbles.attempts,
            dribblesSuccess: normalizedStats.dribbles.success,
            dribblesPast: normalizedStats.dribbles.past,
            foulsDrawn: normalizedStats.fouls.drawn,
            foulsCommitted: normalizedStats.fouls.committed,
            yellowCards: normalizedStats.cards.yellow,
            redCards: normalizedStats.cards.red,
            penaltyWon: normalizedStats.penalty.won,
            penaltyCommitted: normalizedStats.penalty.committed,
            penaltyScored: normalizedStats.penalty.scored,
            penaltyMissed: normalizedStats.penalty.missed,
            penaltySaved: normalizedStats.penalty.saved,
            updatedAt: new Date()
          }
        });

        updated++;
      }
    }

    console.log('');
    // Delay entre fixtures para no saturar API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Recalculo completado:`);
  console.log(`   - Porteros actualizados: ${updated}`);
  console.log(`   - Partidos sin comenzar: ${skipped}`);

  await prisma.$disconnect();
}

recalculateGoalkeepers().catch(console.error);
