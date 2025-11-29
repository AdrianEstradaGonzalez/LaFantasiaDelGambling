import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';
import { calculatePlayerPoints, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

dotenv.config();

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY;
const SEASON = Number(process.env.FOOTBALL_API_SEASON ?? 2025);

const DIVISION_CONFIG = {
  primera: { leagueId: 140, name: 'La Liga' },
  segunda: { leagueId: 141, name: 'Segunda División' },
  premier: { leagueId: 39, name: 'Premier League' }
} as const;

/**
 * Script para actualizar TODAS las estadísticas de una jornada
 * Replica la lógica del endpoint /player-stats/update-jornada
 * pero procesa TODOS los partidos (no solo los en curso)
 * 
 * USO:
 * npx tsx scripts/update-all-jornada-stats.ts [jornada] [division]
 * 
 * Ejemplos:
 * npx tsx scripts/update-all-jornada-stats.ts 14 primera
 * npx tsx scripts/update-all-jornada-stats.ts 13 premier
 */

async function savePlayerStatsToDb(
  playerId: number,
  fixtureId: number,
  jornada: number,
  teamId: number,
  rawStats: any,
  totalPoints: number,
  breakdown: any[],
  division: 'primera' | 'segunda' | 'premier'
) {
  const statsTable = division === 'segunda' 
    ? 'playerSegundaStats' 
    : division === 'premier'
    ? 'playerPremierStats'
    : 'playerStats';

  const playerTable = division === 'segunda' 
    ? 'playerSegunda' 
    : division === 'premier'
    ? 'playerPremier'
    : 'player';

  try {
    // Verificar que el jugador existe en la tabla de jugadores
    const playerExists = await (prisma as any)[playerTable].findUnique({
      where: { id: playerId }
    });

    if (!playerExists) {
      // Silenciosamente saltar jugadores que no están en nuestra BD
      return;
    }

    await (prisma as any)[statsTable].upsert({
      where: {
        playerId_jornada_season: {
          playerId,
          jornada,
          season: SEASON
        }
      },
      create: {
        playerId,
        jornada,
        season: SEASON,
        teamId,
        fixtureId,
        minutes: rawStats.games?.minutes || 0,
        rating: rawStats.games?.rating ? String(rawStats.games.rating) : null,
        goals: rawStats.goals?.total || 0,
        assists: rawStats.goals?.assists || 0,
        saves: rawStats.goals?.saves || 0,
        conceded: rawStats.goals?.conceded || 0,
        yellowCards: rawStats.cards?.yellow || 0,
        redCards: rawStats.cards?.red || 0,
        penaltyScored: rawStats.penalty?.scored || 0,
        penaltyMissed: rawStats.penalty?.missed || 0,
        totalPoints,
        pointsBreakdown: breakdown || []
      },
      update: {
        teamId,
        fixtureId,
        minutes: rawStats.games?.minutes || 0,
        rating: rawStats.games?.rating ? String(rawStats.games.rating) : null,
        goals: rawStats.goals?.total || 0,
        assists: rawStats.goals?.assists || 0,
        saves: rawStats.goals?.saves || 0,
        conceded: rawStats.goals?.conceded || 0,
        yellowCards: rawStats.cards?.yellow || 0,
        redCards: rawStats.cards?.red || 0,
        penaltyScored: rawStats.penalty?.scored || 0,
        penaltyMissed: rawStats.penalty?.missed || 0,
        totalPoints,
        pointsBreakdown: breakdown || []
      }
    });
  } catch (error: any) {
    console.error(`   ❌ Error guardando stats del jugador ${playerId}:`, error.message);
  }
}

async function getAllJornadaFixtures(leagueId: number, jornada: number): Promise<any[]> {
  try {
    console.log(`📡 Obteniendo todos los partidos de la jornada ${jornada}...`);
    const { data } = await axios.get(`${API_BASE}/fixtures`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      params: {
        league: leagueId,
        season: SEASON,
        round: `Regular Season - ${jornada}`
      },
      timeout: 10000
    });

    const fixtures = data?.response || [];
    console.log(`✅ ${fixtures.length} partidos encontrados\n`);
    return fixtures;
  } catch (error: any) {
    console.error('❌ Error obteniendo fixtures:', error.message);
    return [];
  }
}

async function getFixturePlayerStats(fixtureObj: any, division: 'primera' | 'segunda' | 'premier'): Promise<Map<number, { points: number; breakdown: any[]; rawStats: any; teamId: number }>> {
  const playerStatsMap = new Map();
  
  try {
    const fixtureId = fixtureObj.fixture?.id;
    if (!fixtureId) return playerStatsMap;

    // Obtener estadísticas de jugadores
    const { data } = await axios.get(`${API_BASE}/fixtures/players`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      params: { fixture: fixtureId },
      timeout: 10000
    });

    const teamsData = data?.response || [];

    // Procesar cada equipo
    for (const teamData of teamsData) {
      const teamId = teamData.team?.id;
      if (!teamId) continue;

      const players = teamData.players || [];
      
      for (const playerData of players) {
        const playerId = playerData.player?.id;
        if (!playerId) continue;

        const stats = playerData.statistics?.[0];
        if (!stats) continue;

        // Obtener posición del jugador desde BD
        const playerTable = division === 'segunda' 
          ? 'playerSegunda' 
          : division === 'premier'
          ? 'playerPremier'
          : 'player';

        let position = 'M'; // Default
        try {
          const playerInfo = await (prisma as any)[playerTable].findUnique({
            where: { id: playerId },
            select: { position: true }
          });
          if (playerInfo?.position) {
            position = playerInfo.position;
          }
        } catch (e) {
          // Usar default
        }

        // Calcular puntos con breakdown
        const role = normalizeRole(position) as Role;
        const pointsResult = calculatePlayerPoints(stats, role);

        playerStatsMap.set(playerId, {
          points: pointsResult.total,
          breakdown: pointsResult.breakdown,
          rawStats: stats,
          teamId
        });
      }
    }
  } catch (error: any) {
    console.error(`⚠️  Error obteniendo stats del fixture:`, error.message);
  }

  return playerStatsMap;
}

async function updateJornadaStats() {
  console.log('🔄 ACTUALIZANDO ESTADÍSTICAS DE JORNADA\n');
  console.log(`📅 Temporada: ${SEASON}`);
  console.log(`🔑 API Key: ${API_KEY ? '✅ Configurada' : '❌ NO configurada'}\n`);

  if (!API_KEY) {
    console.error('❌ Error: FOOTBALL_API_KEY no está configurada en .env');
    process.exit(1);
  }

  // Obtener jornada y división de los argumentos
  const jornadaArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const divisionArg = (process.argv[3] || 'primera') as 'primera' | 'segunda' | 'premier';

  try {
    // Determinar la jornada
    let jornada: number;
    if (jornadaArg) {
      jornada = jornadaArg;
    } else {
      // Detectar jornada actual de la división
      const league = await prisma.league.findFirst({
        where: { division: divisionArg },
        select: { currentJornada: true }
      });
      jornada = league?.currentJornada || 1;
    }

    const leagueApiId = DIVISION_CONFIG[divisionArg].leagueId;
    console.log(`🏆 División: ${DIVISION_CONFIG[divisionArg].name}`);
    console.log(`📅 Jornada: ${jornada}`);
    console.log(`🏟️  League ID API: ${leagueApiId}\n`);

    // Obtener TODOS los partidos de la jornada
    const fixtures = await getAllJornadaFixtures(leagueApiId, jornada);
    
    if (fixtures.length === 0) {
      console.log('⚠️  No hay partidos para esta jornada');
      return;
    }

    // Filtrar solo partidos finalizados o en curso
    const validFixtures = fixtures.filter((f: any) => {
      const status = f.fixture?.status?.short;
      return status && !['CANC', 'PST', 'TBD', 'NS'].includes(status);
    });

    console.log(`✅ ${validFixtures.length} partidos válidos para procesar\n`);

    // Procesar cada partido
    let totalPlayersUpdated = 0;
    let fixturesProcessed = 0;

    for (const fixture of validFixtures) {
      const homeTeam = fixture.teams?.home?.name;
      const awayTeam = fixture.teams?.away?.name;
      const fixtureId = fixture.fixture?.id;
      
      console.log(`\n⚽ Procesando: ${homeTeam} vs ${awayTeam} (Fixture ${fixtureId})`);

      const playerStats = await getFixturePlayerStats(fixture, divisionArg);
      console.log(`   👥 ${playerStats.size} jugadores encontrados`);

      // Guardar estadísticas de cada jugador
      for (const [playerId, data] of playerStats) {
        await savePlayerStatsToDb(
          playerId,
          fixtureId,
          jornada,
          data.teamId,
          data.rawStats,
          data.points,
          data.breakdown,
          divisionArg
        );
        totalPlayersUpdated++;
      }

      fixturesProcessed++;
      console.log(`   ✅ Guardadas ${playerStats.size} estadísticas`);

      // Pequeño delay entre partidos
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(60));
    console.log(`🏆 División: ${DIVISION_CONFIG[divisionArg].name}`);
    console.log(`📅 Jornada: ${jornada}`);
    console.log(`⚽ Partidos procesados: ${fixturesProcessed}`);
    console.log(`👥 Jugadores actualizados: ${totalPlayersUpdated}`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
updateJornadaStats()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
