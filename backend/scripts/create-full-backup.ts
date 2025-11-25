import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function createFullBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupDir, `backup_full_${timestamp}.sql`);

    // Asegurar que existe el directorio
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('💾 CREANDO BACKUP COMPLETO DE LA BASE DE DATOS');
    console.log('═'.repeat(70) + '\n');

    // Obtener la URL de la base de datos
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está definida');
    }

    console.log('📊 Exportando base de datos...');
    
    try {
      // Intentar usar pg_dump si está disponible
      execSync(`pg_dump "${databaseUrl}" > "${backupFile}"`, { 
        stdio: 'inherit',
        shell: 'powershell.exe'
      });
    } catch (error: any) {
      console.log('⚠️  pg_dump no disponible, usando método alternativo...\n');
      
      // Método alternativo: dump manual usando Prisma
      await createPrismaBackup(backupFile);
    }

    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ BACKUP COMPLETADO');
    console.log('═'.repeat(70));
    console.log(`📁 Archivo: ${backupFile}`);
    console.log(`📊 Tamaño: ${fileSizeMB} MB`);
    console.log(`⏰ Fecha: ${new Date().toLocaleString('es-ES')}`);
    console.log('\n💡 Para restaurar este backup, ejecuta:');
    console.log(`   psql $env:DATABASE_URL -f "${backupFile}"\n`);

  } catch (error: any) {
    console.error('❌ Error creando backup:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function createPrismaBackup(backupFile: string) {
  const stream = fs.createWriteStream(backupFile);
  
  stream.write('-- Backup creado con Prisma\n');
  stream.write(`-- Fecha: ${new Date().toISOString()}\n\n`);

  // Exportar datos de todas las tablas principales
  const tables = [
    'User',
    'League', 
    'LeagueMember',
    'Player',
    'PlayerStats',
    'PlayerSegunda',
    'PlayerSegundaStats',
    'PlayerPremier',
    'PlayerPremierStats',
    'Squad',
    'SquadPlayer',
    'Bet',
    'BetOption',
    'SquadHistory',
    'SquadHistoryPlayer'
  ];

  for (const table of tables) {
    try {
      console.log(`   📋 Exportando ${table}...`);
      const data = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].findMany();
      
      if (data.length > 0) {
        stream.write(`\n-- Datos de ${table} (${data.length} registros)\n`);
        stream.write(`-- INSERT INTO ${table}\n`);
        stream.write(JSON.stringify(data, null, 2) + '\n');
      }
    } catch (error) {
      console.log(`   ⚠️  No se pudo exportar ${table}: ${error}`);
    }
  }

  stream.end();
  console.log('   ✅ Backup manual completado');
}

createFullBackup();
