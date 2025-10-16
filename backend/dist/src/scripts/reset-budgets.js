import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function resetBudgets() {
    try {
        console.log('🔄 Iniciando reseteo de presupuestos...');
        // 1. Eliminar todos los jugadores de todas las plantillas
        const deletedPlayers = await prisma.squadPlayer.deleteMany({});
        console.log(`✅ Eliminados ${deletedPlayers.count} jugadores de plantillas`);
        // 2. Resetear todos los presupuestos a 500M
        const updatedMembers = await prisma.leagueMember.updateMany({
            data: {
                budget: 500
            }
        });
        console.log(`✅ Reseteados ${updatedMembers.count} presupuestos a 500M`);
        console.log('✨ Reseteo completado con éxito');
    }
    catch (error) {
        console.error('❌ Error al resetear:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
resetBudgets();
