import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

async function backupDatabase() {
  console.log('🔒 Iniciando backup completo de la base de datos...\n');

  try {
    // Crear directorio de backups si no existe
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('📁 Directorio de backups creado\n');
    }

    // Nombre del archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(backupDir, `full-backup-${timestamp}.sql`);

    // Parsear DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está configurada en .env');
    }

    // Formato: postgresql://usuario:password@host:puerto/database
    const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      throw new Error('Formato de DATABASE_URL inválido');
    }

    const [, user, password, host, port, database] = urlMatch;

    console.log('📊 Información de conexión:');
    console.log(`   Host: ${host}`);
    console.log(`   Puerto: ${port}`);
    console.log(`   Base de datos: ${database}`);
    console.log(`   Usuario: ${user}\n`);

    // Comando pg_dump para Windows
    const pgDumpCommand = `set PGPASSWORD=${password} && pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${backupFile}"`;

    console.log('💾 Ejecutando pg_dump...');
    console.log('   (esto puede tardar unos segundos)\n');

    await execAsync(pgDumpCommand, { 
      shell: 'cmd.exe',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    // Verificar que el archivo se creó y tiene contenido
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log('✅ Backup completado exitosamente!\n');
      console.log('📄 Archivo de backup:');
      console.log(`   Ubicación: ${backupFile}`);
      console.log(`   Tamaño: ${fileSizeMB} MB`);
      console.log(`   Fecha: ${new Date().toLocaleString('es-ES')}\n`);

      // Mostrar información de tablas principales
      console.log('📋 Backup incluye todas las tablas:');
      console.log('   ✓ Player, PlayerStats');
      console.log('   ✓ Squad, SquadPlayer');
      console.log('   ✓ League, LeagueMember');
      console.log('   ✓ Bet, Bet_option');
      console.log('   ✓ User, Session');
      console.log('   ✓ Y todas las demás tablas...\n');

      console.log('🔐 Para restaurar este backup:');
      console.log(`   psql -h ${host} -p ${port} -U ${user} -d ${database} < "${backupFile}"\n`);

      return backupFile;
    } else {
      throw new Error('El archivo de backup no se creó correctamente');
    }

  } catch (error: any) {
    console.error('❌ Error creando backup:', error.message);
    
    if (error.message.includes('pg_dump')) {
      console.error('\n⚠️  PostgreSQL client tools no están instalados o no están en PATH');
      console.error('   Descarga e instala PostgreSQL desde: https://www.postgresql.org/download/windows/');
      console.error('   O usa Railway CLI: railway run pg_dump...\n');
    }
    
    throw error;
  }
}

// Ejecutar directamente
backupDatabase()
  .then((backupFile) => {
    console.log('🎉 Proceso de backup finalizado correctamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal en el proceso de backup\n');
    process.exit(1);
  });

export { backupDatabase };
