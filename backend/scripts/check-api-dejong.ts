import axios from 'axios';

const FIXTURE_ID = 1390931; // Barcelona en jornada 12
const DE_JONG_ID = 538;

async function checkAPIData() {
  try {
    console.log(`🔍 Consultando API para fixture ${FIXTURE_ID}...\n`);

    const response = await axios.get(
      `https://v3.football.api-sports.io/fixtures/players`,
      {
        params: { fixture: FIXTURE_ID },
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      }
    );

    const data = response.data.response;
    
    // Buscar al Barcelona
    for (const teamData of data) {
      const deJongStats = teamData.players.find((p: any) => p.player.id === DE_JONG_ID);
      
      if (deJongStats) {
        console.log(`👤 ${deJongStats.player.name} - Barcelona\n`);
        console.log(`📊 Stats según API:\n`);
        console.log(JSON.stringify(deJongStats.statistics[0], null, 2));
        console.log(`\n🎴 Tarjetas:`);
        console.log(`   Amarillas: ${deJongStats.statistics[0].cards?.yellow ?? 0}`);
        console.log(`   Rojas: ${deJongStats.statistics[0].cards?.red ?? 0}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkAPIData();
