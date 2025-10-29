import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function cleanAllBetOptions() {
    try {
        console.log('🗑️  Borrando TODAS las opciones de apuesta de la tabla bet_option...\n');
        const count = await prisma.bet_option.count();
        console.log(`📊 Total de opciones de apuesta: ${count}\n`);
        if (count === 0) {
            console.log('✅ No hay opciones de apuesta para borrar.');
            return;
        }
        const deleted = await prisma.bet_option.deleteMany({});
        console.log(`✅ ${deleted.count} opciones de apuesta eliminadas exitosamente!\n`);
        const finalCount = await prisma.bet_option.count();
        console.log(`📊 Total después de borrar: ${finalCount}\n`);
    }
    catch (error) {
        console.error('❌ Error borrando opciones de apuesta:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
cleanAllBetOptions()
    .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
