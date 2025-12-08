import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function insertTestBets() {
  try {
    console.log('🔍 Buscando usuario y liga...\n');

    // Buscar usuario por email o name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'rubenrc233', mode: 'insensitive' } },
          { name: { contains: 'rubenrc233', mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.error('❌ Usuario rubenrc233 no encontrado');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.name || user.email} (${user.id})`);

    // Usar el ID de liga proporcionado
    const leagueId = 'cmh51d4wc002m32y4sd3i7d1u';
    
    const league = await prisma.league.findUnique({
      where: {
        id: leagueId
      }
    });

    if (!league) {
      console.error(`❌ Liga ${leagueId} no encontrada`);
      return;
    }

    console.log(`✅ Liga encontrada: ${league.name} (${league.id})`);

    // Crear dos apuestas ganadas
    const bet1 = await prisma.bet.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        jornada: 15,
        matchId: 12345,
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        homeCrest: 'https://media.api-sports.io/football/teams/541.png',
        awayCrest: 'https://media.api-sports.io/football/teams/529.png',
        betType: 'Ganador del Partido',
        betLabel: 'Real Madrid',
        apiBetId: 1,
        apiEndpoint: 'predictions',
        apiStatKey: 'winner_id',
        apiOperator: '===',
        apiValue: '541',
        odd: 2.5,
        amount: 50,
        potentialWin: 75,
        status: 'won'
      }
    });

    console.log(`\n✅ Apuesta 1 creada (ID: ${bet1.id})`);
    console.log(`   ${bet1.homeTeam} vs ${bet1.awayTeam}`);
    console.log(`   ${bet1.betLabel} - Cuota: ${bet1.odd}`);
    console.log(`   Estado: ${bet1.status}`);

    const bet2 = await prisma.bet.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        jornada: 15,
        matchId: 12346,
        homeTeam: 'Atletico Madrid',
        awayTeam: 'Sevilla',
        homeCrest: 'https://media.api-sports.io/football/teams/530.png',
        awayCrest: 'https://media.api-sports.io/football/teams/536.png',
        betType: 'Más/Menos Goles',
        betLabel: 'Más de 2.5',
        apiBetId: 5,
        apiEndpoint: 'predictions',
        apiStatKey: 'goals.total',
        apiOperator: '>',
        apiValue: '2.5',
        odd: 1.8,
        amount: 50,
        potentialWin: 40,
        status: 'won'
      }
    });

    console.log(`\n✅ Apuesta 2 creada (ID: ${bet2.id})`);
    console.log(`   ${bet2.homeTeam} vs ${bet2.awayTeam}`);
    console.log(`   ${bet2.betLabel} - Cuota: ${bet2.odd}`);
    console.log(`   Estado: ${bet2.status}`);

    const bet3 = await prisma.bet.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        jornada: 15,
        matchId: 12347,
        homeTeam: 'Valencia',
        awayTeam: 'Villarreal',
        homeCrest: 'https://media.api-sports.io/football/teams/532.png',
        awayCrest: 'https://media.api-sports.io/football/teams/533.png',
        betType: 'Ganador del Partido',
        betLabel: 'Valencia',
        apiBetId: 1,
        apiEndpoint: 'predictions',
        apiStatKey: 'winner_id',
        apiOperator: '===',
        apiValue: '532',
        odd: 2.2,
        amount: 50,
        potentialWin: 60,
        status: 'lost'
      }
    });

    console.log(`\n✅ Apuesta 3 creada (ID: ${bet3.id})`);
    console.log(`   ${bet3.homeTeam} vs ${bet3.awayTeam}`);
    console.log(`   ${bet3.betLabel} - Cuota: ${bet3.odd}`);
    console.log(`   Estado: ${bet3.status}`);

    console.log('\n✨ Tres apuestas insertadas correctamente para rubenrc233 en jornada 15');
    console.log('   2 ganadas, 1 perdida');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertTestBets();
