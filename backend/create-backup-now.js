import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function createBackup() {
  try {
    console.log('📦 Creando backup completo de la base de datos...\n');

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    
    // Obtener todos los datos
    console.log('📊 Extrayendo datos...');
    const [
      users,
      players,
      playerStats,
      playerSegunda,
      playerSegundaStats,
      playerPremier,
      playerPremierStats,
      squads,
      squadPlayers,
      leagues,
      leagueMembers,
      bets,
      betOptions
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.player.findMany(),
      prisma.playerStats.findMany(),
      prisma.playerSegunda.findMany(),
      prisma.playerSegundaStats.findMany(),
      prisma.playerPremier.findMany(),
      prisma.playerPremierStats.findMany(),
      prisma.squad.findMany(),
      prisma.squadPlayer.findMany(),
      prisma.league.findMany(),
      prisma.leagueMember.findMany(),
      prisma.bet.findMany(),
      prisma.bet_option.findMany()
    ]);

    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: [
          'user',
          'player',
          'playerStats',
          'playerSegunda',
          'playerSegundaStats',
          'playerPremier',
          'playerPremierStats',
          'squad',
          'squadPlayer',
          'league',
          'leagueMember',
          'bet',
          'bet_option'
        ]
      },
      data: {
        user: users,
        player: players,
        playerStats: playerStats,
        playerSegunda: playerSegunda,
        playerSegundaStats: playerSegundaStats,
        playerPremier: playerPremier,
        playerPremierStats: playerPremierStats,
        squad: squads,
        squadPlayer: squadPlayers,
        league: leagues,
        leagueMember: leagueMembers,
        bet: bets,
        bet_option: betOptions
      }
    };

    const totalRecords = 
      users.length +
      players.length +
      playerStats.length +
      playerSegunda.length +
      playerSegundaStats.length +
      playerPremier.length +
      playerPremierStats.length +
      squads.length +
      squadPlayers.length +
      leagues.length +
      leagueMembers.length +
      bets.length +
      betOptions.length;

    // Guardar backup
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `prisma-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    // Crear resumen
    const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.txt`);
    const summary = `
BACKUP DE BASE DE DATOS
========================
Fecha: ${new Date().toLocaleString('es-ES')}
Archivo: ${backupFile}
Total de registros: ${totalRecords}

TABLAS:
  - user: ${users.length} registros
  - player: ${players.length} registros
  - playerStats: ${playerStats.length} registros
  - playerSegunda: ${playerSegunda.length} registros
  - playerSegundaStats: ${playerSegundaStats.length} registros
  - playerPremier: ${playerPremier.length} registros
  - playerPremierStats: ${playerPremierStats.length} registros
  - squad: ${squads.length} registros
  - squadPlayer: ${squadPlayers.length} registros
  - league: ${leagues.length} registros
  - leagueMember: ${leagueMembers.length} registros
  - bet: ${bets.length} registros
  - bet_option: ${betOptions.length} registros

Para restaurar este backup:
  npm run restore-backup -- prisma-backup-${timestamp}.json
`;

    fs.writeFileSync(summaryFile, summary);

    console.log('✅ Backup creado exitosamente!\n');
    console.log(`📁 Archivo: ${backupFile}`);
    console.log(`📄 Resumen: ${summaryFile}`);
    console.log(`\n📊 Total de registros: ${totalRecords}`);
    console.log('\nDetalle por tabla:');
    console.log(`  👤 Usuarios: ${users.length}`);
    console.log(`  ⚽ Jugadores Primera: ${players.length}`);
    console.log(`  📊 Stats Primera: ${playerStats.length}`);
    console.log(`  ⚽ Jugadores Segunda: ${playerSegunda.length}`);
    console.log(`  📊 Stats Segunda: ${playerSegundaStats.length}`);
    console.log(`  ⚽ Jugadores Premier: ${playerPremier.length}`);
    console.log(`  📊 Stats Premier: ${playerPremierStats.length}`);
    console.log(`  🏆 Ligas: ${leagues.length}`);
    console.log(`  👥 Miembros de liga: ${leagueMembers.length}`);
    console.log(`  ⚽ Plantillas: ${squads.length}`);
    console.log(`  👤 Jugadores en plantillas: ${squadPlayers.length}`);
    console.log(`  🎲 Apuestas: ${bets.length}`);
    console.log(`  🎯 Opciones de apuesta: ${betOptions.length}`);

  } catch (error) {
    console.error('❌ Error creando backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createBackup();
