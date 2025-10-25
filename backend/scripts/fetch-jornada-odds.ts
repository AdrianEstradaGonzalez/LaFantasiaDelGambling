/**
 * SCRIPT PARA OBTENER CUOTAS DE APUESTAS DE UNA JORNADA
 * 
 * Este script obtiene todas las apuestas disponibles en la API de API-Football
 * para los partidos de una jornada específica de La Liga.
 * 
 * Uso: npx tsx scripts/fetch-jornada-odds.ts <jornada> [season]
 * Ejemplo: npx tsx scripts/fetch-jornada-odds.ts 11 2024
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuración de la API
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const HEADERS = {
  'x-rapidapi-key': API_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io',
};
const LA_LIGA_LEAGUE_ID = 140;

interface Fixture {
  fixture: {
    id: number;
    date: string;
  };
  teams: {
    home: { name: string };
    away: { name: string };
  };
}

interface Odd {
  league: {
    id: number;
    name: string;
  };
  fixture: {
    id: number;
  };
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{
        value: string;
        odd: string;
      }>;
    }>;
  }>;
}

async function fetchFixtures(jornada: number, season: number) {
  console.log(`📅 Obteniendo fixtures de la jornada ${jornada}...`);
  
  try {
    const url = `${API_BASE}/fixtures`;
    const params = {
      league: LA_LIGA_LEAGUE_ID,
      season: season,
      round: `Regular Season - ${jornada}`
    };

    const response = await axios.get(url, { headers: HEADERS, params });
    
    if (response.data.results === 0) {
      console.log('⚠️  No se encontraron fixtures para esta jornada');
      return [];
    }

    const fixtures: Fixture[] = response.data.response;
    console.log(`✅ Se encontraron ${fixtures.length} partidos\n`);
    
    return fixtures;
  } catch (error: any) {
    console.error('❌ Error al obtener fixtures:', error.message);
    return [];
  }
}

async function fetchOddsForFixture(fixtureId: number, homeTeam: string, awayTeam: string) {
  console.log(`\n🎲 Obteniendo cuotas para: ${homeTeam} vs ${awayTeam} (ID: ${fixtureId})`);
  
  try {
    const url = `${API_BASE}/odds`;
    const params = {
      fixture: fixtureId
    };

    const response = await axios.get(url, { headers: HEADERS, params });
    
    if (response.data.results === 0) {
      console.log('   ⚠️  No hay cuotas disponibles para este partido');
      return null;
    }

    const oddsData: Odd = response.data.response[0];
    
    if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
      console.log('   ⚠️  No hay bookmakers con cuotas disponibles');
      return null;
    }

    // Tomar el primer bookmaker disponible
    const bookmaker = oddsData.bookmakers[0];
    
    // Filtrar y mostrar apuestas entre 1.5 y 2.5
    let totalBets = 0;
    let filteredBets = 0;
    const validBets: any[] = [];
    
    bookmaker.bets.forEach(bet => {
      // Filtrar handicap
      if (bet.name.toLowerCase().includes('handicap')) {
        totalBets += bet.values.length;
        return;
      }
      
      const betNameLower = bet.name.toLowerCase();
      const isOverUnder = betNameLower.includes('over') || betNameLower.includes('under') || 
                          betNameLower.includes('goals') || betNameLower.includes('corners') || 
                          betNameLower.includes('cards');
      
      if (isOverUnder) {
        // Para apuestas Over/Under, TODAS las opciones deben estar en rango
        const allInRange = bet.values.every(value => {
          const odd = parseFloat(value.odd);
          return odd >= 1.40 && odd <= 3.00;
        });
        
        if (allInRange && bet.values.length > 0) {
          console.log(`\n   📌 Tipo: ${bet.name}`);
          bet.values.forEach(value => {
            console.log(`      • Opción: ${value.value} | Cuota: ${value.odd}`);
            filteredBets++;
            validBets.push({
              tipo: bet.name,
              opcion: value.value,
              cuota: value.odd
            });
          });
        }
      } else {
        // Para otras apuestas, verificar que haya al menos una opción en rango de cada resultado posible
        const validValues = bet.values.filter(value => {
          const odd = parseFloat(value.odd);
          return odd >= 1.40 && odd <= 3.00;
        });
        
        // Verificar que para apuestas de resultado (1X2) estén las 3 opciones
        const isMatchWinner = betNameLower.includes('match winner') || 
                              betNameLower.includes('winner') ||
                              bet.values.length === 3; // Típicamente 1X2 tiene 3 opciones
        
        if (isMatchWinner && validValues.length < 3) {
          // Si es un resultado de partido y no están las 3 opciones en rango, no mostrar ninguna
          totalBets += bet.values.length;
          return;
        }
        
        // Para apuestas binarias (ambos marcan, etc), verificar que estén ambas opciones
        const isBinary = bet.values.length === 2;
        if (isBinary && validValues.length < 2) {
          // Si es binaria y no están ambas opciones en rango, no mostrar
          totalBets += bet.values.length;
          return;
        }
        
        if (validValues.length > 0) {
          console.log(`\n   📌 Tipo: ${bet.name}`);
          validValues.forEach(value => {
            console.log(`      • Opción: ${value.value} | Cuota: ${value.odd}`);
            filteredBets++;
            validBets.push({
              tipo: bet.name,
              opcion: value.value,
              cuota: value.odd
            });
          });
        }
      }
      
      totalBets += bet.values.length;
    });
    
    // Añadir apuestas sintéticas de córners y tarjetas en bloques    
    console.log(`\n   📌 Tipo: Corners Over/Under`);
    console.log(`      • Opción: Over 8.5 | Cuota: 2.10`);
    console.log(`      • Opción: Under 8.5 | Cuota: 1.90`);
    validBets.push(
      {
        tipo: 'Corners Over/Under',
        opcion: 'Over 8.5',
        cuota: '2.10'
      },
      {
        tipo: 'Corners Over/Under',
        opcion: 'Under 8.5',
        cuota: '1.90'
      }
    );
    filteredBets += 2;
    
    console.log(`\n   � Tipo: Cards Over/Under`);
    console.log(`      • Opción: Over 4.5 | Cuota: 2.10`);
    console.log(`      • Opción: Under 4.5 | Cuota: 1.90`);
    validBets.push(
      {
        tipo: 'Cards Over/Under',
        opcion: 'Over 4.5',
        cuota: '2.10'
      },
      {
        tipo: 'Cards Over/Under',
        opcion: 'Under 4.5',
        cuota: '1.90'
      }
    );
    filteredBets += 2;
    
    console.log(`\n   ✅ Apuestas en rango 1.40-3.00: ${filteredBets} de ${totalBets} totales (incluye 4 sintéticas)`);
    
    return {
      idPartido: fixtureId,
      equipoLocal: homeTeam,
      equipoVisitante: awayTeam,
      casaApuestas: bookmaker.name,
      apuestas: validBets,
      totalApuestas: totalBets,
      apuestasFiltradas: filteredBets
    };
  } catch (error: any) {
    console.error(`   ❌ Error al obtener cuotas: ${error.message}`);
    return null;
  }
}

async function main() {
  const jornada = parseInt(process.argv[2]);
  const season = parseInt(process.argv[3]) || 2024;

  if (!jornada || isNaN(jornada)) {
    console.error('❌ Debes especificar el número de jornada');
    console.log('Uso: npx tsx scripts/fetch-jornada-odds.ts <jornada> [season]');
    console.log('Ejemplo: npx tsx scripts/fetch-jornada-odds.ts 11 2024');
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('❌ No se encontró FOOTBALL_API_KEY en las variables de entorno');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`🏆 OBTENIENDO CUOTAS PARA LA JORNADA ${jornada} - TEMPORADA ${season}`);
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Obtener fixtures de la jornada
    const fixtures = await fetchFixtures(jornada, season);
    
    if (fixtures.length === 0) {
      process.exit(0);
    }

    console.log('='.repeat(70));
    console.log('📋 RESUMEN DE PARTIDOS:');
    console.log('='.repeat(70));
    fixtures.forEach((f, index) => {
      console.log(`${index + 1}. ${f.teams.home.name} vs ${f.teams.away.name}`);
      console.log(`   ID: ${f.fixture.id} | Fecha: ${new Date(f.fixture.date).toLocaleString('es-ES')}`);
    });

    // 2. Obtener cuotas para cada fixture
    console.log('\n' + '='.repeat(70));
    console.log('🎲 OBTENIENDO CUOTAS DE CADA PARTIDO');
    console.log('='.repeat(70));

    const allOdds = [];
    
    for (const fixture of fixtures) {
      const odds = await fetchOddsForFixture(
        fixture.fixture.id,
        fixture.teams.home.name,
        fixture.teams.away.name
      );
      
      if (odds) {
        allOdds.push(odds);
      }
      
      // Esperar 1 segundo entre peticiones para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 3. Resumen final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(70));
    console.log(`Partidos consultados: ${fixtures.length}`);
    console.log(`Partidos con cuotas disponibles: ${allOdds.length}`);
    console.log(`Partidos sin cuotas: ${fixtures.length - allOdds.length}`);
    
    if (allOdds.length > 0) {
      let totalBetOptions = 0;
      let totalFilteredBets = 0;
      
      allOdds.forEach(odd => {
        totalBetOptions += odd.totalApuestas || 0;
        totalFilteredBets += odd.apuestasFiltradas || 0;
      });
      
      console.log(`Total de opciones de apuesta consultadas: ${totalBetOptions}`);
      console.log(`Total de apuestas en rango 1.40-3.00: ${totalFilteredBets}`);
      console.log(`Porcentaje filtrado: ${((totalFilteredBets / totalBetOptions) * 100).toFixed(1)}%`);
    }

    console.log('\n✅ Script completado exitosamente\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error en el script:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
