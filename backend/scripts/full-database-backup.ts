import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function escapeSQL(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (Array.isArray(value)) {
    return `'{${value.join(',')}}'`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  }
  return String(value);
}

async function fullDatabaseBackup() {
  try {
    console.log('\\n🔄 INICIANDO BACKUP COMPLETO DE LA BASE DE DATOS...\\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(__dirname, '..', 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const sqlFile = path.join(backupDir, `full-backup-${timestamp}.sql`);
    const jsonFile = path.join(backupDir, `full-backup-${timestamp}.json`);
    
    let sqlContent = `-- BACKUP COMPLETO DE LA BASE DE DATOS\n`;
    sqlContent += `-- Fecha: ${new Date().toISOString()}\n`;
    sqlContent += `-- Generado automáticamente\n\n`;
    
    const jsonBackup: any = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    // ==================== USERS ====================
    console.log('📦 Respaldando Users...');
    const users = await prisma.user.findMany();
    jsonBackup.tables.users = users;
    
    if (users.length > 0) {
      sqlContent += `\n-- ==================== USERS (${users.length}) ====================\n`;
      for (const user of users) {
        const cols = Object.keys(user).join(', ');
        const vals = Object.values(user).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "User" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== LEAGUES ====================
    console.log('📦 Respaldando Leagues...');
    const leagues = await prisma.league.findMany();
    jsonBackup.tables.leagues = leagues;
    
    if (leagues.length > 0) {
      sqlContent += `\n-- ==================== LEAGUES (${leagues.length}) ====================\n`;
      for (const league of leagues) {
        const cols = Object.keys(league).join(', ');
        const vals = Object.values(league).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "League" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== LEAGUE MEMBERS ====================
    console.log('📦 Respaldando LeagueMembers...');
    const leagueMembers = await prisma.leagueMember.findMany();
    jsonBackup.tables.leagueMembers = leagueMembers;
    
    if (leagueMembers.length > 0) {
      sqlContent += `\n-- ==================== LEAGUE MEMBERS (${leagueMembers.length}) ====================\n`;
      for (const member of leagueMembers) {
        const cols = Object.keys(member).join(', ');
        const vals = Object.values(member).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "LeagueMember" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== PLAYERS ====================
    console.log('📦 Respaldando Players...');
    const players = await prisma.player.findMany();
    jsonBackup.tables.players = players;
    
    if (players.length > 0) {
      sqlContent += `\n-- ==================== PLAYERS (${players.length}) ====================\n`;
      for (const player of players) {
        const cols = Object.keys(player).join(', ');
        const vals = Object.values(player).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "Player" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== PLAYER SEGUNDA ====================
    console.log('📦 Respaldando PlayerSegunda...');
    const playersSegunda = await (prisma as any).playerSegunda.findMany();
    jsonBackup.tables.playersSegunda = playersSegunda;
    
    if (playersSegunda.length > 0) {
      sqlContent += `\n-- ==================== PLAYER SEGUNDA (${playersSegunda.length}) ====================\n`;
      for (const player of playersSegunda) {
        const cols = Object.keys(player).join(', ');
        const vals = Object.values(player).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "PlayerSegunda" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== PLAYER STATS ====================
    console.log('📦 Respaldando PlayerStats...');
    const playerStats = await prisma.playerStats.findMany();
    jsonBackup.tables.playerStats = playerStats;
    
    if (playerStats.length > 0) {
      sqlContent += `\n-- ==================== PLAYER STATS (${playerStats.length}) ====================\n`;
      for (const stat of playerStats) {
        const cols = Object.keys(stat).join(', ');
        const vals = Object.values(stat).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "PlayerStats" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== SQUADS ====================
    console.log('📦 Respaldando Squads...');
    const squads = await prisma.squad.findMany();
    jsonBackup.tables.squads = squads;
    
    if (squads.length > 0) {
      sqlContent += `\n-- ==================== SQUADS (${squads.length}) ====================\n`;
      for (const squad of squads) {
        const cols = Object.keys(squad).join(', ');
        const vals = Object.values(squad).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "Squad" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== SQUAD PLAYERS ====================
    console.log('📦 Respaldando SquadPlayers...');
    const squadPlayers = await prisma.squadPlayer.findMany();
    jsonBackup.tables.squadPlayers = squadPlayers;
    
    if (squadPlayers.length > 0) {
      sqlContent += `\n-- ==================== SQUAD PLAYERS (${squadPlayers.length}) ====================\n`;
      for (const sp of squadPlayers) {
        const cols = Object.keys(sp).join(', ');
        const vals = Object.values(sp).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "SquadPlayer" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== PLAYER JORNADA POINTS ====================
    console.log('📦 Respaldando PlayerJornadaPoints...');
    const playerJornadaPoints = await prisma.playerJornadaPoints.findMany();
    jsonBackup.tables.playerJornadaPoints = playerJornadaPoints;
    
    if (playerJornadaPoints.length > 0) {
      sqlContent += `\n-- ==================== PLAYER JORNADA POINTS (${playerJornadaPoints.length}) ====================\n`;
      for (const pjp of playerJornadaPoints) {
        const cols = Object.keys(pjp).join(', ');
        const vals = Object.values(pjp).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "PlayerJornadaPoints" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== BETS ====================
    console.log('📦 Respaldando Bets...');
    const bets = await prisma.bet.findMany();
    jsonBackup.tables.bets = bets;
    
    if (bets.length > 0) {
      sqlContent += `\n-- ==================== BETS (${bets.length}) ====================\n`;
      for (const bet of bets) {
        const cols = Object.keys(bet).join(', ');
        const vals = Object.values(bet).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "Bet" (${cols}) VALUES (${vals});\n`;
      }
    }

    // ==================== BET OPTIONS ====================
    console.log('📦 Respaldando BetOptions...');
    const betOptions = await prisma.bet_option.findMany();
    jsonBackup.tables.betOptions = betOptions;
    
    if (betOptions.length > 0) {
      sqlContent += `\n-- ==================== BET OPTIONS (${betOptions.length}) ====================\n`;
      for (const option of betOptions) {
        const cols = Object.keys(option).join(', ');
        const vals = Object.values(option).map(escapeSQL).join(', ');
        sqlContent += `INSERT INTO "Bet_option" (${cols}) VALUES (${vals});\n`;
      }
    }

    // Guardar archivos
    console.log('\n💾 Guardando archivos...');
    fs.writeFileSync(sqlFile, sqlContent, 'utf8');
    fs.writeFileSync(jsonFile, JSON.stringify(jsonBackup, null, 2), 'utf8');

    console.log('\n✅ BACKUP COMPLETO FINALIZADO\n');
    console.log('📁 Archivos generados:');
    console.log(`   SQL:  ${sqlFile}`);
    console.log(`   JSON: ${jsonFile}`);
    
    console.log('\n📊 Resumen:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Leagues: ${leagues.length}`);
    console.log(`   - LeagueMembers: ${leagueMembers.length}`);
    console.log(`   - Players: ${players.length}`);
    console.log(`   - PlayerSegunda: ${playersSegunda.length}`);
    console.log(`   - PlayerStats: ${playerStats.length}`);
    console.log(`   - Squads: ${squads.length}`);
    console.log(`   - SquadPlayers: ${squadPlayers.length}`);
    console.log(`   - PlayerJornadaPoints: ${playerJornadaPoints.length}`);
    console.log(`   - Bets: ${bets.length}`);
    console.log(`   - BetOptions: ${betOptions.length}\n`);

  } catch (error) {
    console.error('❌ Error durante el backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fullDatabaseBackup();
