import { BetEvaluationService } from '../services/betEvaluation.service.js';

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🎲 SCRIPT: Evaluación de apuestas pendientes (todas las ligas)');
  console.log('═'.repeat(70));

  try {
    const result = await BetEvaluationService.evaluateAllPendingBets();

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(70));
    console.log(`✅ Evaluadas: ${result.totalEvaluated}`);
    console.log(`🎉 Ganadas:   ${result.totalWon}`);
    console.log(`💔 Perdidas:  ${result.totalLost}`);
    if (result.totalErrors > 0) {
      console.log(`⚠️  Errores:   ${result.totalErrors}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en la evaluación global de apuestas:', err);
    process.exit(1);
  }
}

main();
