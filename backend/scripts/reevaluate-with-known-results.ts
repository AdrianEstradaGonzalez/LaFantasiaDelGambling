import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Resultados conocidos de los partidos (extraídos de otras apuestas o fuentes)
const MATCH_RESULTS: Record<number, { homeTeam: string, awayTeam: string, homeGoals: number, awayGoals: number }> = {
  1390919: { homeTeam: 'Alaves', awayTeam: 'Espanyol', homeGoals: 1, awayGoals: 0 },
  1390920: { homeTeam: 'Atletico Madrid', awayTeam: 'Sevilla', homeGoals: 4, awayGoals: 3 },
  1390921: { homeTeam: 'Barcelona', awayTeam: 'Elche', homeGoals: 3, awayGoals: 1 },
  1390926: { homeTeam: 'Real Sociedad', awayTeam: 'Athletic Club', homeGoals: 1, awayGoals: 0 },
  1390934: { homeTeam: 'Girona', awayTeam: 'Alaves', homeGoals: 0, awayGoals: 0 }
};

async function reevaluateCleanSheetWithResults() {
  try {
    console.log('🔄 Re-evaluando apuestas de Portería a Cero con resultados conocidos...\n');

    let totalUpdated = 0;

    for (const [matchId, result] of Object.entries(MATCH_RESULTS)) {
      const matchIdNum = parseInt(matchId);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📍 Partido ${matchIdNum}: ${result.homeTeam} ${result.homeGoals}-${result.awayGoals} ${result.awayTeam}`);
      console.log('='.repeat(60));

      // Obtener todas las apuestas de Portería a Cero de este partido
      const bets = await prisma.bet.findMany({
        where: {
          matchId: matchIdNum,
          betType: {
            contains: 'Portería a Cero'
          }
        }
      });

      console.log(`📊 Encontradas ${bets.length} apuestas de Portería a Cero`);

      // Evaluar cada apuesta
      for (const bet of bets) {
        const isLocal = bet.betType.toLowerCase().includes('local');
        const isVisitante = bet.betType.toLowerCase().includes('visitante');
        const labelLower = bet.betLabel.toLowerCase();
        const isSi = labelLower === 'sí' || labelLower === 'si';
        
        let won = false;
        let actualResult = '';
        
        if (isLocal) {
          // Portería a Cero - Local
          // Sí = el local no encajó goles (awayGoals === 0)
          // No = el local encajó goles (awayGoals > 0)
          const cleanSheet = result.awayGoals === 0;
          won = isSi ? cleanSheet : !cleanSheet;
          actualResult = `${result.homeTeam} encajó ${result.awayGoals} goles`;
        } else if (isVisitante) {
          // Portería a Cero - Visitante
          // Sí = el visitante no encajó goles (homeGoals === 0)
          // No = el visitante encajó goles (homeGoals > 0)
          const cleanSheet = result.homeGoals === 0;
          won = isSi ? cleanSheet : !cleanSheet;
          actualResult = `${result.awayTeam} encajó ${result.homeGoals} goles`;
        }

        const newStatus = won ? 'won' : 'lost';

        // Actualizar la apuesta
        await prisma.bet.update({
          where: { id: bet.id },
          data: {
            status: newStatus,
            apiValue: actualResult,
            evaluatedAt: new Date()
          }
        });

        console.log(`   ✅ ${bet.betType} - ${bet.betLabel}: ${bet.status} → ${newStatus}`);
        totalUpdated++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ PROCESO COMPLETADO');
    console.log(`📊 Total de apuestas actualizadas: ${totalUpdated}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
reevaluateCleanSheetWithResults();
