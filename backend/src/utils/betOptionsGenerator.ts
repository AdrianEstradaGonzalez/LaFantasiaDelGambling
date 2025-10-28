/**
 * UTILIDAD PARA GENERAR OPCIONES DE APUESTA
 * 
 * Esta función obtiene todas las apuestas disponibles de la API para una jornada
 * y genera opciones aleatorias para cada liga (1 apuesta por partido).
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const HEADERS = {
  'x-rapidapi-key': API_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io',
};
const LA_LIGA_LEAGUE_ID = 140;
const SEASON = 2025;

// Mapa de traducción de tipos de apuesta al español
const BET_TYPE_TRANSLATIONS: Record<string, string> = {
  'Match Winner': 'Ganador del Partido',
  'Goals Over/Under': 'Más/Menos Goles',
  'Both Teams Score': 'Ambos Equipos Marcan',
  'Home/Away': 'Local/Visitante',
  'Corners Over/Under': 'Más/Menos Corners',
  'Cards Over/Under': 'Más/Menos Tarjetas',
  'Double Chance': 'Doble Oportunidad',
  'Clean Sheet': 'Portería a Cero',
  'Clean Sheet - Home': 'Portería a Cero - Local',
  'Clean Sheet - Away': 'Portería a Cero - Visitante',
  'Exact Score': 'Resultado Exacto',
  'First Half Winner': 'Ganador Primera Parte',
  'Second Half Winner': 'Ganador Segunda Parte',
  'Odd/Even': 'Par/Impar',
  'Total Goals': 'Total de Goles',
  'Home Team Total Goals': 'Goles Local',
  'Away Team Total Goals': 'Goles Visitante',
};

// Mapa de traducción de opciones de apuesta al español
const BET_LABEL_TRANSLATIONS: Record<string, string> = {
  'Home': 'Local',
  'Draw': 'Empate',
  'Away': 'Visitante',
  'Yes': 'Sí',
  'No': 'No',
  'Over': 'Más de',
  'Under': 'Menos de',
  'Home/Draw': 'Local o Empate',
  'Home/Away': 'Local o Visitante',
  'Draw/Away': 'Empate o Visitante',
  'Odd': 'Impar',
  'Even': 'Par',
};

function translateBetType(betType: string): string {
  // Intentar traducción directa
  if (BET_TYPE_TRANSLATIONS[betType]) {
    return BET_TYPE_TRANSLATIONS[betType];
  }
  
  // Traducir casos especiales que pueden venir con diferentes formatos
  const lowerType = betType.toLowerCase();
  
  if (lowerType.includes('goals') && (lowerType.includes('over') || lowerType.includes('under'))) {
    return 'Más/Menos Goles';
  }
  if (lowerType.includes('corners') && (lowerType.includes('over') || lowerType.includes('under'))) {
    return 'Más/Menos Corners';
  }
  if (lowerType.includes('cards') && (lowerType.includes('over') || lowerType.includes('under'))) {
    return 'Más/Menos Tarjetas';
  }
  if (lowerType.includes('both') && lowerType.includes('score')) {
    return 'Ambos Equipos Marcan';
  }
  if (lowerType.includes('clean sheet')) {
    if (lowerType.includes('home')) return 'Portería a Cero - Local';
    if (lowerType.includes('away')) return 'Portería a Cero - Visitante';
    return 'Portería a Cero';
  }
  if (lowerType.includes('winner')) {
    if (lowerType.includes('first half')) return 'Ganador Primera Parte';
    if (lowerType.includes('second half')) return 'Ganador Segunda Parte';
    return 'Ganador del Partido';
  }
  
  return betType;
}

function translateBetLabel(betLabel: string, homeTeam?: string, awayTeam?: string): string {
  // Primero intentar traducción directa
  if (BET_LABEL_TRANSLATIONS[betLabel]) {
    return BET_LABEL_TRANSLATIONS[betLabel];
  }
  
  // Traducir Over/Under con números (diferentes formatos)
  if (betLabel.startsWith('Over ')) {
    const value = betLabel.replace('Over ', '');
    return `Más de ${value}`;
  }
  if (betLabel.startsWith('Under ')) {
    const value = betLabel.replace('Under ', '');
    return `Menos de ${value}`;
  }
  
  // Casos especiales de Clean Sheet
  if (betLabel.toLowerCase().includes('clean sheet')) {
    if (betLabel.toLowerCase().includes('home')) return 'Sí - Local';
    if (betLabel.toLowerCase().includes('away')) return 'Sí - Visitante';
    if (betLabel.toLowerCase().includes('yes')) return 'Sí';
    if (betLabel.toLowerCase().includes('no')) return 'No';
  }
  
  // Si es un nombre de equipo, mantenerlo tal cual
  if (homeTeam && betLabel === homeTeam) return homeTeam;
  if (awayTeam && betLabel === awayTeam) return awayTeam;
  
  // Si contiene el nombre de un equipo, mantenerlo
  if (homeTeam && betLabel.includes(homeTeam)) return betLabel;
  if (awayTeam && betLabel.includes(awayTeam)) return betLabel;
  
  return betLabel;
}

interface BetOption {
  tipo: string;
  opcion: string;
  cuota: string;
}

interface MatchBets {
  idPartido: number;
  equipoLocal: string;
  equipoVisitante: string;
  apuestas: BetOption[];
}

async function fetchFixtures(jornada: number) {
  const url = `${API_BASE}/fixtures`;
  const params = {
    league: LA_LIGA_LEAGUE_ID,
    season: SEASON,
    round: `Regular Season - ${jornada}`
  };

  const response = await axios.get(url, { headers: HEADERS, params });
  
  if (response.data.results === 0) {
    return [];
  }

  return response.data.response;
}

async function fetchOddsForFixture(fixtureId: number, homeTeam: string, awayTeam: string): Promise<MatchBets | null> {
  try {
    const url = `${API_BASE}/odds`;
    const params = { fixture: fixtureId };

    const response = await axios.get(url, { headers: HEADERS, params });
    
    if (response.data.results === 0) {
      return createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam);
    }

    const oddsData = response.data.response[0];
    
    if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
      return createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam);
    }

    const bookmaker = oddsData.bookmakers[0];
    const validBets: BetOption[] = [];
    
    bookmaker.bets.forEach((bet: any) => {
      // Ignorar handicaps
      if (bet.name.toLowerCase().includes('handicap')) {
        return;
      }
      
      const betNameLower = bet.name.toLowerCase();
      
      // Caso especial: Match Winner (puede tener 3 opciones)
      const isMatchWinner = betNameLower.includes('match winner') || 
                            (betNameLower.includes('winner') && !betNameLower.includes('first') && !betNameLower.includes('second')) ||
                            (bet.values.length === 3 && 
                             bet.values.some((v: any) => v.value === 'Home') &&
                             bet.values.some((v: any) => v.value === 'Draw') &&
                             bet.values.some((v: any) => v.value === 'Away'));
      
      if (isMatchWinner && bet.values.length === 3) {
        const validValues = bet.values.filter((value: any) => {
          const odd = parseFloat(value.odd);
          return odd >= 1.40 && odd <= 3.00;
        });
        
        // Solo agregar si las 3 opciones están en rango
        if (validValues.length === 3) {
          validValues.forEach((value: any) => {
            validBets.push({
              tipo: translateBetType(bet.name),
              opcion: translateBetLabel(value.value, homeTeam, awayTeam),
              cuota: value.odd
            });
          });
        }
        return;
      }
      
      // Over/Under: Tomar TODOS los pares que estén en rango
      const isOverUnder = betNameLower.includes('over') || betNameLower.includes('under');
      
      if (isOverUnder) {
        // Agrupar por línea (2.5, 3.5, 8.5, etc.)
        const linesMap = new Map<string, { over?: any, under?: any }>();
        
        bet.values.forEach((value: any) => {
          const valueStr = value.value as string;
          if (valueStr.includes('Over')) {
            const line = valueStr.replace('Over ', '');
            if (!linesMap.has(line)) linesMap.set(line, {});
            linesMap.get(line)!.over = value;
          } else if (valueStr.includes('Under')) {
            const line = valueStr.replace('Under ', '');
            if (!linesMap.has(line)) linesMap.set(line, {});
            linesMap.get(line)!.under = value;
          }
        });
        
        // Agregar cada par completo que esté en rango
        linesMap.forEach((pair, line) => {
          if (pair.over && pair.under) {
            const overOdd = parseFloat(pair.over.odd);
            const underOdd = parseFloat(pair.under.odd);
            
            if (overOdd >= 1.40 && overOdd <= 3.00 && underOdd >= 1.40 && underOdd <= 3.00) {
              validBets.push({
                tipo: translateBetType(bet.name),
                opcion: translateBetLabel(pair.over.value, homeTeam, awayTeam),
                cuota: pair.over.odd
              });
              validBets.push({
                tipo: translateBetType(bet.name),
                opcion: translateBetLabel(pair.under.value, homeTeam, awayTeam),
                cuota: pair.under.odd
              });
            }
          }
        });
        return;
      }
      
      // Resto de apuestas binarias (Yes/No, Home/Away, etc.): SOLO 2 opciones contrarias
      if (bet.values.length === 2) {
        const validValues = bet.values.filter((value: any) => {
          const odd = parseFloat(value.odd);
          return odd >= 1.40 && odd <= 3.00;
        });
        
        // Solo agregar si ambas opciones están en rango
        if (validValues.length === 2) {
          validValues.forEach((value: any) => {
            validBets.push({
              tipo: translateBetType(bet.name),
              opcion: translateBetLabel(value.value, homeTeam, awayTeam),
              cuota: value.odd
            });
          });
        }
      }
      
      // Apuestas con 3 opciones que NO son Match Winner (ej: Double Chance)
      // Estas también las incluimos si todas están en rango
      if (bet.values.length === 3 && !isMatchWinner) {
        const validValues = bet.values.filter((value: any) => {
          const odd = parseFloat(value.odd);
          return odd >= 1.40 && odd <= 3.00;
        });
        
        if (validValues.length === 3) {
          validValues.forEach((value: any) => {
            validBets.push({
              tipo: translateBetType(bet.name),
              opcion: translateBetLabel(value.value, homeTeam, awayTeam),
              cuota: value.odd
            });
          });
        }
      }
    });
    
    // Agregar apuestas sintéticas (corners, tarjetas)
    addSyntheticBets(validBets);
    
    return {
      idPartido: fixtureId,
      equipoLocal: homeTeam,
      equipoVisitante: awayTeam,
      apuestas: validBets
    };
  } catch (error: any) {
    console.error(`Error obteniendo cuotas para partido ${fixtureId}:`, error.message);
    return createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam);
  }
}

function addSyntheticBets(validBets: BetOption[]) {
  validBets.push(
    {
      tipo: 'Más/Menos Corners',
      opcion: 'Más de 8.5',
      cuota: '2.10'
    },
    {
      tipo: 'Más/Menos Corners',
      opcion: 'Menos de 8.5',
      cuota: '1.90'
    },
    {
      tipo: 'Más/Menos Tarjetas',
      opcion: 'Más de 4.5',
      cuota: '2.10'
    },
    {
      tipo: 'Más/Menos Tarjetas',
      opcion: 'Menos de 4.5',
      cuota: '1.90'
    }
  );
}

function createSyntheticOnlyBets(fixtureId: number, homeTeam: string, awayTeam: string): MatchBets {
  const validBets: BetOption[] = [];
  addSyntheticBets(validBets);
  
  return {
    idPartido: fixtureId,
    equipoLocal: homeTeam,
    equipoVisitante: awayTeam,
    apuestas: validBets
  };
}

function groupBetsByType(bets: BetOption[]): Map<string, BetOption[]> {
  const grouped = new Map<string, BetOption[]>();
  
  for (const bet of bets) {
    if (!grouped.has(bet.tipo)) {
      grouped.set(bet.tipo, []);
    }
    grouped.get(bet.tipo)!.push(bet);
  }
  
  return grouped;
}

function selectRandomBetForMatch(matchBets: MatchBets): BetOption[] {
  const grouped = groupBetsByType(matchBets.apuestas);
  const betTypes = Array.from(grouped.keys());
  
  if (betTypes.length === 0) {
    return [];
  }
  
  const randomType = betTypes[Math.floor(Math.random() * betTypes.length)];
  return grouped.get(randomType)!;
}

async function generateBetOptionsForLeague(
  leagueId: string,
  jornada: number,
  allMatchBets: MatchBets[]
) {
  const betOptionsToSave: any[] = [];
  
  for (const matchBets of allMatchBets) {
    const selectedBets = selectRandomBetForMatch(matchBets);
    
    for (const bet of selectedBets) {
      betOptionsToSave.push({
        matchId: matchBets.idPartido,
        homeTeam: matchBets.equipoLocal,
        awayTeam: matchBets.equipoVisitante,
        betType: bet.tipo,
        betLabel: bet.opcion,
        odd: parseFloat(bet.cuota)
      });
    }
  }
  
  if (betOptionsToSave.length > 0) {
    await saveBetOptions(leagueId, jornada, betOptionsToSave);
  }
  
  return betOptionsToSave.length;
}

async function saveBetOptions(
  leagueId: string,
  jornada: number,
  options: Array<{
    matchId: number;
    homeTeam: string;
    awayTeam: string;
    betType: string;
    betLabel: string;
    odd: number;
  }>
) {
  await prisma.bet_option.deleteMany({
    where: { leagueId, jornada },
  });

  await prisma.bet_option.createMany({
    data: options.map(opt => ({
      id: `${leagueId}_${jornada}_${opt.matchId}_${opt.betType}_${opt.betLabel}`.replace(/\s+/g, '_'),
      leagueId,
      jornada,
      matchId: opt.matchId,
      homeTeam: opt.homeTeam,
      awayTeam: opt.awayTeam,
      betType: opt.betType,
      betLabel: opt.betLabel,
      odd: opt.odd,
    })),
  });
}

export async function generateBetOptionsForAllLeagues(jornada: number): Promise<{
  success: boolean;
  matchesProcessed: number;
  leaguesUpdated: number;
  totalOptions: number;
}> {
  console.log(`\n🎲 Generando apuestas para jornada ${jornada}...\n`);

  try {
    // 1. Obtener fixtures
    const fixtures = await fetchFixtures(jornada);
    
    if (fixtures.length === 0) {
      console.log('⚠️  No hay fixtures disponibles');
      return {
        success: false,
        matchesProcessed: 0,
        leaguesUpdated: 0,
        totalOptions: 0,
      };
    }

    console.log(`✅ ${fixtures.length} partidos encontrados`);

    // 2. Obtener todas las apuestas posibles
    const allMatchBets: MatchBets[] = [];
    
    for (const fixture of fixtures) {
      const matchBets = await fetchOddsForFixture(
        fixture.fixture.id,
        fixture.teams.home.name,
        fixture.teams.away.name
      );
      
      if (matchBets) {
        allMatchBets.push(matchBets);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Apuestas obtenidas para ${allMatchBets.length} partidos\n`);

    // 3. Obtener todas las ligas
    const leagues = await prisma.league.findMany({
      select: { id: true, name: true },
    });

    console.log(`📋 ${leagues.length} ligas activas\n`);

    // 4. Generar apuestas para cada liga
    let totalOptions = 0;
    
    for (const league of leagues) {
      const optionsCount = await generateBetOptionsForLeague(league.id, jornada, allMatchBets);
      totalOptions += optionsCount;
      console.log(`   ✅ Liga "${league.name}": ${optionsCount} opciones`);
    }

    console.log(`\n✅ Total: ${totalOptions} opciones de apuesta generadas\n`);

    return {
      success: true,
      matchesProcessed: allMatchBets.length,
      leaguesUpdated: leagues.length,
      totalOptions,
    };
  } catch (error: any) {
    console.error('❌ Error generando apuestas:', error.message);
    throw error;
  }
}

// Public wrapper to generate bet options for a single league using the same logic
export async function generateBetOptionsForLeaguePublic(leagueId: string, jornada: number): Promise<{
  success: boolean;
  matchesProcessed: number;
  optionsCount: number;
}> {
  console.log(`\n🎲 Generando apuestas para liga ${leagueId} jornada ${jornada}...\n`);
  try {
    const fixtures = await fetchFixtures(jornada);
    if (fixtures.length === 0) {
      console.log('⚠️  No hay fixtures disponibles para generar apuestas');
      return { success: false, matchesProcessed: 0, optionsCount: 0 };
    }

    const allMatchBets: MatchBets[] = [];
    for (const fixture of fixtures) {
      const matchBets = await fetchOddsForFixture(
        fixture.fixture.id,
        fixture.teams.home.name,
        fixture.teams.away.name
      );
      if (matchBets) allMatchBets.push(matchBets);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const optionsCount = await generateBetOptionsForLeague(leagueId, jornada, allMatchBets);
    return { success: true, matchesProcessed: allMatchBets.length, optionsCount };
  } catch (error: any) {
    console.error('❌ Error generating bet options for league:', error?.message || error);
    return { success: false, matchesProcessed: 0, optionsCount: 0 };
  }
}
