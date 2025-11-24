import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Cargar .env ANTES de crear Prisma Client
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear Prisma Client con la URL de Railway HARDCODEADA
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:qNQRVFyGnbjfARnIvWyKBwrAFoTdeqFq@mainline.proxy.rlwy.net:56424/railway"
    }
  }
});

async function backupRailway() {
  console.log('🔒 Iniciando backup completo de Railway...\n');

  try {
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(backupDir, `railway-backup-${timestamp}.json`);

    console.log('📊 Exportando datos de todas las tablas...\n');

    const backup: any = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
      data: {}
    };

    // User
    console.log('   📦 Exportando User...');
    backup.data.user = await prisma.user.findMany();
    console.log(`      ✅ ${backup.data.user.length} registros`);

    // Player (Primera)
    console.log('   📦 Exportando Player...');
    backup.data.player = await prisma.player.findMany();
    console.log(`      ✅ ${backup.data.player.length} registros`);

    // PlayerStats
    console.log('   📦 Exportando PlayerStats...');
    backup.data.playerStats = await prisma.playerStats.findMany();
    console.log(`      ✅ ${backup.data.playerStats.length} registros`);

    // PlayerSegunda
    console.log('   📦 Exportando PlayerSegunda...');
    backup.data.playerSegunda = await prisma.playerSegunda.findMany();
    console.log(`      ✅ ${backup.data.playerSegunda.length} registros`);

    // PlayerSegundaStats
    console.log('   📦 Exportando PlayerSegundaStats...');
    backup.data.playerSegundaStats = await prisma.playerSegundaStats.findMany();
    console.log(`      ✅ ${backup.data.playerSegundaStats.length} registros`);

    // PlayerPremier
    console.log('   📦 Exportando PlayerPremier...');
    backup.data.playerPremier = await prisma.playerPremier.findMany();
    console.log(`      ✅ ${backup.data.playerPremier.length} registros`);

    // PlayerPremierStats
    console.log('   📦 Exportando PlayerPremierStats...');
    backup.data.playerPremierStats = await prisma.playerPremierStats.findMany();
    console.log(`      ✅ ${backup.data.playerPremierStats.length} registros`);

    // Squad
    console.log('   📦 Exportando Squad...');
    backup.data.squad = await prisma.squad.findMany();
    console.log(`      ✅ ${backup.data.squad.length} registros`);

    // SquadPlayer
    console.log('   📦 Exportando SquadPlayer...');
    backup.data.squadPlayer = await prisma.squadPlayer.findMany();
    console.log(`      ✅ ${backup.data.squadPlayer.length} registros`);

    // League
    console.log('   📦 Exportando League...');
    backup.data.league = await prisma.league.findMany();
    console.log(`      ✅ ${backup.data.league.length} registros`);

    // LeagueMember
    console.log('   📦 Exportando LeagueMember...');
    backup.data.leagueMember = await prisma.leagueMember.findMany();
    console.log(`      ✅ ${backup.data.leagueMember.length} registros`);

    // Bet
    console.log('   📦 Exportando Bet...');
    backup.data.bet = await prisma.bet.findMany();
    console.log(`      ✅ ${backup.data.bet.length} registros`);

    // BetOption
    console.log('   📦 Exportando Bet_option...');
    backup.data.bet_option = await prisma.bet_option.findMany();
    console.log(`      ✅ ${backup.data.bet_option.length} registros`);

    // InvalidTeam (NUEVA)
    try {
      console.log('   📦 Exportando InvalidTeam...');
      backup.data.invalidTeam = await (prisma as any).invalidTeam.findMany();
      console.log(`      ✅ ${backup.data.invalidTeam.length} registros`);
    } catch (e) {
      console.log('      ⚠️  Tabla InvalidTeam no existe o está vacía');
      backup.data.invalidTeam = [];
    }

    // SquadHistory (NUEVA)
    try {
      console.log('   📦 Exportando SquadHistory...');
      backup.data.squadHistory = await (prisma as any).squadHistory.findMany();
      console.log(`      ✅ ${backup.data.squadHistory.length} registros`);
    } catch (e) {
      console.log('      ⚠️  Tabla SquadHistory no existe o está vacía');
      backup.data.squadHistory = [];
    }

    // Guardar archivo
    console.log('\n💾 Guardando backup en archivo...');
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    let totalRecords = 0;
    Object.keys(backup.data).forEach(table => {
      totalRecords += backup.data[table].length;
    });

    console.log('✅ Backup completado exitosamente!\n');
    console.log('📄 Archivo de backup:');
    console.log(`   Ubicación: ${backupFile}`);
    console.log(`   Tamaño: ${fileSizeMB} MB`);
    console.log(`   Fecha: ${new Date().toLocaleString('es-ES')}`);
    console.log(`   Registros totales: ${totalRecords}\n`);

    console.log('📋 Tablas incluidas:');
    Object.keys(backup.data).forEach(table => {
      console.log(`   ✓ ${table}: ${backup.data[table].length} registros`);
    });

    await prisma.$disconnect();
    return backupFile;

  } catch (error: any) {
    console.error('❌ Error creando backup:', error);
    await prisma.$disconnect();
    throw error;
  }
}

backupRailway()
  .then(() => {
    console.log('\n🎉 Proceso de backup finalizado correctamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal en el proceso de backup\n');
    process.exit(1);
  });
