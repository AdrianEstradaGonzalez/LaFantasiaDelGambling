import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function restoreFromBackup(backupFileName: string) {
  try {
    console.log('\n🔄 RESTAURANDO DESDE BACKUP...\n');

    const backupDir = path.join(__dirname, '..', 'backups');
    const backupFile = path.join(backupDir, backupFileName);

    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Archivo de backup no encontrado: ${backupFile}`);
      process.exit(1);
    }

    console.log(`📂 Leyendo backup: ${backupFileName}`);
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    // Restaurar en orden de dependencias
    
    // 1. Users
    if (backupData.tables.users && backupData.tables.users.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.users.length} usuarios...`);
      await prisma.user.createMany({
        data: backupData.tables.users,
        skipDuplicates: true
      });
      console.log('✅ Usuarios restaurados');
    }

    // 2. Leagues
    if (backupData.tables.leagues && backupData.tables.leagues.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.leagues.length} ligas...`);
      await prisma.league.createMany({
        data: backupData.tables.leagues,
        skipDuplicates: true
      });
      console.log('✅ Ligas restauradas');
    }

    // 3. LeagueMembers
    if (backupData.tables.leagueMembers && backupData.tables.leagueMembers.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.leagueMembers.length} miembros de ligas...`);
      await prisma.leagueMember.createMany({
        data: backupData.tables.leagueMembers,
        skipDuplicates: true
      });
      console.log('✅ Miembros de ligas restaurados');
    }

    // 4. Players
    if (backupData.tables.players && backupData.tables.players.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.players.length} jugadores...`);
      await prisma.player.createMany({
        data: backupData.tables.players,
        skipDuplicates: true
      });
      console.log('✅ Jugadores restaurados');
    }

    // 5. PlayerSegunda
    if (backupData.tables.playersSegunda && backupData.tables.playersSegunda.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.playersSegunda.length} jugadores de segunda...`);
      await (prisma as any).playerSegunda.createMany({
        data: backupData.tables.playersSegunda,
        skipDuplicates: true
      });
      console.log('✅ Jugadores de segunda restaurados');
    }

    // 6. PlayerStats
    if (backupData.tables.playerStats && backupData.tables.playerStats.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.playerStats.length} estadísticas de jugadores...`);
      await prisma.playerStats.createMany({
        data: backupData.tables.playerStats,
        skipDuplicates: true
      });
      console.log('✅ Estadísticas restauradas');
    }

    // 7. PlayerJornadaPoints
    if (backupData.tables.playerJornadaPoints && backupData.tables.playerJornadaPoints.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.playerJornadaPoints.length} puntos por jornada...`);
      await prisma.playerJornadaPoints.createMany({
        data: backupData.tables.playerJornadaPoints,
        skipDuplicates: true
      });
      console.log('✅ Puntos por jornada restaurados');
    }

    // 8. Squads
    if (backupData.tables.squads && backupData.tables.squads.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.squads.length} plantillas...`);
      await prisma.squad.createMany({
        data: backupData.tables.squads,
        skipDuplicates: true
      });
      console.log('✅ Plantillas restauradas');
    }

    // 9. SquadPlayers
    if (backupData.tables.squadPlayers && backupData.tables.squadPlayers.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.squadPlayers.length} jugadores de plantillas...`);
      await prisma.squadPlayer.createMany({
        data: backupData.tables.squadPlayers,
        skipDuplicates: true
      });
      console.log('✅ Jugadores de plantillas restaurados');
    }

    // 10. BetOptions
    if (backupData.tables.betOptions && backupData.tables.betOptions.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.betOptions.length} opciones de apuestas...`);
      await prisma.bet_option.createMany({
        data: backupData.tables.betOptions,
        skipDuplicates: true
      });
      console.log('✅ Opciones de apuestas restauradas');
    }

    // 11. Bets
    if (backupData.tables.bets && backupData.tables.bets.length > 0) {
      console.log(`\n📦 Restaurando ${backupData.tables.bets.length} apuestas...`);
      await prisma.bet.createMany({
        data: backupData.tables.bets,
        skipDuplicates: true
      });
      console.log('✅ Apuestas restauradas');
    }

    console.log('\n✅ RESTAURACIÓN COMPLETADA EXITOSAMENTE\n');
    console.log('📊 Resumen de datos restaurados:');
    console.log(`   - Users: ${backupData.tables.users?.length || 0}`);
    console.log(`   - Leagues: ${backupData.tables.leagues?.length || 0}`);
    console.log(`   - LeagueMembers: ${backupData.tables.leagueMembers?.length || 0}`);
    console.log(`   - Players: ${backupData.tables.players?.length || 0}`);
    console.log(`   - PlayerSegunda: ${backupData.tables.playersSegunda?.length || 0}`);
    console.log(`   - PlayerStats: ${backupData.tables.playerStats?.length || 0}`);
    console.log(`   - PlayerJornadaPoints: ${backupData.tables.playerJornadaPoints?.length || 0}`);
    console.log(`   - Squads: ${backupData.tables.squads?.length || 0}`);
    console.log(`   - SquadPlayers: ${backupData.tables.squadPlayers?.length || 0}`);
    console.log(`   - BetOptions: ${backupData.tables.betOptions?.length || 0}`);
    console.log(`   - Bets: ${backupData.tables.bets?.length || 0}\n`);

  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener nombre del archivo desde argumentos
const backupFileName = process.argv[2];

if (!backupFileName) {
  console.error('\n❌ Error: Debes especificar el nombre del archivo de backup');
  console.log('\nUso: npm run restore:backup -- full-backup-2025-11-03T22-58-27.json\n');
  process.exit(1);
}

restoreFromBackup(backupFileName);
