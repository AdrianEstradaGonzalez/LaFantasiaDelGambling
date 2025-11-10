import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

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
    const backupFile = path.join(backupDir, `prisma-backup-${timestamp}.json`);

    console.log('📊 Exportando datos de todas las tablas...\n');

    // Exportar todas las tablas principales
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: [] as string[]
      },
      data: {} as any
    };

    // Lista de tablas a respaldar
    const tables = [
      'user',
      'session',
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
      'bet_option',
      'betRestriction'
    ];

    let totalRecords = 0;

    for (const table of tables) {
      try {
        console.log(`   📦 Exportando tabla: ${table}...`);
        
        // Usar prisma[table].findMany() dinámicamente
        const records = await (prisma as any)[table].findMany();
        backup.data[table] = records;
        backup.metadata.tables.push(table);
        
        console.log(`      ✓ ${records.length} registros exportados`);
        totalRecords += records.length;
      } catch (error: any) {
        console.log(`      ⚠️ Error exportando ${table}: ${error.message}`);
        backup.data[table] = [];
      }
    }

    console.log(`\n✅ Total de registros exportados: ${totalRecords}\n`);

    // Guardar backup en archivo JSON
    console.log('💾 Guardando backup en archivo...');
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');

    // Verificar que el archivo se creó
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log('✅ Backup completado exitosamente!\n');
      console.log('📄 Archivo de backup:');
      console.log(`   Ubicación: ${backupFile}`);
      console.log(`   Tamaño: ${fileSizeMB} MB`);
      console.log(`   Fecha: ${new Date().toLocaleString('es-ES')}`);
      console.log(`   Registros: ${totalRecords}\n`);

      console.log('📋 Tablas incluidas en el backup:');
      backup.metadata.tables.forEach(table => {
        const count = backup.data[table]?.length || 0;
        console.log(`   ✓ ${table}: ${count} registros`);
      });
      console.log('');

      // También crear un backup comprimido (solo texto plano)
      const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.txt`);
      const summary = `
BACKUP DE BASE DE DATOS
========================
Fecha: ${new Date().toLocaleString('es-ES')}
Archivo: ${backupFile}
Total de registros: ${totalRecords}

TABLAS:
${backup.metadata.tables.map(t => `  - ${t}: ${backup.data[t]?.length || 0} registros`).join('\n')}

Para restaurar este backup:
  npm run restore-backup -- ${path.basename(backupFile)}
`;
      
      fs.writeFileSync(summaryFile, summary, 'utf-8');
      console.log(`📝 Resumen guardado en: ${summaryFile}\n`);

      return backupFile;
    } else {
      throw new Error('El archivo de backup no se creó correctamente');
    }

  } catch (error: any) {
    console.error('❌ Error creando backup:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
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
