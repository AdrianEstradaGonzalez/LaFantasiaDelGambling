import { PointsCalculationService } from '../src/services/pointsCalculation.service.js';

/**
 * SCRIPT: Calcular puntos en tiempo real para TODAS las ligas
 * 
 * Este script ejecuta el servicio PointsCalculationService que:
 * 1. Obtiene todas las ligas con jornada cerrada (partidos en curso)
 * 2. Para cada liga, obtiene todas las plantillas
 * 3. Recopila TODOS los jugadores únicos (sin duplicados)
 * 4. Calcula los puntos de cada jugador UNA SOLA VEZ desde la API
 * 5. Los datos quedan guardados en player_stats para que el frontend los lea
 * 
 * USO:
 * npm run calculate-points
 * o
 * tsx backend/scripts/calculate-all-points.ts
 */

async function main() {
  try {
    const result = await PointsCalculationService.calculateAllPoints();
    
    console.log('\n✨ Script finalizado correctamente');
    console.log(`📊 Resultado: ${result.totalCalculated} jugadores calculados en ${result.leaguesProcessed} ligas`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Script falló:', error);
    process.exit(1);
  }
}

main();
