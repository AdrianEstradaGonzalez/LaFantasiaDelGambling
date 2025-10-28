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
  'Exact Score': 'Resultado Exacto',
  'First Half Winner': 'Ganador Primera Parte',
  'Second Half Winner': 'Ganador Segunda Parte',
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
};

function translateBetType(betType: string): string {
  return BET_TYPE_TRANSLATIONS[betType] || betType;
}

function translateBetLabel(betLabel: string, homeTeam?: string, awayTeam?: string): string {
  // Primero intentar traducción directa
  if (BET_LABEL_TRANSLATIONS[betLabel]) {
    return BET_LABEL_TRANSLATIONS[betLabel];
  }
  
  // Traducir Over/Under con números
  if (betLabel.includes('Over')) {
    const value = betLabel.replace('Over ', '');
    return `Más de ${value}`;
  }
  if (betLabel.includes('Under')) {
    const value = betLabel.replace('Under ', '');
    return `Menos de ${value}`;
  }
  
  // Si es un nombre de equipo, mantenerlo
  if (homeTeam && betLabel === homeTeam) return homeTeam;
  if (awayTeam && betLabel === awayTeam) return awayTeam;
  
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
      
      // Caso especial: Over/Under 2.5 goles
      if (betNameLower.includes('goals') && betNameLower.includes('over')) {
        const over25 = bet.values.find((v: any) => v.value === 'Over 2.5');
        const under25 = bet.values.find((v: any) => v.value === 'Under 2.5');
        
        if (over25 && under25) {
          const over25Odd = parseFloat(over25.odd);
          const under25Odd = parseFloat(under25.odd);
          
          // Solo agregar si ambas cuotas están en rango
          if (over25Odd >= 1.40 && over25Odd <= 3.00 && under25Odd >= 1.40 && under25Odd <= 3.00) {
            validBets.push({
              tipo: translateBetType(bet.name),
              opcion: translateBetLabel(over25.value, homeTeam, awayTeam),
              cuota: over25.odd
            });
            validBets.push({
              tipo: translateBetType(bet.name),
              opcion: translateBetLabel(under25.value, homeTeam, awayTeam),
              cuota: under25.odd
            });
          }
        }
        return;
      }
      
      // Caso especial: Match Winner (puede tener 3 opciones)
      const isMatchWinner = betNameLower.includes('match winner') || 
                            betNameLower.includes('winner') ||
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
      
      // Resto de apuestas: SOLO 2 opciones contrarias
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
