import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
/**
 * Script para resetear los presupuestos de apuestas a 250M
 *
 * Uso:
 * - Resetear todas las ligas: npx tsx scripts/reset-betting-budgets.ts
 * - Resetear una liga específica: npx tsx scripts/reset-betting-budgets.ts <leagueId>
 */
async function resetBettingBudgets() {
    try {
        const leagueId = process.argv[2]; // Obtener leagueId de los argumentos si existe
        if (leagueId) {
            // Resetear solo una liga específica
            const result = await prisma.leagueMember.updateMany({
                where: { leagueId },
                data: { bettingBudget: 250 },
            });
            console.log(`✅ Presupuestos reseteados a 250M para ${result.count} miembros de la liga ${leagueId}`);
        }
        else {
            // Resetear todas las ligas
            const result = await prisma.leagueMember.updateMany({
                data: { bettingBudget: 250 },
            });
            console.log(`✅ Presupuestos reseteados a 250M para ${result.count} miembros en todas las ligas`);
        }
        // Mostrar estado actual
        const members = await prisma.leagueMember.findMany({
            where: leagueId ? { leagueId } : {},
            include: {
                user: { select: { name: true, email: true } },
                league: { select: { name: true } },
            },
        });
        console.log('\n📊 Estado actual de presupuestos de apuestas:');
        console.log('─'.repeat(80));
        members.forEach(member => {
            console.log(`Liga: ${member.league.name.padEnd(20)} | ` +
                `Usuario: ${(member.user.name || member.user.email).padEnd(25)} | ` +
                `Presupuesto: ${member.bettingBudget}M`);
        });
        console.log('─'.repeat(80));
    }
    catch (error) {
        console.error('❌ Error reseteando presupuestos:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
resetBettingBudgets();
