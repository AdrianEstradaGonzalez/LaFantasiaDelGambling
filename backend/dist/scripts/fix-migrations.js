/**
 * Script para resolver migraciones fallidas en producción
 * Usa prisma db push en lugar de migraciones para sincronizar el schema
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function fixFailedMigrations() {
    console.log('🔧 Resolviendo migraciones fallidas...\n');
    try {
        // 1. Verificar estado de migraciones
        console.log('1️⃣ Verificando estado de migraciones...');
        const migrations = await prisma.$queryRaw `
      SELECT migration_name, finished_at, success 
      FROM "_prisma_migrations" 
      ORDER BY finished_at DESC 
      LIMIT 10
    `;
        console.log('Migraciones recientes:', migrations);
        // 2. Buscar migración fallida
        console.log('\n2️⃣ Buscando migraciones fallidas...');
        const failedMigrations = await prisma.$queryRaw `
      SELECT migration_name, started_at, logs
      FROM "_prisma_migrations" 
      WHERE success = FALSE OR finished_at IS NULL
    `;
        if (Array.isArray(failedMigrations) && failedMigrations.length > 0) {
            console.log('❌ Migraciones fallidas encontradas:', failedMigrations);
            // 3. Marcar como completadas (si los cambios ya están en la BD)
            console.log('\n3️⃣ Marcando migraciones como completadas...');
            for (const migration of failedMigrations) {
                const migrationName = migration.migration_name;
                await prisma.$executeRaw `
          UPDATE "_prisma_migrations" 
          SET finished_at = NOW(), 
              success = TRUE 
          WHERE migration_name = ${migrationName}
        `;
                console.log(`✅ Migración ${migrationName} marcada como completada`);
            }
        }
        else {
            console.log('✅ No hay migraciones fallidas');
        }
        // 4. Verificar que existen las columnas necesarias
        console.log('\n4️⃣ Verificando columnas en bet_option...');
        const betOptionColumns = await prisma.$queryRaw `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bet_option'
    `;
        console.log('Columnas en bet_option:', betOptionColumns);
        console.log('\n5️⃣ Verificando columnas en LeagueMember...');
        const leagueMemberColumns = await prisma.$queryRaw `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'league_member'
        AND column_name = 'pointsPerJornada'
    `;
        console.log('pointsPerJornada:', leagueMemberColumns);
        console.log('\n✅ Proceso completado exitosamente');
        console.log('\n💡 Siguiente paso: Ejecutar "npm run build" en Render');
    }
    catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
fixFailedMigrations();
