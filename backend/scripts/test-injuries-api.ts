import axios from 'axios';

const api = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-apisports-key': '099ef4c6c0803639d80207d4ac1ad5da'
  }
});

async function testInjuriesAPI() {
  try {
    console.log('🔍 Consultando API de sidelined...\n');
    
    // Probar con un jugador específico que sabemos que apareció (Garcés)
    const response = await api.get('/sidelined', {
      params: {
        player: 6638, // Garcés
      }
    });

    console.log(`📊 Total de registros: ${response.data.results}\n`);
    
    // Mostrar todos los registros
    console.log('📋 Estructura de datos completa:');
    console.log(JSON.stringify(response.data.response, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testInjuriesAPI();
