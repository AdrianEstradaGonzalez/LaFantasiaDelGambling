import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAllTables() {
  try {
    console.log('🗑️  Iniciando limpieza de tablas...\n');

    // 1. Eliminar SquadPlayer (depende de Squad)
    const squadPlayers = await prisma.squadPlayer.deleteMany({});
    console.log(`✅ SquadPlayer: ${squadPlayers.count} registros eliminados`);

    // 2. Eliminar Squad (depende de LeagueMember)
    const squads = await prisma.squad.deleteMany({});
    console.log(`✅ Squad: ${squads.count} registros eliminados`);

    // 3. Eliminar Bet (depende de BetOption y LeagueMember)
    const bets = await prisma.bet.deleteMany({});
    console.log(`✅ Bet: ${bets.count} registros eliminados`);

    // 4. Eliminar bet_option (depende de League)
    const betOptions = await prisma.bet_option.deleteMany({});
    console.log(`✅ bet_option: ${betOptions.count} registros eliminados`);

    // 5. Eliminar LeagueMember (depende de League)
    const leagueMembers = await prisma.leagueMember.deleteMany({});
    console.log(`✅ LeagueMember: ${leagueMembers.count} registros eliminados`);

    // 6. Eliminar League
    const leagues = await prisma.league.deleteMany({});
    console.log(`✅ League: ${leagues.count} registros eliminados`);

    console.log('\n✨ Limpieza completada exitosamente');
    console.log('📊 Resumen:');
    console.log(`   - ${squadPlayers.count} jugadores de plantilla eliminados`);
    console.log(`   - ${squads.count} plantillas eliminadas`);
    console.log(`   - ${bets.count} apuestas eliminadas`);
    console.log(`   - ${betOptions.count} opciones de apuesta eliminadas`);
    console.log(`   - ${leagueMembers.count} miembros de liga eliminados`);
    console.log(`   - ${leagues.count} ligas eliminadas`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllTables()
  .then(() => {
    console.log('\n🎉 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script finalizado con errores:', error);
    process.exit(1);
  });
