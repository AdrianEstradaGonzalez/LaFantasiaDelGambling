/**
 * SCRIPT DE PRUEBA: Evaluación de Apuestas
 * 
 * Ejecutar con: npx tsx scripts/test-bet-evaluation.ts
 */

import { BetEvaluationService } from '../src/services/betEvaluation.service.js';

async function testBetEvaluation() {
  console.log('🧪 Iniciando prueba de evaluación de apuestas...\n');

  // Usar el leagueId de la apuesta en tu base de datos
  const leagueId = 'cmgpsvev80002gyzr57vqgota';

  try {
    const result = await BetEvaluationService.evaluatePendingBets(leagueId);
    
    console.log('\n📊 RESULTADO DE LA EVALUACIÓN:');
    console.log('================================');
    console.log(`Total evaluadas: ${result.evaluated}`);
    console.log(`Ganadas: ${result.won}`);
    console.log(`Perdidas: ${result.lost}`);
    console.log(`Errores: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️ ERRORES ENCONTRADOS:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✅ Prueba completada');
  } catch (error: any) {
    console.error('\n❌ Error durante la prueba:', error.message);
    console.error(error.stack);
  }
}

testBetEvaluation();
