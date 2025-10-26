import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
function escapeSQL(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
    }
    if (Array.isArray(value)) {
        return `'{${value.join(',')}}'`;
    }
    if (typeof value === 'object') {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    return String(value);
}
async function backupPlayers() {
    try {
        console.log('🔄 Iniciando copia de seguridad de jugadores...');
        // Obtener todos los jugadores
        const players = await prisma.player.findMany({
            orderBy: { id: 'asc' }
        });
        console.log(`📊 Total de jugadores encontrados: ${players.length}`);
        // Crear nombre de archivo con fecha y hora
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupDir = path.join(__dirname, '..', 'backups');
        // Crear directorio de backups si no existe
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        // ============ BACKUP SQL ============
        const sqlFilename = `players-backup-${timestamp}.sql`;
        const sqlFilepath = path.join(backupDir, sqlFilename);
        let sqlContent = `-- Backup de jugadores generado el ${new Date().toISOString()}\n`;
        sqlContent += `-- Total de jugadores: ${players.length}\n\n`;
        sqlContent += `-- Backup de la tabla Player\n\n`;
        // Generar INSERT statements
        players.forEach((player) => {
            const columns = [
                'id', 'name', 'position', 'teamId', 'teamHistory', 'teamName', 'teamCrest',
                'nationality', 'shirtNumber', 'photo', 'price', 'availabilityStatus',
                'availabilityInfo', 'createdAt', 'updatedAt', 'lastJornadaNumber'
            ];
            const values = [
                player.id,
                escapeSQL(player.name),
                escapeSQL(player.position),
                player.teamId,
                escapeSQL(player.teamHistory),
                escapeSQL(player.teamName),
                escapeSQL(player.teamCrest),
                escapeSQL(player.nationality),
                player.shirtNumber || 'NULL',
                escapeSQL(player.photo),
                player.price,
                escapeSQL(player.availabilityStatus),
                escapeSQL(player.availabilityInfo),
                escapeSQL(player.createdAt.toISOString()),
                escapeSQL(player.updatedAt.toISOString()),
                player.lastJornadaNumber
            ];
            sqlContent += `INSERT INTO "Player" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
        });
        // Agregar comando para actualizar la secuencia
        sqlContent += `\n-- Actualizar secuencia del ID\n`;
        sqlContent += `SELECT setval('"Player_id_seq"', (SELECT MAX(id) FROM "Player"));\n`;
        fs.writeFileSync(sqlFilepath, sqlContent, 'utf-8');
        console.log(`✅ Backup SQL guardado en: ${sqlFilepath}`);
        console.log(`📦 Tamaño del archivo SQL: ${(fs.statSync(sqlFilepath).size / 1024).toFixed(2)} KB`);
        // ============ BACKUP JSON ============
        const jsonFilename = `players-backup-${timestamp}.json`;
        const jsonFilepath = path.join(backupDir, jsonFilename);
        fs.writeFileSync(jsonFilepath, JSON.stringify(players, null, 2), 'utf-8');
        console.log(`✅ Backup JSON guardado en: ${jsonFilepath}`);
        console.log(`📦 Tamaño del archivo JSON: ${(fs.statSync(jsonFilepath).size / 1024).toFixed(2)} KB`);
        // ============ BACKUP CSV ============
        const csvFilename = `players-backup-${timestamp}.csv`;
        const csvFilepath = path.join(backupDir, csvFilename);
        const csvHeader = 'id,name,position,teamName,price,availabilityStatus,availabilityInfo,teamId\n';
        const csvRows = players.map(p => `${p.id},"${p.name}","${p.position}","${p.teamName}",${p.price},"${p.availabilityStatus}","${p.availabilityInfo || ''}",${p.teamId}`).join('\n');
        fs.writeFileSync(csvFilepath, csvHeader + csvRows, 'utf-8');
        console.log(`✅ Backup CSV guardado en: ${csvFilepath}`);
        console.log(`📦 Tamaño del archivo CSV: ${(fs.statSync(csvFilepath).size / 1024).toFixed(2)} KB`);
        // Mostrar resumen
        console.log('\n📈 Resumen de la copia de seguridad:');
        console.log(`   - Total jugadores: ${players.length}`);
        console.log(`   - Porteros: ${players.filter(p => p.position === 'Portero').length}`);
        console.log(`   - Defensas: ${players.filter(p => p.position === 'Defensa').length}`);
        console.log(`   - Centrocampistas: ${players.filter(p => p.position === 'Centrocampista').length}`);
        console.log(`   - Delanteros: ${players.filter(p => p.position === 'Delantero').length}`);
        console.log(`   - Lesionados: ${players.filter(p => p.availabilityStatus === 'INJURED').length}`);
        console.log(`   - Suspendidos: ${players.filter(p => p.availabilityStatus === 'SUSPENDED').length}`);
    }
    catch (error) {
        console.error('❌ Error al crear copia de seguridad:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
backupPlayers()
    .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
