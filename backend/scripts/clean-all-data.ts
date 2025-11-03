import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAllData() {
  try {
    console.log('\n⚠️  LIMPIANDO TODA LA BASE DE DATOS...\n');

    // Orden de eliminación respetando dependencias
    console.log('🗑️  Eliminando SquadPlayers...');
    await prisma.squadPlayer.deleteMany({});

    console.log('🗑️  Eliminando Squads...');
    await prisma.squad.deleteMany({});

    console.log('🗑️  Eliminando Bets...');
    await prisma.bet.deleteMany({});

    console.log('🗑️  Eliminando BetOptions...');
    await prisma.bet_option.deleteMany({});

    console.log('🗑️  Eliminando PlayerStats...');
    await prisma.playerStats.deleteMany({});

    console.log('🗑️  Eliminando PlayerJornadaPoints...');
    await prisma.playerJornadaPoints.deleteMany({});

    console.log('🗑️  Eliminando LeagueMembers...');
    await prisma.leagueMember.deleteMany({});

    console.log('🗑️  Eliminando Leagues...');
    await prisma.league.deleteMany({});

    console.log('🗑️  Eliminando Players...');
    await prisma.player.deleteMany({});

    console.log('🗑️  Eliminando PlayerSegunda...');
    await (prisma as any).playerSegunda.deleteMany({});

    console.log('🗑️  Eliminando Users...');
    await prisma.user.deleteMany({});

    console.log('\n✅ BASE DE DATOS LIMPIADA COMPLETAMENTE\n');
    
  } catch (error) {
    console.error('❌ Error limpiando la base de datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllData();
