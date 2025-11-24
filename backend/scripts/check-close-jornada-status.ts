import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCloseJornadaStatus() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 VERIFICACIÓN DE CIERRE DE JORNADA');
    console.log('═'.repeat(70) + '\n');

    // 1. Verificar estado de todas las ligas
    console.log('1️⃣  ESTADO DE LAS LIGAS:\n');
    const leagues = await prisma.league.findMany({
      orderBy: { name: 'asc' }
    });

    for (const league of leagues) {
      console.log(`📋 Liga: ${league.name}`);
      console.log(`   Division: ${league.division}`);
      console.log(`   Jornada Actual: ${league.currentJornada}`);
      console.log(`   Estado: ${league.jornadaStatus}`);
      console.log('');
    }

    // 2. Verificar miembros de la primera liga (ejemplo)
    if (leagues.length > 0) {
      const firstLeague = leagues[0];
      console.log('\n2️⃣  VERIFICACIÓN DE MIEMBROS (Liga: ' + firstLeague.name + '):\n');
      
      const members = await prisma.leagueMember.findMany({
        where: { leagueId: firstLeague.id },
        include: { user: true },
        orderBy: { points: 'desc' }
      });

      for (const member of members) {
        console.log(`👤 ${member.user.name}:`);
        console.log(`   Budget: ${member.budget}M`);
        console.log(`   Initial Budget: ${member.initialBudget}M`);
        console.log(`   Betting Budget: ${member.bettingBudget}M`);
        console.log(`   Puntos Totales: ${member.points}`);
        
        const pointsPerJornada = (member.pointsPerJornada as Record<string, number>) || {};
        const lastJornada = firstLeague.currentJornada - 1;
        console.log(`   Puntos J${lastJornada}: ${pointsPerJornada[lastJornada.toString()] || 0}`);
        console.log('');
      }

      // 3. Verificar apuestas de la jornada anterior
      const lastJornada = firstLeague.currentJornada - 1;
      console.log(`\n3️⃣  APUESTAS DE LA JORNADA ${lastJornada}:\n`);
      
      const bets = await prisma.bet.findMany({
        where: {
          leagueId: firstLeague.id,
          jornada: lastJornada
        },
        include: { leagueMember: { include: { user: true } } }
      });

      console.log(`Total apuestas: ${bets.length}\n`);
      
      const betsByStatus = {
        won: bets.filter(b => b.status === 'won').length,
        lost: bets.filter(b => b.status === 'lost').length,
        pending: bets.filter(b => b.status === 'pending').length
      };

      console.log(`   ✅ Ganadas: ${betsByStatus.won}`);
      console.log(`   ❌ Perdidas: ${betsByStatus.lost}`);
      console.log(`   ⏳ Pendientes: ${betsByStatus.pending}\n`);

      if (bets.length > 0) {
        console.log('Ejemplos de apuestas:');
        for (const bet of bets.slice(0, 5)) {
          console.log(`   - ${bet.leagueMember.user.name}: ${bet.betType} - ${bet.betLabel}`);
          console.log(`     Cantidad: ${bet.amount}M, Cuota: ${bet.odd}, Ganancia potencial: ${bet.potentialWin}M`);
          console.log(`     Estado: ${bet.status}`);
          console.log('');
        }
      }

      // 4. Verificar plantillas
      console.log('\n4️⃣  ESTADO DE LAS PLANTILLAS:\n');
      
      const squads = await prisma.squad.findMany({
        where: { leagueId: firstLeague.id },
        include: { 
          players: true,
          user: true 
        }
      });

      console.log(`Total plantillas: ${squads.length}\n`);
      
      for (const squad of squads.slice(0, 5)) {
        console.log(`   👤 ${squad.user.name}:`);
        console.log(`      Jugadores: ${squad.players.length}`);
        console.log(`      Formación: ${squad.formation || 'No definida'}`);
        console.log('');
      }

      const emptySquads = squads.filter(s => s.players.length === 0).length;
      const fullSquads = squads.filter(s => s.players.length >= 11).length;
      
      console.log(`   ✅ Plantillas con 11+ jugadores: ${fullSquads}`);
      console.log(`   🗑️  Plantillas vacías: ${emptySquads}`);
      console.log('');

      // 5. Verificar equipos inválidos
      console.log('\n5️⃣  EQUIPOS INVÁLIDOS REGISTRADOS:\n');
      
      const invalidTeams = await (prisma as any).invalidTeam.findMany({
        where: {
          leagueId: firstLeague.id,
          jornada: lastJornada
        }
      });

      console.log(`Total equipos inválidos en J${lastJornada}: ${invalidTeams.length}\n`);
      
      for (const invalid of invalidTeams) {
        const user = await prisma.user.findUnique({
          where: { id: invalid.userId }
        });
        console.log(`   ⚠️  ${user?.name || invalid.userId}: ${invalid.reason}`);
      }
      console.log('');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ VERIFICACIÓN COMPLETADA');
    console.log('═'.repeat(70) + '\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCloseJornadaStatus();
