import axios from 'axios';

const FIXTURE_ID = 1390931; // Barcelona vs Real Sociedad - Jornada 12

async function checkFixtureEvents() {
  try {
    console.log(`🔍 Consultando eventos del partido ${FIXTURE_ID}...\n`);

    const response = await axios.get(
      `https://v3.football.api-sports.io/fixtures/events`,
      {
        params: { fixture: FIXTURE_ID },
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      }
    );

    const events = response.data.response;
    
    console.log(`📊 Total de eventos: ${events.length}\n`);

    // Filtrar eventos de tarjetas
    const cardEvents = events.filter((e: any) => 
      e.type === 'Card' && 
      (e.detail === 'Yellow Card' || e.detail === 'Red Card')
    );

    console.log(`🎴 Eventos de tarjetas (${cardEvents.length}):\n`);

    // Buscar específicamente a De Jong
    const deJongEvents = cardEvents.filter((e: any) => 
      e.player.name.includes('Jong')
    );

    console.log(`👤 Tarjetas de De Jong (${deJongEvents.length}):\n`);
    
    deJongEvents.forEach((event: any) => {
      console.log(`   Minuto ${event.time.elapsed}${event.time.extra ? `+${event.time.extra}` : ''}: ${event.detail}`);
      console.log(`   Jugador: ${event.player.name} (ID: ${event.player.id})`);
      console.log(`   Equipo: ${event.team.name}\n`);
    });

    // Mostrar todos los eventos de tarjetas para contexto
    console.log(`\n📋 Todas las tarjetas del partido:\n`);
    cardEvents.forEach((event: any) => {
      const time = event.time.extra 
        ? `${event.time.elapsed}+${event.time.extra}` 
        : event.time.elapsed;
      console.log(`   ${time}' - ${event.player.name} (${event.team.name}): ${event.detail}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkFixtureEvents();
