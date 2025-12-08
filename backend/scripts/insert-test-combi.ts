import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function insertTestCombi() {
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

    // Crear una combi con 3 selecciones
    const totalOdd = 2.0 * 1.75 * 2.5; // 8.75
    const amount = 50;
    const potentialWin = Math.round((amount * totalOdd) - amount); // (50 * 8.75) - 50 = 387.5 - 50 = 337.5 ≈ 338

    const combi = await prisma.betCombi.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        jornada: 15,
        amount: amount,
        totalOdd: totalOdd,
        potentialWin: potentialWin,
        status: 'won'
      }
    });

    console.log(`\n✅ Combi creada (ID: ${combi.id})`);
    console.log(`   Cuota total: ${totalOdd.toFixed(2)}`);
    console.log(`   Apostado: ${amount}M`);
    console.log(`   Ganancia potencial: ${potentialWin}M`);
    console.log(`   Estado: ${combi.status}`);

    // Crear las 3 selecciones de la combi
    const selection1 = await prisma.bet.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        jornada: 15,
        matchId: 12348,
        homeTeam: 'Real Betis',
        awayTeam: 'Getafe',
        homeCrest: 'https://media.api-sports.io/football/teams/543.png',
        awayCrest: 'https://media.api-sports.io/football/teams/546.png',
        betType: 'Ganador del Partido',
        betLabel: 'Real Betis',
        apiBetId: 1,
        apiEndpoint: 'predictions',
        apiStatKey: 'winner_id',
        apiOperator: '===',
        apiValue: '543',
        odd: 2.0,
        amount: 50,
        potentialWin: 50,
        status: 'won',
        combiId: combi.id
      }
    });

    console.log(`\n   📌 Selección 1: ${selection1.homeTeam} vs ${selection1.awayTeam}`);
    console.log(`      ${selection1.betLabel} - Cuota: ${selection1.odd}`);

    const selection2 = await prisma.bet.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        jornada: 15,
        matchId: 12349,
        homeTeam: 'Athletic Bilbao',
        awayTeam: 'Osasuna',
        homeCrest: 'https://media.api-sports.io/football/teams/531.png',
        awayCrest: 'https://media.api-sports.io/football/teams/727.png',
        betType: 'Ambos Marcan',
        betLabel: 'Ambos marcarán',
        apiBetId: 8,
        apiEndpoint: 'predictions',
        apiStatKey: 'both_teams_score',
        apiOperator: '===',
        apiValue: 'true',
        odd: 1.75,
        amount: 50,
        potentialWin: 37.5,
        status: 'won',
        combiId: combi.id
      }
    });

    console.log(`\n   📌 Selección 2: ${selection2.homeTeam} vs ${selection2.awayTeam}`);
    console.log(`      ${selection2.betLabel} - Cuota: ${selection2.odd}`);

    const selection3 = await prisma.bet.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        jornada: 15,
        matchId: 12350,
        homeTeam: 'Celta Vigo',
        awayTeam: 'Mallorca',
        homeCrest: 'https://media.api-sports.io/football/teams/538.png',
        awayCrest: 'https://media.api-sports.io/football/teams/798.png',
        betType: 'Más/Menos Goles',
        betLabel: 'Más de 2.5',
        apiBetId: 5,
        apiEndpoint: 'predictions',
        apiStatKey: 'goals.total',
        apiOperator: '>',
        apiValue: '2.5',
        odd: 2.5,
        amount: 50,
        potentialWin: 75,
        status: 'won',
        combiId: combi.id
      }
    });

    console.log(`\n   📌 Selección 3: ${selection3.homeTeam} vs ${selection3.awayTeam}`);
    console.log(`      ${selection3.betLabel} - Cuota: ${selection3.odd}`);

    console.log('\n✨ Combi ganadora insertada correctamente para rubenrc233 en jornada 15');
    console.log(`   3 selecciones con cuota total ${totalOdd.toFixed(2)}`);
    console.log(`   Ganancia: +${potentialWin}M`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertTestCombi();
