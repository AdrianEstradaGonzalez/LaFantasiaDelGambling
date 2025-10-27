/**
 * SERVICIO DE EVALUACIÓN DE APUESTAS
 * 
 * Evalúa apuestas pendientes consultando la API de Football
 * y comparando con los criterios guardados en cada apuesta.
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const FALLBACK_APISPORTS_KEY = '099ef4c6c0803639d80207d4ac1ad5da';

function buildHeaders() {
  const candidates = [
    process.env.FOOTBALL_API_KEY,
    process.env.APISPORTS_API_KEY,
    process.env.API_FOOTBALL_KEY,
    process.env.APISPORTS_KEY,
  ].filter(Boolean) as string[];

  if (candidates.length > 0) return { 'x-apisports-key': candidates[0] };

  const rapidCandidates = [
    process.env.RAPIDAPI_KEY,
    process.env.RAPIDAPI_FOOTBALL_KEY,
    process.env.API_FOOTBALL_RAPID_KEY,
  ].filter(Boolean) as string[];

  if (rapidCandidates.length > 0) {
    return { 
      'x-rapidapi-key': rapidCandidates[0], 
      'x-rapidapi-host': 'v3.football.api-sports.io' 
    };
  }

  return { 'x-apisports-key': FALLBACK_APISPORTS_KEY };
}

const api = axios.create({ 
  baseURL: API_BASE, 
  timeout: 15000, 
  headers: buildHeaders() 
});

interface MatchStatistics {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  status: string;
  homeGoals: number;
  awayGoals: number;
  homeCorners: number;
  awayCorners: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homeShotsOnGoal: number;
  awayShotsOnGoal: number;
  homePossession: number;
  awayPossession: number;
}

/**
 * Obtiene las estadísticas completas de un partido
 */
async function getMatchStatistics(matchId: number): Promise<MatchStatistics> {
  try {
    // Obtener información del partido
    const fixtureResponse = await api.get('/fixtures', {
      params: { id: matchId }
    });

    const fixture = fixtureResponse.data?.response?.[0];
    if (!fixture) {
      throw new AppError(404, 'MATCH_NOT_FOUND', `Partido ${matchId} no encontrado`);
    }

    // Verificar que el partido haya terminado
    const status = fixture.fixture?.status?.short;
    if (!['FT', 'AET', 'PEN'].includes(status)) {
      throw new AppError(400, 'MATCH_NOT_FINISHED', `Partido ${matchId} aún no ha terminado (estado: ${status})`);
    }

    // Obtener estadísticas del partido
    const statsResponse = await api.get('/fixtures/statistics', {
      params: { fixture: matchId }
    });

    const statistics = statsResponse.data?.response || [];
    
    // Extraer estadísticas de ambos equipos
    const homeStats = statistics[0]?.statistics || [];
    const awayStats = statistics[1]?.statistics || [];

    const getStat = (stats: any[], type: string): number => {
      const stat = stats.find((s: any) => s.type === type);
      return parseInt(stat?.value || '0') || 0;
    };

    return {
      fixtureId: matchId,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      status,
      homeGoals: fixture.goals.home || 0,
      awayGoals: fixture.goals.away || 0,
      homeCorners: getStat(homeStats, 'Corner Kicks'),
      awayCorners: getStat(awayStats, 'Corner Kicks'),
      homeYellowCards: getStat(homeStats, 'Yellow Cards'),
      awayYellowCards: getStat(awayStats, 'Yellow Cards'),
      homeRedCards: getStat(homeStats, 'Red Cards'),
      awayRedCards: getStat(awayStats, 'Red Cards'),
      homeShotsOnGoal: getStat(homeStats, 'Shots on Goal'),
      awayShotsOnGoal: getStat(awayStats, 'Shots on Goal'),
      homePossession: getStat(homeStats, 'Ball Possession'),
      awayPossession: getStat(awayStats, 'Ball Possession'),
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    console.error('Error fetching match statistics:', error);
    throw new AppError(500, 'API_ERROR', 'Error al obtener estadísticas del partido');
  }
}

/**
 * Evalúa una apuesta individual basándose en las estadísticas del partido
 */
function evaluateBet(bet: any, stats: MatchStatistics): { won: boolean; actualResult: string } {
  const betType = bet.betType.toLowerCase();
  const betLabel = bet.betLabel.toLowerCase();

  // GOLES TOTALES
  if (betType.includes('goles') || betType.includes('goals')) {
    const totalGoals = stats.homeGoals + stats.awayGoals;
    
    if (betLabel.includes('más de') || betLabel.includes('over')) {
      const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
      return {
        won: totalGoals > threshold,
        actualResult: `${totalGoals} goles totales`
      };
    }
    
    if (betLabel.includes('menos de') || betLabel.includes('under')) {
      const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
      return {
        won: totalGoals < threshold,
        actualResult: `${totalGoals} goles totales`
      };
    }

    if (betLabel.includes('exactamente')) {
      const exact = parseInt(betLabel.match(/\d+/)?.[0] || '0');
      return {
        won: totalGoals === exact,
        actualResult: `${totalGoals} goles totales`
      };
    }
  }

  // CÓRNERS
  if (betType.includes('córner') || betType.includes('corner')) {
    const totalCorners = stats.homeCorners + stats.awayCorners;
    
    if (betLabel.includes('más de') || betLabel.includes('over')) {
      const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
      return {
        won: totalCorners > threshold,
        actualResult: `${totalCorners} córners totales`
      };
    }
    
    if (betLabel.includes('menos de') || betLabel.includes('under')) {
      const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
      return {
        won: totalCorners < threshold,
        actualResult: `${totalCorners} córners totales`
      };
    }
  }

  // TARJETAS
  if (betType.includes('tarjeta') || betType.includes('card')) {
    const totalYellow = stats.homeYellowCards + stats.awayYellowCards;
    const totalRed = stats.homeRedCards + stats.awayRedCards;
    const totalCards = totalYellow + totalRed;
    
    if (betLabel.includes('más de') || betLabel.includes('over')) {
      const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
      return {
        won: totalCards > threshold,
        actualResult: `${totalCards} tarjetas (${totalYellow} amarillas, ${totalRed} rojas)`
      };
    }
    
    if (betLabel.includes('menos de') || betLabel.includes('under')) {
      const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
      return {
        won: totalCards < threshold,
        actualResult: `${totalCards} tarjetas (${totalYellow} amarillas, ${totalRed} rojas)`
      };
    }
  }

  // RESULTADO (1X2)
  if (betType.includes('resultado') || betType.includes('match result') || betType.includes('1x2')) {
    const result = stats.homeGoals > stats.awayGoals ? 'local' : 
                   stats.awayGoals > stats.homeGoals ? 'visitante' : 'empate';
    
    let prediction = '';
    if (betLabel.includes('local') || betLabel.includes('home') || betLabel === '1') {
      prediction = 'local';
    } else if (betLabel.includes('visitante') || betLabel.includes('away') || betLabel === '2') {
      prediction = 'visitante';
    } else if (betLabel.includes('empate') || betLabel.includes('draw') || betLabel === 'x') {
      prediction = 'empate';
    }

    return {
      won: result === prediction,
      actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam}`
    };
  }

  // AMBOS MARCAN
  if (betType.includes('ambos') || betType.includes('both') || betType.includes('btts')) {
    const bothScored = stats.homeGoals > 0 && stats.awayGoals > 0;
    
    // Determinar si la predicción es "Sí" (ambos marcan) o "No" (no ambos marcan)
    // Si el label incluye "no" o "ninguno", es predicción negativa
    const isNoPrediction = betLabel.includes('no ') || 
                          betLabel.includes('no ambos') || 
                          betLabel.includes('ninguno') ||
                          betLabel.includes('neither');
    
    // Si no es predicción negativa, cualquier otra cosa implica "Sí"
    const prediction = !isNoPrediction;
    
    console.log(`   🔍 Evaluando "Ambos marcan":`);
    console.log(`      - Label: "${betLabel}"`);
    console.log(`      - Predicción interpretada: ${prediction ? 'SÍ ambos marcan' : 'NO ambos marcan'}`);
    console.log(`      - Resultado real: ${bothScored ? 'Ambos marcaron' : 'No ambos marcaron'}`);
    console.log(`      - Goles: ${stats.homeTeam} ${stats.homeGoals} - ${stats.awayGoals} ${stats.awayTeam}`);
    
    return {
      won: bothScored === prediction,
      actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam} - ${bothScored ? 'Ambos marcaron' : 'No ambos marcaron'}`
    };
  }

  // TIROS A PUERTA
  if (betType.includes('tiros') || betType.includes('shots')) {
    const totalShots = stats.homeShotsOnGoal + stats.awayShotsOnGoal;
    
    if (betLabel.includes('más de') || betLabel.includes('over')) {
      const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
      return {
        won: totalShots > threshold,
        actualResult: `${totalShots} tiros a puerta`
      };
    }
    
    if (betLabel.includes('menos de') || betLabel.includes('under')) {
      const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
      return {
        won: totalShots < threshold,
        actualResult: `${totalShots} tiros a puerta`
      };
    }
  }

  // Si no se puede evaluar, retornar como no ganada
  return {
    won: false,
    actualResult: 'Tipo de apuesta no soportado para evaluación automática'
  };
}

/**
 * Evalúa todas las apuestas pendientes de una liga
 */
export async function evaluatePendingBets(leagueId: string): Promise<{
  evaluated: number;
  won: number;
  lost: number;
  errors: string[];
}> {
  console.log(`🎲 Evaluando apuestas pendientes para liga ${leagueId}...`);

  // Obtener todas las apuestas pendientes de la liga
  const pendingBets = await prisma.bet.findMany({
    where: {
      leagueId,
      status: 'pending'
    },
    orderBy: {
      matchId: 'asc'
    }
  });

  console.log(`📊 Query ejecutada con leagueId: ${leagueId}`);
  console.log(`📊 Apuestas encontradas: ${pendingBets.length}`);
  
  if (pendingBets.length > 0) {
    console.log(`📊 Primera apuesta encontrada:`, {
      id: pendingBets[0].id,
      leagueId: pendingBets[0].leagueId,
      matchId: pendingBets[0].matchId,
      betType: pendingBets[0].betType,
      status: pendingBets[0].status
    });
  }

  if (pendingBets.length === 0) {
    console.log('✅ No hay apuestas pendientes para evaluar');
    return { evaluated: 0, won: 0, lost: 0, errors: [] };
  }

  console.log(`📊 Total de apuestas pendientes a evaluar: ${pendingBets.length}`);

  // Agrupar apuestas por matchId para minimizar llamadas a la API
  const betsByMatch = new Map<number, any[]>();
  for (const bet of pendingBets) {
    if (!betsByMatch.has(bet.matchId)) {
      betsByMatch.set(bet.matchId, []);
    }
    betsByMatch.get(bet.matchId)!.push(bet);
  }

  let evaluated = 0;
  let won = 0;
  let lost = 0;
  const errors: string[] = [];

  // Procesar cada partido
  for (const [matchId, bets] of betsByMatch.entries()) {
    try {
      console.log(`\n🏟️  Evaluando partido ${matchId} (${bets.length} apuestas)...`);
      
      // Obtener estadísticas del partido
      const stats = await getMatchStatistics(matchId);
      console.log(`   Resultado: ${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam}`);

      // Evaluar cada apuesta de este partido
      for (const bet of bets) {
        try {
          const evaluation = evaluateBet(bet, stats);
          
          // Actualizar la apuesta en la base de datos
          await prisma.bet.update({
            where: { id: bet.id },
            data: {
              status: evaluation.won ? 'won' : 'lost',
              evaluatedAt: new Date(),
              apiValue: evaluation.actualResult // Guardar resultado real
            }
          });

          evaluated++;
          if (evaluation.won) {
            won++;
            console.log(`   ✅ Apuesta ${bet.id}: GANADA - ${bet.betLabel} (${evaluation.actualResult})`);
          } else {
            lost++;
            console.log(`   ❌ Apuesta ${bet.id}: PERDIDA - ${bet.betLabel} (${evaluation.actualResult})`);
          }
        } catch (error: any) {
          const errorMsg = `Error evaluando apuesta ${bet.id}: ${error.message}`;
          console.error(`   ⚠️  ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // Pequeño delay para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      const errorMsg = `Error obteniendo estadísticas del partido ${matchId}: ${error.message}`;
      console.error(`⚠️  ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log(`\n✅ Evaluación completada:`);
  console.log(`   - Evaluadas: ${evaluated}`);
  console.log(`   - Ganadas: ${won}`);
  console.log(`   - Perdidas: ${lost}`);
  if (errors.length > 0) {
    console.log(`   - Errores: ${errors.length}`);
  }

  return { evaluated, won, lost, errors };
}

/**
 * Evalúa todas las apuestas pendientes de TODAS las ligas
 */
async function evaluateAllPendingBets() {
  console.log('🌍 Iniciando evaluación de apuestas para TODAS las ligas...\n');

  // Obtener todas las ligas que tienen miembros con apuestas pendientes
  const leagues = await prisma.league.findMany({
    where: {
      members: {
        some: {
          bets: {
            some: {
              status: 'pending'
            }
          }
        }
      }
    },
    include: {
      members: {
        include: {
          bets: {
            where: { status: 'pending' }
          }
        }
      }
    }
  });

  console.log(`📊 Encontradas ${leagues.length} ligas con apuestas pendientes:`);
  leagues.forEach(league => {
    const pendingBets = league.members.reduce((total, member) => total + member.bets.length, 0);
    console.log(`   - ${league.name}: ${pendingBets} apuestas pendientes`);
  });
  console.log('');

  let totalEvaluated = 0;
  let totalWon = 0;
  let totalLost = 0;
  const allErrors: string[] = [];
  const leagueResults: Array<{
    leagueId: string;
    leagueName: string;
    evaluated: number;
    won: number;
    lost: number;
    errors: string[];
  }> = [];

  // Evaluar cada liga
  for (const league of leagues) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏆 Evaluando liga: ${league.name} (${league.id})`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const result = await evaluatePendingBets(league.id);
      
      totalEvaluated += result.evaluated;
      totalWon += result.won;
      totalLost += result.lost;
      allErrors.push(...result.errors);

      leagueResults.push({
        leagueId: league.id,
        leagueName: league.name,
        evaluated: result.evaluated,
        won: result.won,
        lost: result.lost,
        errors: result.errors
      });

    } catch (error: any) {
      const errorMsg = `Error evaluando liga ${league.name}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      allErrors.push(errorMsg);
      
      leagueResults.push({
        leagueId: league.id,
        leagueName: league.name,
        evaluated: 0,
        won: 0,
        lost: 0,
        errors: [errorMsg]
      });
    }

    // Delay entre ligas para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Resumen final
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 RESUMEN GLOBAL - TODAS LAS LIGAS`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`✅ Total evaluadas: ${totalEvaluated}`);
  console.log(`🎉 Total ganadas: ${totalWon}`);
  console.log(`💔 Total perdidas: ${totalLost}`);
  if (allErrors.length > 0) {
    console.log(`⚠️  Total errores: ${allErrors.length}`);
  }
  console.log('\n📋 Detalle por liga:');
  leagueResults.forEach(result => {
    console.log(`   ${result.leagueName}: ${result.evaluated} evaluadas (${result.won}✅ / ${result.lost}❌)`);
  });
  console.log('');

  return {
    totalEvaluated,
    totalWon,
    totalLost,
    totalErrors: allErrors.length,
    leagues: leagueResults,
    errors: allErrors
  };
}

/**
 * Evalúa apuestas en tiempo real SIN actualizar la base de datos
 * Retorna el estado actual de las apuestas basándose en los resultados de los partidos
 */
async function evaluateBetsRealTime(leagueId: string, jornada: number) {
  console.log(`⚡ Evaluación en tiempo real - Liga ${leagueId}, Jornada ${jornada}`);

  // Obtener todas las apuestas de la jornada (sin filtrar por status)
  const bets = await prisma.bet.findMany({
    where: {
      leagueId,
      jornada
    },
    include: {
      leagueMember: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    },
    orderBy: {
      matchId: 'asc'
    }
  });

  if (bets.length === 0) {
    return { bets: [], userBalances: [], matchesEvaluated: 0 };
  }

  console.log(`📊 Apuestas encontradas: ${bets.length}`);

  // Agrupar apuestas por matchId
  const betsByMatch = new Map<number, any[]>();
  for (const bet of bets) {
    if (!betsByMatch.has(bet.matchId)) {
      betsByMatch.set(bet.matchId, []);
    }
    betsByMatch.get(bet.matchId)!.push(bet);
  }

  const evaluatedBets: any[] = [];
  let matchesEvaluated = 0;

  // Procesar cada partido
  for (const [matchId, matchBets] of betsByMatch.entries()) {
    try {
      console.log(`🏟️  Consultando partido ${matchId}...`);
      
      // Obtener estadísticas del partido
      const stats = await getMatchStatistics(matchId);
      console.log(`   ✅ ${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam}`);
      matchesEvaluated++;

      // Evaluar cada apuesta de este partido
      for (const bet of matchBets) {
        const evaluation = evaluateBet(bet, stats);
        
        const userName = bet.leagueMember?.user?.name || 'Usuario';
        
        evaluatedBets.push({
          betId: bet.id,
          userId: bet.userId,
          userName: userName,
          userFullName: userName,
          matchId: bet.matchId,
          betType: bet.betType,
          betLabel: bet.betLabel,
          odd: bet.odd,
          amount: bet.amount,
          status: evaluation.won ? 'won' : 'lost',
          potentialWin: evaluation.won ? bet.amount * bet.odd : 0,
          profit: evaluation.won ? (bet.amount * bet.odd) - bet.amount : -bet.amount,
          actualResult: evaluation.actualResult,
          homeTeam: stats.homeTeam,
          awayTeam: stats.awayTeam,
          homeGoals: stats.homeGoals,
          awayGoals: stats.awayGoals
        });

        console.log(`   ${evaluation.won ? '✅' : '❌'} ${userName}: ${bet.betLabel} (${bet.amount}M × ${bet.odd})`);
      }

      // Delay para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error(`⚠️  Error en partido ${matchId}: ${error.message}`);
      
      // Para partidos no finalizados o con error, marcar como pendientes
      for (const bet of matchBets) {
        const userName = bet.leagueMember?.user?.name || 'Usuario';
        
        evaluatedBets.push({
          betId: bet.id,
          userId: bet.userId,
          userName: userName,
          userFullName: userName,
          matchId: bet.matchId,
          betType: bet.betType,
          betLabel: bet.betLabel,
          odd: bet.odd,
          amount: bet.amount,
          status: 'pending',
          potentialWin: 0,
          profit: 0,
          actualResult: 'Partido no finalizado',
          homeTeam: '',
          awayTeam: '',
          homeGoals: null,
          awayGoals: null
        });
      }
    }
  }

  // Calcular balance por usuario
  const userBalances = new Map<string, any>();
  
  for (const bet of evaluatedBets) {
    if (!userBalances.has(bet.userId)) {
      userBalances.set(bet.userId, {
        userId: bet.userId,
        userName: bet.userName,
        userFullName: bet.userFullName,
        totalBets: 0,
        totalStaked: 0,
        wonBets: 0,
        lostBets: 0,
        pendingBets: 0,
        totalWinnings: 0,
        totalLosses: 0,
        netProfit: 0
      });
    }

    const balance = userBalances.get(bet.userId)!;
    balance.totalBets++;
    balance.totalStaked += bet.amount;

    if (bet.status === 'won') {
      balance.wonBets++;
      balance.totalWinnings += bet.potentialWin;
      balance.netProfit += bet.profit;
    } else if (bet.status === 'lost') {
      balance.lostBets++;
      balance.totalLosses += bet.amount;
      balance.netProfit += bet.profit;
    } else {
      balance.pendingBets++;
    }
  }

  const userBalancesArray = Array.from(userBalances.values()).sort((a, b) => b.netProfit - a.netProfit);

  console.log(`\n✅ Evaluación en tiempo real completada:`);
  console.log(`   - Partidos evaluados: ${matchesEvaluated}`);
  console.log(`   - Apuestas procesadas: ${evaluatedBets.length}`);
  console.log(`   - Usuarios: ${userBalancesArray.length}`);

  return {
    bets: evaluatedBets,
    userBalances: userBalancesArray,
    matchesEvaluated
  };
}

export const BetEvaluationService = {
  evaluatePendingBets,
  evaluateAllPendingBets,
  evaluateBetsRealTime,
};
