import { PrismaClient } from '@prisma/client';
import { reevaluateCurrentJornadaBets } from '../src/services/betEvaluation.service.js';

const prisma = new PrismaClient();

/**
 * Script para reevaluar TODAS las apuestas de la jornada actual de todas las ligas
 * Incluye apuestas ganadas, perdidas y pendientes para verificar evaluaciones
 * Útil para depurar errores de evaluación y corregir discrepancias
 */
async function reevaluateAllBets() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🔄 REEVALUACIÓN DE APUESTAS DE JORNADA ACTUAL');
    console.log('═'.repeat(70));
    console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}\n`);

    // Obtener todas las ligas activas
    const leagues = await prisma.league.findMany({
      select: {
        id: true,
        name: true,
        division: true,
        currentJornada: true,
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        division: 'asc'
      }
    });

    if (leagues.length === 0) {
      console.log('✨ No hay ligas registradas\n');
      return;
    }

    console.log(`📊 Total de ligas: ${leagues.length}\n`);

    // Agrupar por división
    const leaguesByDivision = {
      primera: leagues.filter(l => l.division === 'primera'),
      segunda: leagues.filter(l => l.division === 'segunda'),
      premier: leagues.filter(l => l.division === 'premier')
    };

    console.log('📋 Ligas por división:');
    console.log(`   - Primera División: ${leaguesByDivision.primera.length} ligas`);
    console.log(`   - Segunda División: ${leaguesByDivision.segunda.length} ligas`);
    console.log(`   - Premier League: ${leaguesByDivision.premier.length} ligas\n`);

    let totalEvaluated = 0;
    let totalCorrected = 0;
    let totalConfirmed = 0;
    let totalPending = 0;
    const allErrors: string[] = [];
    const allCorrections: any[] = [];

    console.log('━'.repeat(70));
    console.log('Reevaluando apuestas de jornada actual...');
    console.log('━'.repeat(70));

    for (const league of leagues) {
      try {
        console.log(`\n🏆 Evaluando liga: ${league.name} (${league.division})`);
        console.log(`   ID: ${league.id}`);
        console.log(`   Jornada actual: ${league.currentJornada}`);
        console.log(`   Miembros: ${league._count.members}`);

        // Reevaluar TODAS las apuestas de la jornada actual
        const result = await reevaluateCurrentJornadaBets(league.id);

        totalEvaluated += result.evaluated;
        totalCorrected += result.corrected;
        totalConfirmed += result.confirmed;
        totalPending += result.stillPending;
        allErrors.push(...result.errors);

        // Guardar detalles de correcciones
        const corrections = result.details.filter(d => d.corrected);
        if (corrections.length > 0) {
          allCorrections.push({
            leagueName: league.name,
            division: league.division,
            jornada: league.currentJornada,
            corrections
          });
        }

        console.log(`   📊 Resumen:`);
        console.log(`      Total evaluadas: ${result.evaluated}`);
        console.log(`      🔧 Corregidas: ${result.corrected}`);
        console.log(`      ✅ Confirmadas: ${result.confirmed}`);
        console.log(`      ⏳ Aún pendientes: ${result.stillPending}`);
        if (result.errors.length > 0) {
          console.log(`      ⚠️  Errores: ${result.errors.length}`);
        }

        // Pequeño delay entre ligas
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`   💥 Error evaluando liga ${league.id}:`, error.message);
        allErrors.push(`Error en liga ${league.name}: ${error.message}`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN FINAL DE REEVALUACIÓN');
    console.log('═'.repeat(70));
    console.log(`Total de ligas procesadas: ${leagues.length}`);
    console.log(`   📊 Total evaluadas: ${totalEvaluated}`);
    console.log(`   🔧 Corregidas: ${totalCorrected}`);
    console.log(`   ✅ Confirmadas correctas: ${totalConfirmed}`);
    console.log(`   ⏳ Aún pendientes: ${totalPending}`);
    if (allErrors.length > 0) {
      console.log(`   💥 Errores: ${allErrors.length}`);
    }
    console.log('═'.repeat(70));

    // Mostrar detalles de correcciones
    if (allCorrections.length > 0) {
      console.log('\n' + '━'.repeat(70));
      console.log('🔧 DETALLES DE CORRECCIONES');
      console.log('━'.repeat(70));
      allCorrections.forEach(league => {
        console.log(`\n🏆 ${league.leagueName} (${league.division}) - Jornada ${league.jornada}:`);
        league.corrections.forEach((corr: any, idx: number) => {
          console.log(`   ${idx + 1}. Apuesta ${corr.betId}:`);
          console.log(`      Estado anterior: ${corr.oldStatus}`);
          console.log(`      Estado corregido: ${corr.newStatus}`);
          console.log(`      Razón: ${corr.reason}`);
        });
      });
      console.log('━'.repeat(70));
    }

    // Mostrar errores si los hay
    if (allErrors.length > 0) {
      console.log('\n' + '━'.repeat(70));
      console.log('⚠️  DETALLES DE ERRORES');
      console.log('━'.repeat(70));
      allErrors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
      console.log('━'.repeat(70));
    }

    console.log('');

  } catch (error) {
    console.error('\n❌ Error fatal en la reevaluación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
reevaluateAllBets()
  .then(() => {
    console.log('\n✨ Script finalizado exitosamente\n');
  })
  .catch((error) => {
    console.error('\n💥 Error al ejecutar el script:', error);
  });
