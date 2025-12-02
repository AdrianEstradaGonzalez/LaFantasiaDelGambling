import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';
import { calculatePlayerPoints, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

dotenv.config();

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY;
// La API usa el año de INICIO de la temporada (2024 para temporada 2024/2025)
const SEASON = Number(process.env.FOOTBALL_API_SEASON ?? 2024);

const DIVISION_CONFIG = {
  primera: { leagueId: 140, name: 'La Liga' },
  segunda: { leagueId: 141, name: 'Segunda División' },
  premier: { leagueId: 39, name: 'Premier League' }
} as const;

/**
 * Script para recalcular y actualizar los puntos de TODOS los partidos de una jornada
 * Útil para:
 * - Recalcular puntos después de cambios en el sistema de puntuación
 * - Corregir estadísticas incorrectas
 * - Reprocesar jornadas completas
 * 
 * USO:
 * npx tsx scripts/recalcular-puntos-partidos-hoy.ts [jornada] [division]
 * 
 * Ejemplos:
 * npx tsx scripts/recalcular-puntos-partidos-hoy.ts 14 primera
 * npx tsx scripts/recalcular-puntos-partidos-hoy.ts 13 premier
 * npx tsx scripts/recalcular-puntos-partidos-hoy.ts 12 segunda
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
    console.log(`   League ID: ${leagueId}, Season: ${SEASON}`);
    
    // Probar con múltiples temporadas (actual y anterior)
    const seasonsToTry = [SEASON, SEASON + 1, SEASON - 1];
    let fixtures: any[] = [];
    let foundSeason = SEASON;
    
    for (const season of seasonsToTry) {
      const params: any = {
        league: leagueId,
        season: season,
        round: `Regular Season - ${jornada}`
      };
      
      console.log(`   Intentando temporada ${season} con round: "${params.round}"`);
      
      try {
        const { data } = await axios.get(`${API_BASE}/fixtures`, {
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io'
          },
          params,
          timeout: 10000
        });

        fixtures = data?.response || [];
        
        if (fixtures.length > 0) {
          foundSeason = season;
          console.log(`   ✅ Encontrados ${fixtures.length} partidos en temporada ${season}`);
          break;
        } else {
          console.log(`   ⚠️  0 partidos en temporada ${season}`);
        }
      } catch (err: any) {
        console.log(`   ❌ Error en temporada ${season}:`, err.message);
      }
    }
    
    // Si no encuentra nada con ninguna temporada, intentar sin especificar round
    if (fixtures.length === 0) {
      console.log(`   ⚠️  No se encontraron partidos con ninguna temporada`);
      console.log(`   🔄 Buscando todos los partidos disponibles en temporada ${foundSeason}...`);
      
      const params = {
        league: leagueId,
        season: foundSeason
      };
      
      const allData = await axios.get(`${API_BASE}/fixtures`, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        params,
        timeout: 15000
      });
      
      const allFixtures = allData?.data?.response || [];
      console.log(`   📊 Total partidos en temporada ${foundSeason}: ${allFixtures.length}`);
      
      if (allFixtures.length > 0) {
        // Mostrar algunos ejemplos de rounds para debug
        const sampleRounds = [...new Set(allFixtures.slice(0, 20).map((f: any) => f.league?.round))];
        console.log(`   📝 Ejemplos de formato de round:`, sampleRounds);
        
        // Filtrar por jornada manualmente
        fixtures = allFixtures.filter((f: any) => {
          const round = f.league?.round || '';
          // Buscar el número de jornada en diferentes formatos
          const match = round.match(/\d+/);
          if (match) {
            const roundNum = parseInt(match[0], 10);
            return roundNum === jornada;
          }
          return false;
        });
        
        console.log(`   🔍 Partidos que coinciden con jornada ${jornada}: ${fixtures.length}`);
        
        if (fixtures.length > 0) {
          const uniqueRounds = [...new Set(fixtures.map((f: any) => f.league?.round))];
          console.log(`   ✅ Formato(s) de round encontrado(s):`, uniqueRounds);
        }
      }
    }

    console.log(`\n✅ Total: ${fixtures.length} partidos de la jornada ${jornada}\n`);
    return fixtures;
  } catch (error: any) {
    console.error('❌ Error obteniendo fixtures:', error.message);
    if (error.response?.data) {
      console.error('   Respuesta API:', JSON.stringify(error.response.data, null, 2));
    }
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
  console.log('🔄 RECALCULANDO PUNTOS DE TODA LA JORNADA\n');
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

    // Procesar TODOS los partidos de la jornada (finalizados, en curso o pendientes)
    // Solo excluimos cancelados/pospuestos
    const validFixtures = fixtures.filter((f: any) => {
      const status = f.fixture?.status?.short;
      return status && !['CANC', 'PST', 'ABD'].includes(status);
    });

    console.log(`✅ ${validFixtures.length} partidos de la jornada para procesar\n`);

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
    console.log('📊 RESUMEN - RECÁLCULO DE JORNADA COMPLETA');
    console.log('='.repeat(60));
    console.log(`🏆 División: ${DIVISION_CONFIG[divisionArg].name}`);
    console.log(`📅 Jornada: ${jornada}`);
    console.log(`⚽ Partidos procesados: ${fixturesProcessed} de ${validFixtures.length}`);
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
