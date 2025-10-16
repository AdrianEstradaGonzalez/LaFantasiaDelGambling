import { PrismaClient } from '@prisma/client';
import { JornadaService } from '../src/services/jornada.service';
const prisma = new PrismaClient();
/**
 * Script para ejecutar cambio de jornada
 *
 * Uso:
 * - Cambiar jornada para una liga: npx tsx scripts/cambiar-jornada.ts <leagueId> <jornada>
 * - Cambiar jornada para todas las ligas: npx tsx scripts/cambiar-jornada.ts all <jornada>
 *
 * Ejemplos:
 * npx tsx scripts/cambiar-jornada.ts cm2abc123xyz 11
 * npx tsx scripts/cambiar-jornada.ts all 11
 */
async function cambiarJornada() {
    try {
        const args = process.argv.slice(2);
        if (args.length < 2) {
            console.log(`
❌ Uso incorrecto

Uso:
  npx tsx scripts/cambiar-jornada.ts <leagueId> <jornada>
  npx tsx scripts/cambiar-jornada.ts all <jornada>

Ejemplos:
  npx tsx scripts/cambiar-jornada.ts cm2abc123xyz 11
  npx tsx scripts/cambiar-jornada.ts all 11
      `);
            process.exit(1);
        }
        const [target, jornadaStr] = args;
        const jornada = parseInt(jornadaStr);
        if (isNaN(jornada) || jornada < 1) {
            console.error('❌ La jornada debe ser un número mayor a 0');
            process.exit(1);
        }
        console.log('='.repeat(80));
        console.log(`🏆 CAMBIO DE JORNADA ${jornada}`);
        console.log('='.repeat(80));
        if (target === 'all') {
            // Procesar todas las ligas
            console.log('\n🌍 Procesando TODAS las ligas...\n');
            const result = await JornadaService.resetAllLeagues(jornada);
            console.log('\n' + '='.repeat(80));
            console.log('📊 RESUMEN FINAL');
            console.log('='.repeat(80));
            console.log(`✅ Ligas procesadas: ${result.leaguesProcessed}`);
            console.log(`✅ Apuestas evaluadas: ${result.totalEvaluations}`);
            console.log('='.repeat(80));
        }
        else {
            // Procesar una liga específica
            const leagueId = target;
            // Verificar que la liga existe
            const league = await prisma.league.findUnique({
                where: { id: leagueId },
            });
            if (!league) {
                console.error(`❌ No se encontró la liga con ID: ${leagueId}`);
                process.exit(1);
            }
            console.log(`\n📋 Liga: ${league.name} (${league.id})\n`);
            const result = await JornadaService.resetJornada(leagueId, jornada);
            console.log('\n' + '='.repeat(80));
            console.log('📊 RESUMEN');
            console.log('='.repeat(80));
            console.log(`✅ Apuestas evaluadas: ${result.evaluations.length}`);
            console.log(`✅ Miembros actualizados: ${result.updatedMembers}`);
            console.log('\n💰 Balances por usuario:');
            console.log('-'.repeat(80));
            result.balances.forEach((balance, userId) => {
                console.log(`  ${userId}: ${balance.wonBets}W/${balance.lostBets}L = ` +
                    `${balance.totalProfit >= 0 ? '+' : ''}${balance.totalProfit}M`);
            });
            console.log('='.repeat(80));
        }
        console.log('\n✨ Proceso completado exitosamente\n');
    }
    catch (error) {
        console.error('\n❌ Error en cambio de jornada:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
cambiarJornada();
