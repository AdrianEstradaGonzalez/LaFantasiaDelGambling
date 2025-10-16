import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
/**
 * Script para resetear plantillas y presupuestos de fichajes a 500M
 *
 * Uso:
 * - Resetear todas las ligas: npx tsx scripts/reset-squads-and-budgets.ts
 * - Resetear una liga específica: npx tsx scripts/reset-squads-and-budgets.ts <leagueId>
 */
async function resetSquadsAndBudgets() {
    try {
        const leagueId = process.argv[2]; // Obtener leagueId de los argumentos si existe
        console.log('🔄 Iniciando reseteo de plantillas y presupuestos...\n');
        // 1. Eliminar todas las plantillas (jugadores fichados)
        if (leagueId) {
            // Eliminar plantillas de una liga específica
            const deletedSquads = await prisma.squad.deleteMany({
                where: { leagueId },
            });
            console.log(`✅ Eliminadas ${deletedSquads.count} plantillas de la liga ${leagueId}`);
        }
        else {
            // Eliminar todas las plantillas
            const deletedSquads = await prisma.squad.deleteMany({});
            console.log(`✅ Eliminadas ${deletedSquads.count} plantillas de todas las ligas`);
        }
        // 2. Resetear presupuestos de fichajes a 500M (budget e initialBudget)
        if (leagueId) {
            // Resetear solo una liga específica
            const result = await prisma.leagueMember.updateMany({
                where: { leagueId },
                data: {
                    budget: 500,
                    initialBudget: 500
                },
            });
            console.log(`✅ Presupuestos reseteados a 500M para ${result.count} miembros de la liga ${leagueId}`);
        }
        else {
            // Resetear todas las ligas
            const result = await prisma.leagueMember.updateMany({
                data: {
                    budget: 500,
                    initialBudget: 500
                },
            });
            console.log(`✅ Presupuestos reseteados a 500M para ${result.count} miembros en todas las ligas`);
        }
        // 3. Mostrar estado actual
        const members = await prisma.leagueMember.findMany({
            where: leagueId ? { leagueId } : {},
            include: {
                user: { select: { name: true, email: true } },
                league: { select: { name: true } },
            },
        });
        console.log('\n📊 Estado actual de presupuestos de fichajes:');
        console.log('─'.repeat(100));
        members.forEach((member) => {
            console.log(`Liga: ${member.league.name.padEnd(20)} | ` +
                `Usuario: ${(member.user.name || member.user.email).padEnd(25)} | ` +
                `Budget: ${member.budget}M | Initial: ${member.initialBudget}M`);
        });
        console.log('─'.repeat(100));
        // 4. Verificar que no hay plantillas
        const remainingSquads = await prisma.squad.count({
            where: leagueId ? { leagueId } : {},
        });
        console.log(`\n✅ Plantillas restantes: ${remainingSquads}`);
        console.log('✅ Reseteo completado exitosamente!\n');
    }
    catch (error) {
        console.error('❌ Error reseteando plantillas y presupuestos:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
resetSquadsAndBudgets();
