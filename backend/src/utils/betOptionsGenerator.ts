/**
 * UTILIDAD PARA GENERAR OPCIONES DE APUESTA
 * 
 * Esta función obtiene todas las apuestas disponibles de la API para una jornada
 * y genera opciones aleatorias para cada liga (1 apuesta por partido).
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const HEADERS = {
  'x-rapidapi-key': API_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io',
};
const LA_LIGA_LEAGUE_ID = 140;
const SEGUNDA_DIVISION_LEAGUE_ID = 141;
const PREMIER_LEAGUE_ID = 39;
const SEASON = 2025;

// Mapa de traducción de tipos de apuesta al español
const BET_TYPE_TRANSLATIONS: Record<string, string> = {
  // Resultados
  'Match Winner': 'Ganador del Partido',
  'Winner': 'Ganador del Partido',
  'First Half Winner': 'Ganador Primera Parte',
  'Second Half Winner': 'Ganador Segunda Parte',
  'Fulltime Result': 'Resultado Final',
  'Halftime Result': 'Resultado al Descanso',
  'Halftime/Fulltime': 'Resultado Descanso/Final',
  
  // Goles
  'Goals Over/Under': 'Más/Menos Goles',
  'Over/Under': 'Más/Menos Goles',
  'Total Goals': 'Total de Goles',
  'Home Team Total Goals': 'Total Goles Local',
  'Away Team Total Goals': 'Total Goles Visitante',
  'Both Teams Score': 'Ambos Equipos Marcan',
  'Both Teams To Score': 'Ambos Equipos Marcan',
  'BTTS': 'Ambos Equipos Marcan',
  'First Team To Score': 'Primer Equipo en Marcar',
  'Last Team To Score': 'Último Equipo en Marcar',
  'Highest Scoring Half': 'Parte con Más Goles',
  'Team To Score First': 'Equipo que Marca Primero',
  'Team To Score Last': 'Equipo que Marca Último',
  'Anytime Goalscorer': 'Marcará en Cualquier Momento',
  'First Goalscorer': 'Primer Goleador',
  'Last Goalscorer': 'Último Goleador',
  
  // Mitades del partido
  'First Half Goals Over/Under': 'Más/Menos Goles Primera Parte',
  'Second Half Goals Over/Under': 'Más/Menos Goles Segunda Parte',
  'First Half Total Goals': 'Total Goles Primera Parte',
  'Second Half Total Goals': 'Total Goles Segunda Parte',
  'Highest Scoring Half 2nd Half': 'Segunda Parte con Más Goles',
  'Highest Scoring Half 1st Half': 'Primera Parte con Más Goles',
  'Goal In Both Halves': 'Gol en Ambas Partes',
  
  // Corners y tarjetas
  'Corners Over/Under': 'Más/Menos Corners',
  'Total Corners': 'Total de Corners',
  'Home Team Corners': 'Corners del Local',
  'Away Team Corners': 'Corners del Visitante',
  'First Half Corners': 'Corners Primera Parte',
  'Second Half Corners': 'Corners Segunda Parte',
  'Cards Over/Under': 'Más/Menos Tarjetas',
  'Total Cards': 'Total de Tarjetas',
  'Home Team Cards': 'Tarjetas del Local',
  'Away Team Cards': 'Tarjetas del Visitante',
  'Player Cards': 'Tarjetas de Jugadores',
  
  // Win To Nil y Clean Sheet
  'Win To Nil': 'Ganar sin Encajar',
  'Home Win To Nil': 'Local Gana sin Encajar',
  'Away Win To Nil': 'Visitante Gana sin Encajar',
  'Clean Sheet': 'Portería a Cero',
  'Clean Sheet - Home': 'Portería a Cero - Local',
  'Clean Sheet - Away': 'Portería a Cero - Visitante',
  'Home Clean Sheet': 'Portería a Cero Local',
  'Away Clean Sheet': 'Portería a Cero Visitante',
  
  // Otros
  'Double Chance': 'Doble Oportunidad',
  'Home/Away': 'Gana Local o Visitante (Sin Empate)',
  'Draw No Bet': 'Gana con Reembolso si Empate',
  'To Qualify': 'Clasificación',
  'Exact Score': 'Resultado Exacto',
  'Correct Score': 'Resultado Exacto',
  'Score In Both Halves': 'Marcar en Ambas Partes',
  'Win Either Half': 'Ganar Alguna Parte',
  'Win Both Halves': 'Ganar Ambas Partes',
  'To Win From Behind': 'Ganar Remontando',
  'To Win To Nil': 'Ganar sin Encajar',
  'Odd/Even': 'Goles Par/Impar',
  'Odd/Even Goals': 'Goles Par/Impar',
  'Home Odd/Even': 'Goles Par/Impar Local',
  'Away Odd/Even': 'Goles Par/Impar Visitante',
  'Asian Handicap': 'Hándicap Asiático',
  'European Handicap': 'Hándicap Europeo',
  'Handicap': 'Hándicap',
  'Handicap Result': 'Resultado con Hándicap',
  'Alternative Handicap': 'Hándicap Alternativo',
  'Goals Handicap': 'Hándicap de Goles',
  '3-Way Handicap': 'Hándicap 3 Vías',
  
  // Tiempo del primer gol
  'Time Of First Goal': 'Tiempo del Primer Gol',
  'First Goal': 'Primer Gol',
  '10 Minutes Result': 'Resultado 10 Minutos',
  '15 Minutes Result': 'Resultado 15 Minutos',
  
  // Combinadas
  'Both Teams To Score & Total': 'Ambos Marcan y Total',
  'Result & Both Teams To Score': 'Resultado y Ambos Marcan',
  'Result & Total Goals': 'Resultado y Total de Goles',
  'Home Team Score A Goal': 'Local Marca un Gol',
  'Away Team Score A Goal': 'Visitante Marca un Gol',
  'Multigoals': 'Multigoles',
  'Home Multigoals': 'Multigoles Local',
  'Away Multigoals': 'Multigoles Visitante',
};

// Mapa de traducción de opciones de apuesta al español
const BET_LABEL_TRANSLATIONS: Record<string, string> = {
  // Resultados básicos
  'Home': 'Gana Local',
  'Draw': 'Empate',
  'Away': 'Gana Visitante',
  'X': 'Empate',
  '1': 'Gana Local',
  '2': 'Gana Visitante',
  
  // Doble oportunidad
  'Home/Draw': 'Local o Empate',
  'Home/Away': 'Local o Visitante',
  'Draw/Away': 'Empate o Visitante',
  '1X': 'Local o Empate',
  '12': 'Local o Visitante',
  'X2': 'Empate o Visitante',
  
  // Sí/No
  'Yes': 'Sí',
  'No': 'No',
  
  // Over/Under
  'Over': 'Más de',
  'Under': 'Menos de',
  
  // Par/Impar
  'Odd': 'Impar',
  'Even': 'Par',
  
  // Partes del partido
  '1st Half': 'Primera Parte',
  '2nd Half': 'Segunda Parte',
  'First Half': 'Primera Parte',
  'Second Half': 'Segunda Parte',
  'None': 'Ninguno',
  'Both': 'Ambos',
  'Either': 'Cualquiera',
  
  // Rangos de tiempo
  '0-10': '0-10 min',
  '11-20': '11-20 min',
  '21-30': '21-30 min',
  '31-40': '31-40 min',
  '41-50': '41-50 min',
  '51-60': '51-60 min',
  '61-70': '61-70 min',
  '71-80': '71-80 min',
  '81-90': '81-90 min',
  'No Goal': 'Sin Goles',
};

function translateBetType(betType: string): string {
  // Intentar traducción directa
  if (BET_TYPE_TRANSLATIONS[betType]) {
    return BET_TYPE_TRANSLATIONS[betType];
  }
  
  // Traducir casos especiales que pueden venir con diferentes formatos
  const lowerType = betType.toLowerCase();
  
  // Win to Nil
  if (lowerType.includes('win to nil') || lowerType.includes('win to 0')) {
    if (lowerType.includes('home')) return 'Local Gana sin Encajar';
    if (lowerType.includes('away')) return 'Visitante Gana sin Encajar';
    return 'Ganar sin Encajar';
  }
  
  // Highest Scoring
  if (lowerType.includes('highest scoring')) {
    if (lowerType.includes('half')) return 'Parte con Más Goles';
    if (lowerType.includes('2nd') || lowerType.includes('second')) return 'Segunda Parte con Más Goles';
    if (lowerType.includes('1st') || lowerType.includes('first')) return 'Primera Parte con Más Goles';
  }
  
  // Goles
  if (lowerType.includes('goals')) {
    if (lowerType.includes('over') || lowerType.includes('under')) {
      if (lowerType.includes('first half') || lowerType.includes('1st half')) return 'Más/Menos Goles Primera Parte';
      if (lowerType.includes('second half') || lowerType.includes('2nd half')) return 'Más/Menos Goles Segunda Parte';
      return 'Más/Menos Goles';
    }
    if (lowerType.includes('total')) {
      if (lowerType.includes('home')) return 'Total Goles Local';
      if (lowerType.includes('away')) return 'Total Goles Visitante';
      if (lowerType.includes('first half') || lowerType.includes('1st half')) return 'Total Goles Primera Parte';
      if (lowerType.includes('second half') || lowerType.includes('2nd half')) return 'Total Goles Segunda Parte';
      return 'Total de Goles';
    }
    if (lowerType.includes('multigoals')) {
      if (lowerType.includes('home')) return 'Multigoles Local';
      if (lowerType.includes('away')) return 'Multigoles Visitante';
      return 'Multigoles';
    }
  }
  
  // Corners
  if (lowerType.includes('corners') || lowerType.includes('corner')) {
    if (lowerType.includes('over') || lowerType.includes('under')) {
      if (lowerType.includes('first half') || lowerType.includes('1st half')) return 'Más/Menos Corners Primera Parte';
      if (lowerType.includes('second half') || lowerType.includes('2nd half')) return 'Más/Menos Corners Segunda Parte';
      return 'Más/Menos Corners';
    }
    if (lowerType.includes('total')) {
      if (lowerType.includes('home')) return 'Total Corners Local';
      if (lowerType.includes('away')) return 'Total Corners Visitante';
      return 'Total de Corners';
    }
    if (lowerType.includes('home')) return 'Corners del Local';
    if (lowerType.includes('away')) return 'Corners del Visitante';
  }
  
  // Tarjetas
  if (lowerType.includes('cards') || lowerType.includes('card')) {
    if (lowerType.includes('over') || lowerType.includes('under')) return 'Más/Menos Tarjetas';
    if (lowerType.includes('total')) {
      if (lowerType.includes('home')) return 'Total Tarjetas Local';
      if (lowerType.includes('away')) return 'Total Tarjetas Visitante';
      return 'Total de Tarjetas';
    }
    if (lowerType.includes('home')) return 'Tarjetas del Local';
    if (lowerType.includes('away')) return 'Tarjetas del Visitante';
    if (lowerType.includes('player')) return 'Tarjetas de Jugadores';
  }
  
  // Ambos marcan
  if (lowerType.includes('both') && lowerType.includes('score')) {
    return 'Ambos Equipos Marcan';
  }
  if (lowerType.includes('btts')) {
    return 'Ambos Equipos Marcan';
  }
  
  // Portería a cero / Clean Sheet
  if (lowerType.includes('clean sheet')) {
    if (lowerType.includes('home')) return 'Portería a Cero - Local';
    if (lowerType.includes('away')) return 'Portería a Cero - Visitante';
    return 'Portería a Cero';
  }
  
  // Ganador
  if (lowerType.includes('winner')) {
    if (lowerType.includes('first half') || lowerType.includes('1st half')) return 'Ganador Primera Parte';
    if (lowerType.includes('second half') || lowerType.includes('2nd half')) return 'Ganador Segunda Parte';
    return 'Ganador del Partido';
  }
  
  // Resultado
  if (lowerType.includes('result')) {
    if (lowerType.includes('halftime') || lowerType.includes('half time')) return 'Resultado al Descanso';
    if (lowerType.includes('fulltime') || lowerType.includes('full time')) return 'Resultado Final';
    if (lowerType.includes('handicap')) return 'Resultado con Hándicap';
  }
  
  // Par/Impar
  if ((lowerType.includes('odd') && lowerType.includes('even')) || lowerType.includes('odd/even')) {
    if (lowerType.includes('home')) return 'Goles Par/Impar Local';
    if (lowerType.includes('away')) return 'Goles Par/Impar Visitante';
    return 'Goles Par/Impar';
  }
  
  // Home/Away sin empate
  if (lowerType.includes('home/away') || lowerType === 'home away') {
    return 'Gana Local o Visitante (Sin Empate)';
  }
  
  // Ganar partes
  if (lowerType.includes('win')) {
    if (lowerType.includes('both halves') || lowerType.includes('both half')) return 'Ganar Ambas Partes';
    if (lowerType.includes('either half') || lowerType.includes('either half')) return 'Ganar Alguna Parte';
    if (lowerType.includes('from behind')) return 'Ganar Remontando';
  }
  
  // Marcador
  if (lowerType.includes('score')) {
    if (lowerType.includes('first') || lowerType.includes('1st')) return 'Marcar Primero';
    if (lowerType.includes('last')) return 'Marcar Último';
    if (lowerType.includes('both halves')) return 'Marcar en Ambas Partes';
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
  equipoLocalCrest?: string;
  equipoVisitanteCrest?: string;
  apuestas: BetOption[];
}

async function fetchFixtures(jornada: number, leagueApiId: number = LA_LIGA_LEAGUE_ID) {
  const url = `${API_BASE}/fixtures`;
  const params = {
    league: leagueApiId,
    season: SEASON,
    round: `Regular Season - ${jornada}`
  };

  const response = await axios.get(url, { headers: HEADERS, params });
  
  if (response.data.results === 0) {
    return [];
  }

  return response.data.response;
}

async function fetchOddsForFixture(
  fixtureId: number, 
  homeTeam: string, 
  awayTeam: string,
  homeTeamCrest?: string,
  awayTeamCrest?: string
): Promise<MatchBets | null> {
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
        
        // Filtrar pares completos que estén en rango
        const validPairs: Array<{ line: string, over: any, under: any }> = [];
        linesMap.forEach((pair, line) => {
          if (pair.over && pair.under) {
            const overOdd = parseFloat(pair.over.odd);
            const underOdd = parseFloat(pair.under.odd);
            
            if (overOdd >= 1.40 && overOdd <= 3.00 && underOdd >= 1.40 && underOdd <= 3.00) {
              validPairs.push({ line, over: pair.over, under: pair.under });
            }
          }
        });
        
        // Seleccionar aleatoriamente SOLO UNA línea
        if (validPairs.length > 0) {
          const randomIndex = Math.floor(Math.random() * validPairs.length);
          const selectedPair = validPairs[randomIndex];
          
          validBets.push({
            tipo: translateBetType(bet.name),
            opcion: translateBetLabel(selectedPair.over.value, homeTeam, awayTeam),
            cuota: selectedPair.over.odd
          });
          validBets.push({
            tipo: translateBetType(bet.name),
            opcion: translateBetLabel(selectedPair.under.value, homeTeam, awayTeam),
            cuota: selectedPair.under.odd
          });
        }
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
      equipoLocalCrest: homeTeamCrest,
      equipoVisitanteCrest: awayTeamCrest,
      apuestas: validBets
    };
  } catch (error: any) {
    console.error(`Error obteniendo cuotas para partido ${fixtureId}:`, error.message);
    return createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam, homeTeamCrest, awayTeamCrest);
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

function createSyntheticOnlyBets(
  fixtureId: number, 
  homeTeam: string, 
  awayTeam: string,
  homeTeamCrest?: string,
  awayTeamCrest?: string
): MatchBets {
  const validBets: BetOption[] = [];
  addSyntheticBets(validBets);
  
  return {
    idPartido: fixtureId,
    equipoLocal: homeTeam,
    equipoVisitante: awayTeam,
    equipoLocalCrest: homeTeamCrest,
    equipoVisitanteCrest: awayTeamCrest,
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
        homeTeamCrest: matchBets.equipoLocalCrest,
        awayTeamCrest: matchBets.equipoVisitanteCrest,
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
    homeTeamCrest?: string;
    awayTeamCrest?: string;
    betType: string;
    betLabel: string;
    odd: number;
  }>
) {
  await prisma.bet_option.deleteMany({
    where: { leagueId, jornada },
  });

  // Usar IDs únicos generados automáticamente
  for (const opt of options) {
    await prisma.bet_option.create({
      data: {
        id: crypto.randomUUID(), // ID único garantizado
        leagueId,
        jornada,
        matchId: opt.matchId,
        homeTeam: opt.homeTeam,
        awayTeam: opt.awayTeam,
        homeTeamCrest: opt.homeTeamCrest,
        awayTeamCrest: opt.awayTeamCrest,
        betType: opt.betType,
        betLabel: opt.betLabel,
        odd: opt.odd,
      },
    });
  }
}

export async function generateBetOptionsForAllLeagues(jornada: number): Promise<{
  success: boolean;
  matchesProcessed: number;
  leaguesUpdated: number;
  totalOptions: number;
}> {
  console.log(`\n🎲 Generando apuestas para jornada ${jornada}...\n`);

  try {
    // 1. Obtener todas las ligas para saber qué divisiones existen
    const leagues = await prisma.league.findMany({
      select: { id: true, name: true, division: true },
    });

    console.log(`📋 ${leagues.length} ligas activas\n`);

    // Agrupar ligas por división
    const primeraLeagues = leagues.filter(l => l.division === 'primera' || !l.division);
    const segundaLeagues = leagues.filter(l => l.division === 'segunda');

    console.log(`   Primera División: ${primeraLeagues.length} ligas`);
    console.log(`   Segunda División: ${segundaLeagues.length} ligas\n`);

    let totalOptions = 0;
    let totalMatchesProcessed = 0;

    // 2. Procesar Primera División si hay ligas
    if (primeraLeagues.length > 0) {
      console.log('🔵 Procesando Primera División (Liga 140)...\n');
      
      const fixtures = await fetchFixtures(jornada, LA_LIGA_LEAGUE_ID);
      
      if (fixtures.length === 0) {
        console.log('⚠️  No hay fixtures disponibles para Primera División');
      } else {
        console.log(`✅ ${fixtures.length} partidos encontrados en Primera División`);

        const allMatchBets: MatchBets[] = [];
        
        for (const fixture of fixtures) {
          const matchBets = await fetchOddsForFixture(
            fixture.fixture.id,
            fixture.teams.home.name,
            fixture.teams.away.name,
            fixture.teams.home.logo,
            fixture.teams.away.logo
          );
          
          if (matchBets) {
            allMatchBets.push(matchBets);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ Apuestas obtenidas para ${allMatchBets.length} partidos de Primera\n`);
        totalMatchesProcessed += allMatchBets.length;

        // Generar para cada liga de primera
        for (const league of primeraLeagues) {
          const optionsCount = await generateBetOptionsForLeague(league.id, jornada, allMatchBets);
          totalOptions += optionsCount;
          console.log(`   ✅ Liga "${league.name}": ${optionsCount} opciones`);
        }
      }
    }

    // 3. Procesar Segunda División si hay ligas
    if (segundaLeagues.length > 0) {
      console.log('\n🟡 Procesando Segunda División (Liga 141)...\n');
      
      const fixtures = await fetchFixtures(jornada, SEGUNDA_DIVISION_LEAGUE_ID);
      
      if (fixtures.length === 0) {
        console.log('⚠️  No hay fixtures disponibles para Segunda División');
      } else {
        console.log(`✅ ${fixtures.length} partidos encontrados en Segunda División`);

        const allMatchBets: MatchBets[] = [];
        
        for (const fixture of fixtures) {
          const matchBets = await fetchOddsForFixture(
            fixture.fixture.id,
            fixture.teams.home.name,
            fixture.teams.away.name,
            fixture.teams.home.logo,
            fixture.teams.away.logo
          );
          
          if (matchBets) {
            allMatchBets.push(matchBets);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ Apuestas obtenidas para ${allMatchBets.length} partidos de Segunda\n`);
        totalMatchesProcessed += allMatchBets.length;

        // Generar para cada liga de segunda
        for (const league of segundaLeagues) {
          const optionsCount = await generateBetOptionsForLeague(league.id, jornada, allMatchBets);
          totalOptions += optionsCount;
          console.log(`   ✅ Liga "${league.name}": ${optionsCount} opciones`);
        }
      }
    }

    console.log(`\n✅ Total: ${totalOptions} opciones de apuesta generadas para ${leagues.length} ligas\n`);

    return {
      success: true,
      matchesProcessed: totalMatchesProcessed,
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
    // Detectar la división de la liga para usar el API ID correcto
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { division: true }
    });
    
    const division = league?.division || 'primera';
    const leagueApiId = division === 'segunda' 
      ? SEGUNDA_DIVISION_LEAGUE_ID 
      : division === 'premier'
      ? PREMIER_LEAGUE_ID
      : LA_LIGA_LEAGUE_ID;
    
    console.log(`📊 Liga detectada: ${division === 'segunda' ? 'Segunda División' : division === 'premier' ? 'Premier League' : 'Primera División'} (API ID: ${leagueApiId})`);
    
    const fixtures = await fetchFixtures(jornada, leagueApiId);
    if (fixtures.length === 0) {
      console.log('⚠️  No hay fixtures disponibles para generar apuestas');
      return { success: false, matchesProcessed: 0, optionsCount: 0 };
    }

    const allMatchBets: MatchBets[] = [];
    for (const fixture of fixtures) {
      const matchBets = await fetchOddsForFixture(
        fixture.fixture.id,
        fixture.teams.home.name,
        fixture.teams.away.name,
        fixture.teams.home.logo,
        fixture.teams.away.logo
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
