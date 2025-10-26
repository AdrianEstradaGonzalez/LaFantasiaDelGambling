/**
 * Script para eliminar todas las opciones de apuesta de tipo "Doble oportunidad"
 * de la base de datos, ya que este tipo ha sido eliminado del sistema.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function cleanDobleOportunidad() {
    try {
        console.log('\n🗑️  Limpiando opciones de apuesta "Doble oportunidad"...\n');
        // 1. Ver cuántas hay
        const count = await prisma.bet_option.count({
            where: {
                betType: 'Doble oportunidad'
            }
        });
        console.log(`📊 Encontradas ${count} opciones de tipo "Doble oportunidad"`);
        if (count === 0) {
            console.log('✅ No hay opciones de "Doble oportunidad" para eliminar');
            return;
        }
        // 2. Mostrar algunas de ejemplo
        const examples = await prisma.bet_option.findMany({
            where: {
                betType: 'Doble oportunidad'
            },
            take: 5
        });
        console.log('\n📋 Ejemplos de opciones a eliminar:');
        examples.forEach((opt, i) => {
            console.log(`   ${i + 1}. ${opt.homeTeam} vs ${opt.awayTeam} - ${opt.betLabel} (cuota: ${opt.odd})`);
        });
        // 3. Eliminar
        console.log(`\n🗑️  Eliminando ${count} opciones...`);
        const deleted = await prisma.bet_option.deleteMany({
            where: {
                betType: 'Doble oportunidad'
            }
        });
        console.log(`✅ ${deleted.count} opciones de "Doble oportunidad" eliminadas\n`);
        // 4. Verificar apuestas asociadas
        const betsCount = await prisma.bet.count({
            where: {
                betType: 'Doble oportunidad',
                status: 'pending'
            }
        });
        if (betsCount > 0) {
            console.log(`⚠️  ADVERTENCIA: Hay ${betsCount} apuestas pendientes de tipo "Doble oportunidad"`);
            console.log('   Estas apuestas no se podrán evaluar correctamente.');
            console.log('   Considera eliminarlas también:\n');
            console.log('   await prisma.bet.deleteMany({');
            console.log('     where: { betType: "Doble oportunidad", status: "pending" }');
            console.log('   });\n');
        }
        else {
            console.log('✅ No hay apuestas pendientes de este tipo\n');
        }
    }
    catch (error) {
        console.error('❌ Error limpiando opciones:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Ejecutar
cleanDobleOportunidad()
    .then(() => {
    console.log('✨ Script completado\n');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
