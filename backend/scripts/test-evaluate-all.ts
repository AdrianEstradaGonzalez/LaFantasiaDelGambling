/**
 * SCRIPT: Test de evaluación de TODAS las apuestas de TODAS las ligas
 * 
 * Ejecutar con: npx tsx scripts/test-evaluate-all.ts
 */

import { BetEvaluationService } from '../src/services/betEvaluation.service.js';

async function main() {
  console.log('🌍 TEST: Evaluando TODAS las apuestas de TODAS las ligas\n');
  console.log('='.repeat(70));
  
  try {
    const result = await BetEvaluationService.evaluateAllPendingBets();
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 TEST COMPLETADO');
    console.log('='.repeat(70));
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total evaluadas: ${result.totalEvaluated}`);
    console.log(`   Total ganadas: ${result.totalWon}`);
    console.log(`   Total perdidas: ${result.totalLost}`);
    console.log(`   Total errores: ${result.totalErrors}`);
    console.log(`   Ligas procesadas: ${result.leagues.length}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  ERRORES ENCONTRADOS:`);
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
  } catch (error: any) {
    console.error('\n❌ ERROR en el test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
