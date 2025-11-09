/**
 * Script para verificar qué datos de paradas proporciona la API
 * consultando las estadísticas completas del partido
 */

import axios from 'axios';

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '07bc9c707fe2d6169fff6e17d4a9e6fd';

const HEADERS = {
  'x-apisports-key': API_KEY,
};

async function checkSavesData() {
  console.log('🔍 Verificando datos de paradas en la API\n');

  // Fixture de ejemplo: Sevilla 1-0 Osasuna (1390937)
  const fixtureId = 1390937;

  console.log(`📊 Consultando fixture ${fixtureId} (Sevilla vs Osasuna)\n`);

  // 1. Consultar /fixtures/players
  console.log('1️⃣  Endpoint: /fixtures/players');
  const { data: playersData } = await axios.get(`${API_BASE}/fixtures/players`, {
    headers: HEADERS,
    params: { fixture: fixtureId },
    timeout: 15000
  });

  const teams = playersData?.response || [];
  
  for (const teamData of teams) {
    console.log(`\n   🏟️  ${teamData.team.name}`);
    const players = teamData.players || [];
    
    for (const playerData of players) {
      const stats = playerData.statistics?.[0];
      const position = stats?.games?.position;
      
      if (position === 'G') {
        console.log(`      👤 ${playerData.player.name} (Portero)`);
        console.log(`         - stats.goalkeeper: ${JSON.stringify(stats.goalkeeper)}`);
        console.log(`         - stats.saves: ${stats.saves}`);
        console.log(`         - stats.goals.conceded: ${stats.goals?.conceded}`);
      }
    }
  }

  // 2. Consultar /fixtures/statistics
  console.log(`\n\n2️⃣  Endpoint: /fixtures/statistics`);
  const { data: statsData } = await axios.get(`${API_BASE}/fixtures/statistics`, {
    headers: HEADERS,
    params: { fixture: fixtureId },
    timeout: 15000
  });

  const statistics = statsData?.response || [];
  
  for (const teamStats of statistics) {
    console.log(`\n   🏟️  ${teamStats.team.name}`);
    const stats = teamStats.statistics || [];
    
    const saveStat = stats.find((s: any) => s.type === 'Goalkeeper Saves' || s.type === 'Saves');
    const shotsOnGoal = stats.find((s: any) => s.type === 'Shots on Goal');
    
    console.log(`      - Goalkeeper Saves: ${saveStat?.value ?? 'N/A'}`);
    console.log(`      - Shots on Goal (rival): ${shotsOnGoal?.value ?? 'N/A'}`);
  }

  // 3. Consultar /fixtures (detalles generales)
  console.log(`\n\n3️⃣  Endpoint: /fixtures (fixture details)`);
  const { data: fixtureData } = await axios.get(`${API_BASE}/fixtures`, {
    headers: HEADERS,
    params: { id: fixtureId },
    timeout: 15000
  });

  const fixture = fixtureData?.response?.[0];
  console.log(`   Score: ${fixture.goals.home}-${fixture.goals.away}`);
  console.log(`   Status: ${fixture.fixture.status.long} (${fixture.fixture.status.short})`);
  console.log(`   Elapsed: ${fixture.fixture.status.elapsed} min`);
}

checkSavesData().catch(console.error);
