/**
 * Script para reevaluar todas las apuestas de la jornada actual de todas las ligas
 * Útil para corregir errores de evaluación después de actualizar la lógica
 */

import { PrismaClient } from '@prisma/client';
import { BetEvaluationService } from '../src/services/betEvaluation.service.js';

const prisma = new PrismaClient();

async function reevaluateCurrentJornada() {
  console.log('🔄 Iniciando reevaluación de apuestas de la jornada actual...\n');

  try {
    // Obtener todas las ligas
    const leagues = await prisma.league.findMany({
      select: {
        id: true,
        name: true,
        currentJornada: true,
        division: true
      }
    });

    console.log(`📊 Encontradas ${leagues.length} ligas\n`);

    let totalEvaluated = 0;
    let totalWon = 0;
    let totalLost = 0;
    const errors: string[] = [];

    for (const league of leagues) {
      console.log(`${'='.repeat(60)}`);
      console.log(`🏆 Liga: ${league.name} (${league.division})`);
      console.log(`📅 Jornada actual: ${league.currentJornada}`);
      console.log(`${'='.repeat(60)}\n`);

      // Obtener todas las apuestas de esta jornada (pendientes, ganadas y perdidas)
      const bets = await prisma.bet.findMany({
        where: {
          leagueId: league.id,
          jornada: league.currentJornada
        }
      });

      console.log(`📊 Apuestas encontradas: ${bets.length}`);
      
      if (bets.length === 0) {
        console.log(`⚠️  No hay apuestas para evaluar en esta liga\n`);
        continue;
      }

      // Mostrar resumen antes de reevaluar
      const statusBefore = {
        pending: bets.filter(b => b.status === 'pending').length,
        won: bets.filter(b => b.status === 'won').length,
        lost: bets.filter(b => b.status === 'lost').length
      };
      console.log(`   Estado anterior: ${statusBefore.pending} pendientes, ${statusBefore.won} ganadas, ${statusBefore.lost} perdidas\n`);

      // Cambiar todas las apuestas evaluadas a 'pending' para reevaluarlas
      const updated = await prisma.bet.updateMany({
        where: {
          leagueId: league.id,
          jornada: league.currentJornada,
          status: {
            in: ['won', 'lost']
          }
        },
        data: {
          status: 'pending',
          evaluatedAt: null,
          apiValue: null
        }
      });

      console.log(`   ✅ ${updated.count} apuestas marcadas como pendientes para reevaluación\n`);

      // Evaluar todas las apuestas pendientes de esta liga
      try {
        // Usar la función de evaluación de apuestas pendientes
        const result = await (BetEvaluationService as any).evaluatePendingBets(league.id);
        
        totalEvaluated += result.evaluated;
        totalWon += result.won;
        totalLost += result.lost;
        
        if (result.errors && result.errors.length > 0) {
          errors.push(...result.errors);
        }

        console.log(`\n   📊 Resultado de la reevaluación:`);
        console.log(`      - Evaluadas: ${result.evaluated}`);
        console.log(`      - Ganadas: ${result.won}`);
        console.log(`      - Perdidas: ${result.lost}`);
        
        if (result.errors && result.errors.length > 0) {
          console.log(`      - Errores: ${result.errors.length}`);
        }

        // Obtener estado después de reevaluar
        const betsAfter = await prisma.bet.findMany({
          where: {
            leagueId: league.id,
            jornada: league.currentJornada
          }
        });

        const statusAfter = {
          pending: betsAfter.filter(b => b.status === 'pending').length,
          won: betsAfter.filter(b => b.status === 'won').length,
          lost: betsAfter.filter(b => b.status === 'lost').length
        };

        console.log(`\n   📊 Estado después: ${statusAfter.pending} pendientes, ${statusAfter.won} ganadas, ${statusAfter.lost} perdidas`);
        
        // Mostrar cambios
        const changes = {
          won: statusAfter.won - statusBefore.won,
          lost: statusAfter.lost - statusBefore.lost
        };

        if (changes.won !== 0 || changes.lost !== 0) {
          console.log(`   🔄 Cambios:`);
          if (changes.won > 0) console.log(`      + ${changes.won} más ganadas`);
          if (changes.won < 0) console.log(`      - ${Math.abs(changes.won)} menos ganadas`);
          if (changes.lost > 0) console.log(`      + ${changes.lost} más perdidas`);
          if (changes.lost < 0) console.log(`      - ${Math.abs(changes.lost)} menos perdidas`);
        }

      } catch (error: any) {
        const errorMsg = `Error evaluando liga ${league.name}: ${error.message}`;
        console.error(`   ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }

      console.log(''); // Línea en blanco entre ligas
    }

    // Resumen final
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 RESUMEN FINAL');
    console.log(`${'='.repeat(60)}`);
    console.log(`Total de ligas procesadas: ${leagues.length}`);
    console.log(`Total de apuestas reevaluadas: ${totalEvaluated}`);
    console.log(`Total ganadas: ${totalWon}`);
    console.log(`Total perdidas: ${totalLost}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errores encontrados (${errors.length}):`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log(`\n✅ No se encontraron errores`);
    }

    console.log(`\n✅ Reevaluación completada exitosamente`);

  } catch (error) {
    console.error('❌ Error en el proceso de reevaluación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
reevaluateCurrentJornada()
  .then(() => {
    console.log('\n🎉 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
