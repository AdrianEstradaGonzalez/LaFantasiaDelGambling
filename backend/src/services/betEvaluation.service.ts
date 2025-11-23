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
const FALLBACK_APISPORTS_KEY = '07bc9c707fe2d6169fff6e17d4a9e6fd';

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

  // GANA LOCAL O VISITANTE (SIN EMPATE) - Home/Away
  if (betType.toLowerCase().includes('gana local o visitante') || 
      betType.toLowerCase().includes('sin empate') ||
      betType.toLowerCase().includes('home/away')) {
    const result = stats.homeGoals > stats.awayGoals ? 'local' : 
                   stats.awayGoals > stats.homeGoals ? 'visitante' : 'empate';
    
    let prediction = '';
    const labelLower = betLabel.toLowerCase();
    if (labelLower.includes('local') || labelLower.includes('home')) {
      prediction = 'local';
    } else if (labelLower.includes('visitante') || labelLower.includes('away')) {
      prediction = 'visitante';
    }

    // Si hay empate, todas las apuestas pierden
    if (result === 'empate') {
      console.log(`   ❌ Apuesta PERDIDA por empate: ${betLabel}`);
      return {
        won: false,
        actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam} - Empate (apuesta perdida)`
      };
    }

    // Si no hay empate, se evalúa normalmente
    return {
      won: result === prediction,
      actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam}`
    };
  }

  // GANA CON REEMBOLSO SI EMPATE (DRAW NO BET)
  if (betType.toLowerCase().includes('gana con reembolso') || betType.toLowerCase().includes('draw no bet')) {
    const result = stats.homeGoals > stats.awayGoals ? 'local' : 
                   stats.awayGoals > stats.homeGoals ? 'visitante' : 'empate';
    
    let prediction = '';
    if (betLabel.toLowerCase().includes('local') || betLabel.toLowerCase().includes('home')) {
      prediction = 'local';
    } else if (betLabel.toLowerCase().includes('visitante') || betLabel.toLowerCase().includes('away')) {
      prediction = 'visitante';
    }

    // Si hay empate, la apuesta se pierde
    if (result === 'empate') {
      console.log(`   ❌ Apuesta PERDIDA por empate: ${betLabel}`);
      return {
        won: false,
        actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam} - Empate (apuesta perdida)`
      };
    }

    return {
      won: result === prediction,
      actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam}`
    };
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
    // Normalizar label para comparación case-insensitive
    const labelLower = betLabel.toLowerCase().trim();
    
    // Si el label es "no", "ninguno", o contiene frases negativas, es predicción negativa
    const isNoPrediction = labelLower === 'no' || 
                          labelLower.includes('no ') || 
                          labelLower.includes('no ambos') || 
                          labelLower.includes('ninguno') ||
                          labelLower.includes('neither') ||
                          labelLower.includes('al menos un equipo no');
    
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

  // PORTERÍA A CERO (CLEAN SHEET)
  if (betType.toLowerCase().includes('portería') && betType.toLowerCase().includes('cero')) {
    const isLocal = betType.toLowerCase().includes('local');
    const isVisitante = betType.toLowerCase().includes('visitante');
    const labelLower = betLabel.toLowerCase();
    const isSi = labelLower === 'sí' || labelLower === 'si';
    
    if (isLocal) {
      // Portería a Cero - Local
      // Sí = el local no encajó goles (awayGoals === 0)
      // No = el local encajó goles (awayGoals > 0)
      const cleanSheet = stats.awayGoals === 0;
      return {
        won: isSi ? cleanSheet : !cleanSheet,
        actualResult: `${stats.homeTeam} encajó ${stats.awayGoals} goles`
      };
    }
    
    if (isVisitante) {
      // Portería a Cero - Visitante
      // Sí = el visitante no encajó goles (homeGoals === 0)
      // No = el visitante encajó goles (homeGoals > 0)
      const cleanSheet = stats.homeGoals === 0;
      return {
        won: isSi ? cleanSheet : !cleanSheet,
        actualResult: `${stats.awayTeam} encajó ${stats.homeGoals} goles`
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
 * Snapshot de apuestas por liga y jornada SIN llamadas a APIs externas
 * Usa únicamente el estado guardado en BD (won/lost/pending) y agrega balances.
 */
async function evaluateBetsRealTime(leagueId: string, jornada: number) {
  console.log(`📸 Snapshot de apuestas - Liga ${leagueId}, Jornada ${jornada} (sin llamadas externas)`);

  const bets = await prisma.bet.findMany({
    where: { leagueId, jornada },
    include: {
      leagueMember: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }
    },
    orderBy: { matchId: 'asc' }
  });

  if (bets.length === 0) {
    return { bets: [], userBalances: [], matchesEvaluated: 0 };
  }

  const evaluatedBets: any[] = bets.map((bet) => {
    const userName = bet.leagueMember?.user?.name || 'Usuario';
    const potentialWin = bet.status === 'won' ? bet.amount * bet.odd : 0;
    const profit = bet.status === 'won' ? (bet.amount * bet.odd) - bet.amount : bet.status === 'lost' ? -bet.amount : 0;
    const actualResult = bet.apiValue || (bet.status === 'pending' ? 'Pendiente (evaluación offline)' : 'Resultado guardado');

    return {
      betId: bet.id,
      userId: bet.userId,
      userName,
      userFullName: userName,
      matchId: bet.matchId,
      betType: bet.betType,
      betLabel: bet.betLabel,
      odd: bet.odd,
      amount: bet.amount,
      status: bet.status,
      potentialWin,
      profit,
      actualResult,
      homeTeam: bet.homeTeam || '',
      awayTeam: bet.awayTeam || '',
      homeGoals: null,
      awayGoals: null
    };
  });

  // Calcular balances por usuario
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
        netProfit: 0,
        betsWon: [],
        betsLost: [],
        betsPending: []
      });
    }

    const balance = userBalances.get(bet.userId)!;
    balance.totalBets++;
    balance.totalStaked += bet.amount;

    if (bet.status === 'won') {
      balance.wonBets++;
      balance.totalWinnings += bet.potentialWin;
      balance.betsWon.push(bet);
    } else if (bet.status === 'lost') {
      balance.lostBets++;
      balance.totalLosses += bet.amount;
      balance.betsLost.push(bet);
    } else {
      balance.pendingBets++;
      balance.betsPending.push(bet);
    }
  }

  const userBalancesArray = Array.from(userBalances.values()).map(b => ({
    ...b,
    netProfit: b.totalWinnings - b.totalLosses
  })).sort((a, b) => b.netProfit - a.netProfit);

  return { bets: evaluatedBets, userBalances: userBalancesArray, matchesEvaluated: 0 };
}

/**
 * Reevalúa TODAS las apuestas de la jornada actual de una liga
 * Incluye: ganadas, perdidas y pendientes
 * Compara con los resultados reales de la API y corrige discrepancias
 */
export async function reevaluateCurrentJornadaBets(leagueId: string): Promise<{
  evaluated: number;
  corrected: number;
  confirmed: number;
  stillPending: number;
  errors: string[];
  details: Array<{
    betId: string;
    oldStatus: string;
    newStatus: string;
    corrected: boolean;
    reason: string;
  }>;
}> {
  console.log(`\n🔍 Reevaluando apuestas de jornada actual - Liga ${leagueId}`);

  // Obtener la liga y su jornada actual
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, currentJornada: true, division: true }
  });

  if (!league) {
    throw new AppError(404, 'LEAGUE_NOT_FOUND', 'Liga no encontrada');
  }

  const currentJornada = league.currentJornada;
  console.log(`   Liga: ${league.name} (${league.division})`);
  console.log(`   Jornada actual: ${currentJornada}`);

  // Obtener TODAS las apuestas de la jornada actual (ganadas, perdidas, pendientes)
  const allBets = await prisma.bet.findMany({
    where: {
      leagueId,
      jornada: currentJornada
    },
    orderBy: {
      matchId: 'asc'
    }
  });

  console.log(`   📊 Total apuestas a reevaluar: ${allBets.length}`);
  console.log(`      - Ganadas: ${allBets.filter(b => b.status === 'won').length}`);
  console.log(`      - Perdidas: ${allBets.filter(b => b.status === 'lost').length}`);
  console.log(`      - Pendientes: ${allBets.filter(b => b.status === 'pending').length}`);

  if (allBets.length === 0) {
    console.log('   ✨ No hay apuestas en esta jornada');
    return { evaluated: 0, corrected: 0, confirmed: 0, stillPending: 0, errors: [], details: [] };
  }

  // Agrupar por matchId para minimizar llamadas a la API
  const betsByMatch = new Map<number, any[]>();
  for (const bet of allBets) {
    if (!betsByMatch.has(bet.matchId)) {
      betsByMatch.set(bet.matchId, []);
    }
    betsByMatch.get(bet.matchId)!.push(bet);
  }

  let evaluated = 0;
  let corrected = 0;
  let confirmed = 0;
  let stillPending = 0;
  const errors: string[] = [];
  const details: Array<{
    betId: string;
    oldStatus: string;
    newStatus: string;
    corrected: boolean;
    reason: string;
  }> = [];

  // Procesar cada partido
  for (const [matchId, bets] of betsByMatch.entries()) {
    try {
      console.log(`\n   🏟️  Partido ${matchId} (${bets.length} apuestas)`);
      
      // Obtener estadísticas del partido
      let stats: MatchStatistics;
      try {
        stats = await getMatchStatistics(matchId);
        console.log(`      Resultado: ${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam}`);
      } catch (error: any) {
        // Si el partido no ha terminado, mantener como pending
        if (error.code === 'MATCH_NOT_FINISHED') {
          console.log(`      ⏳ Partido aún no finalizado`);
          for (const bet of bets) {
            evaluated++;
            if (bet.status !== 'pending') {
              // Corregir: debería ser pending
              await prisma.bet.update({
                where: { id: bet.id },
                data: { status: 'pending' }
              });
              corrected++;
              details.push({
                betId: bet.id,
                oldStatus: bet.status,
                newStatus: 'pending',
                corrected: true,
                reason: 'Partido no finalizado, marcado como pending'
              });
              console.log(`      🔧 Apuesta ${bet.id}: ${bet.status} → pending (partido no finalizado)`);
            } else {
              stillPending++;
              details.push({
                betId: bet.id,
                oldStatus: bet.status,
                newStatus: bet.status,
                corrected: false,
                reason: 'Partido no finalizado'
              });
            }
          }
          continue;
        }
        throw error;
      }

      // Evaluar cada apuesta de este partido
      for (const bet of bets) {
        try {
          const oldStatus = bet.status;
          const evaluation = evaluateBet(bet, stats);
          const newStatus = evaluation.won ? 'won' : 'lost';
          
          evaluated++;

          // Comparar con el estado actual
          if (oldStatus !== newStatus) {
            // DISCREPANCIA DETECTADA - Corregir
            await prisma.bet.update({
              where: { id: bet.id },
              data: {
                status: newStatus,
                evaluatedAt: new Date(),
                apiValue: evaluation.actualResult
              }
            });

            corrected++;
            const emoji = newStatus === 'won' ? '✅' : '❌';
            console.log(`      🔧 CORREGIDA - Apuesta ${bet.id}:`);
            console.log(`         ${oldStatus} → ${newStatus} ${emoji}`);
            console.log(`         Tipo: ${bet.betLabel}`);
            console.log(`         Resultado: ${evaluation.actualResult}`);

            details.push({
              betId: bet.id,
              oldStatus,
              newStatus,
              corrected: true,
              reason: `Evaluación incorrecta: era "${oldStatus}" pero debería ser "${newStatus}". ${evaluation.actualResult}`
            });
          } else {
            // Estado correcto - solo actualizar evaluatedAt y apiValue si faltaban
            if (!bet.evaluatedAt || !bet.apiValue) {
              await prisma.bet.update({
                where: { id: bet.id },
                data: {
                  evaluatedAt: new Date(),
                  apiValue: evaluation.actualResult
                }
              });
            }

            confirmed++;
            const emoji = newStatus === 'won' ? '✅' : '❌';
            console.log(`      ✔️  Confirmada - Apuesta ${bet.id}: ${newStatus} ${emoji}`);

            details.push({
              betId: bet.id,
              oldStatus,
              newStatus,
              corrected: false,
              reason: `Evaluación confirmada como correcta: ${newStatus}`
            });
          }
        } catch (error: any) {
          const errorMsg = `Error reevaluando apuesta ${bet.id}: ${error.message}`;
          console.error(`      ⚠️  ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // Pequeño delay para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      const errorMsg = `Error obteniendo estadísticas del partido ${matchId}: ${error.message}`;
      console.error(`   ⚠️  ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log(`\n   📊 Resumen de reevaluación:`);
  console.log(`      Total evaluadas: ${evaluated}`);
  console.log(`      🔧 Corregidas: ${corrected}`);
  console.log(`      ✅ Confirmadas: ${confirmed}`);
  console.log(`      ⏳ Aún pendientes: ${stillPending}`);
  if (errors.length > 0) {
    console.log(`      ⚠️  Errores: ${errors.length}`);
  }

  return { evaluated, corrected, confirmed, stillPending, errors, details };
}

export const BetEvaluationService = {
  evaluatePendingBets,
  evaluateAllPendingBets,
  evaluateBetsRealTime,
  reevaluateCurrentJornadaBets,
};
