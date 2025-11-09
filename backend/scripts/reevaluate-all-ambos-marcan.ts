/**
 * Script para reevaluar TODAS las apuestas de "Ambos marcan" 
 * que fueron mal evaluadas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reevaluateAllBets() {
  console.log('🔄 Reevaluando TODAS las apuestas de "Ambos marcan" mal evaluadas\n');

  // Buscar todas las apuestas de tipo "Ambos marcan" que ya fueron evaluadas
  const bets = await prisma.bet.findMany({
    where: {
      betType: { contains: 'Ambos' },
      status: { not: 'pending' }
    },
    include: {
      leagueMember: {
        include: {
          user: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: [
      { matchId: 'asc' },
      { betLabel: 'asc' }
    ]
  });

  console.log(`📊 Analizando ${bets.length} apuestas evaluadas\n`);

  let corrected = 0;
  let alreadyCorrect = 0;
  const byMatch = new Map<number, { teams: string; count: number }>();

  for (const bet of bets) {
    const apiResult = bet.apiValue || '';
    
    // Extraer resultado del partido del apiValue
    const goalsMatch = apiResult.match(/(\d+)-(\d+)/);
    let homeGoals = 0;
    let awayGoals = 0;
    
    if (goalsMatch) {
      homeGoals = parseInt(goalsMatch[1]);
      awayGoals = parseInt(goalsMatch[2]);
    }

    const bothScored = homeGoals > 0 && awayGoals > 0;
    const labelLower = bet.betLabel.toLowerCase().trim();
    
    // Determinar predicción correcta
    const isNoPrediction = labelLower === 'no' || 
                          labelLower.includes('no ') || 
                          labelLower.includes('al menos un equipo no');
    
    const prediction = !isNoPrediction;
    
    // Evaluación correcta
    const shouldBeWon = bothScored === prediction;
    const correctStatus = shouldBeWon ? 'won' : 'lost';
    
    if (bet.status !== correctStatus) {
      const userName = bet.leagueMember?.user?.name || 'Usuario';
      
      // Actualizar la apuesta
      await prisma.bet.update({
        where: { id: bet.id },
        data: {
          status: correctStatus,
          evaluatedAt: new Date()
        }
      });
      
      console.log(`✅ CORREGIDA: ${userName} - "${bet.betLabel}"`);
      console.log(`   Partido: ${bet.homeTeam} vs ${bet.awayTeam} (${homeGoals}-${awayGoals})`);
      console.log(`   Predicción: ${prediction ? 'SÍ' : 'NO'} ambos marcan`);
      console.log(`   ${bet.status} → ${correctStatus}`);
      console.log('');
      
      corrected++;
      
      // Contador por partido
      const key = bet.matchId;
      if (!byMatch.has(key)) {
        byMatch.set(key, { 
          teams: `${bet.homeTeam} vs ${bet.awayTeam} (${homeGoals}-${awayGoals})`,
          count: 0 
        });
      }
      byMatch.get(key)!.count++;
    } else {
      alreadyCorrect++;
    }
  }

  console.log(`\n📊 RESUMEN FINAL:`);
  console.log(`   - Total apuestas analizadas: ${bets.length}`);
  console.log(`   - Apuestas corregidas: ${corrected}`);
  console.log(`   - Apuestas ya correctas: ${alreadyCorrect}`);
  
  if (byMatch.size > 0) {
    console.log(`\n   Partidos afectados: ${byMatch.size}`);
    byMatch.forEach((data, matchId) => {
      console.log(`      • ${data.teams}: ${data.count} apuestas corregidas`);
    });
  }

  await prisma.$disconnect();
}

reevaluateAllBets().catch(console.error);
