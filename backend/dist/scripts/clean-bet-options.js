/**
 * SCRIPT: Vaciar tabla bet_option
 *
 * Ejecutar con: npx tsx scripts/clean-bet-options.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function cleanBetOptions() {
    try {
        console.log('🗑️  Vaciando tabla bet_option...\n');
        // Contar registros antes de eliminar
        const countBefore = await prisma.bet_option.count();
        console.log(`📊 Registros encontrados: ${countBefore}`);
        if (countBefore === 0) {
            console.log('✅ La tabla bet_option ya está vacía');
            return;
        }
        // Eliminar todos los registros
        const result = await prisma.bet_option.deleteMany({});
        console.log(`\n✅ Eliminados ${result.count} registros de bet_option`);
        // Verificar que la tabla quedó vacía
        const countAfter = await prisma.bet_option.count();
        console.log(`📊 Registros restantes: ${countAfter}`);
        if (countAfter === 0) {
            console.log('\n🎉 Tabla bet_option vaciada exitosamente');
        }
        else {
            console.log('\n⚠️  Advertencia: Aún quedan registros en la tabla');
        }
    }
    catch (error) {
        console.error('❌ Error vaciando bet_option:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
cleanBetOptions();
