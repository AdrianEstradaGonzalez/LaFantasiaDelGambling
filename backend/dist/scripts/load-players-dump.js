import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
const prisma = new PrismaClient();
async function loadPlayersDump() {
    try {
        console.log('📂 Cargando archivo SQL...');
        const sqlFilePath = path.join('./database_players_dump.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
        console.log('✅ Archivo cargado correctamente');
        console.log(`📊 Tamaño: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);
        console.log('🗑️  Limpiando tabla de jugadores...');
        await prisma.player.deleteMany({});
        console.log('✅ Tabla limpiada\n');
        console.log('🚀 Ejecutando SQL...');
        // Dividir el SQL en statements individuales
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        console.log(`📋 Ejecutando ${statements.length} statements SQL...\n`);
        let executed = 0;
        for (const statement of statements) {
            if (statement.toLowerCase().includes('insert into')) {
                await prisma.$executeRawUnsafe(statement);
                executed++;
                if (executed % 10 === 0) {
                    process.stdout.write(`\r   Progreso: ${executed}/${statements.length} statements ejecutados...`);
                }
            }
        }
        console.log(`\n✅ SQL ejecutado correctamente (${executed} inserts)\n`);
        // Verificar cuántos jugadores se insertaron
        const count = await prisma.player.count();
        console.log(`✅ Total de jugadores en la base de datos: ${count}`);
        // Mostrar algunos ejemplos
        const samplePlayers = await prisma.player.findMany({
            take: 5,
            orderBy: { price: 'desc' }
        });
        console.log('\n📋 Jugadores más caros (muestra):');
        samplePlayers.forEach(p => {
            console.log(`   ${p.name.padEnd(25)} - ${p.position.padEnd(12)} - ${p.teamName.padEnd(20)} - ${p.price}M`);
        });
    }
    catch (error) {
        console.error('❌ Error al cargar el dump:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
loadPlayersDump();
