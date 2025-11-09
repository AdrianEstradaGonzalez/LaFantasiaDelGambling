/**
 * Script para verificar TODAS las apuestas de "Ambos marcan" 
 * y detectar posibles errores de evaluación
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllBets() {
  console.log('🔍 Verificando TODAS las apuestas de "Ambos marcan"\n');

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

  console.log(`📊 Encontradas ${bets.length} apuestas evaluadas de "Ambos marcan"\n`);

  // Agrupar por partido
  const byMatch = new Map<number, any[]>();
  for (const bet of bets) {
    if (!byMatch.has(bet.matchId)) {
      byMatch.set(bet.matchId, []);
    }
    byMatch.get(bet.matchId)!.push(bet);
  }

  console.log(`⚽ Total de partidos: ${byMatch.size}\n`);

  let suspiciousMatches = 0;
  let totalSuspicious = 0;

  // Analizar cada partido
  for (const [matchId, matchBets] of byMatch) {
    const firstBet = matchBets[0];
    const apiResult = firstBet.apiValue || '';
    
    // Extraer resultado del partido del apiValue
    const goalsMatch = apiResult.match(/(\d+)-(\d+)/);
    let homeGoals = 0;
    let awayGoals = 0;
    
    if (goalsMatch) {
      homeGoals = parseInt(goalsMatch[1]);
      awayGoals = parseInt(goalsMatch[2]);
    }

    const bothScored = homeGoals > 0 && awayGoals > 0;
    
    // Revisar cada apuesta de este partido
    const suspicious: any[] = [];
    
    for (const bet of matchBets) {
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
        suspicious.push({
          bet,
          prediction: prediction ? 'SÍ ambos marcan' : 'NO ambos marcan',
          currentStatus: bet.status,
          correctStatus,
          bothScored
        });
      }
    }

    if (suspicious.length > 0) {
      suspiciousMatches++;
      totalSuspicious += suspicious.length;
      
      console.log(`⚠️  PARTIDO SOSPECHOSO: ${firstBet.homeTeam} vs ${firstBet.awayTeam}`);
      console.log(`   Match ID: ${matchId}`);
      console.log(`   Resultado: ${homeGoals}-${awayGoals} (${bothScored ? 'Ambos marcaron' : 'No ambos marcaron'})`);
      console.log(`   API Value: ${apiResult}`);
      console.log(`   Apuestas con error: ${suspicious.length}/${matchBets.length}`);
      console.log('');
      
      suspicious.forEach(s => {
        const userName = s.bet.leagueMember?.user?.name || 'Usuario';
        console.log(`      👤 ${userName}: "${s.bet.betLabel}"`);
        console.log(`         - Predicción: ${s.prediction}`);
        console.log(`         - Estado actual: ${s.currentStatus} ❌`);
        console.log(`         - Debería ser: ${s.correctStatus} ✅`);
        console.log(`         - Bet ID: ${s.bet.id}`);
        console.log('');
      });
    }
  }

  console.log(`\n📊 RESUMEN GENERAL:`);
  console.log(`   - Total partidos analizados: ${byMatch.size}`);
  console.log(`   - Partidos con errores: ${suspiciousMatches}`);
  console.log(`   - Total apuestas con error: ${totalSuspicious}`);
  console.log(`   - Total apuestas correctas: ${bets.length - totalSuspicious}`);

  if (totalSuspicious > 0) {
    console.log(`\n⚠️  Se encontraron ${totalSuspicious} apuestas mal evaluadas que necesitan corrección`);
  } else {
    console.log(`\n✅ Todas las apuestas están correctamente evaluadas`);
  }

  await prisma.$disconnect();
}

checkAllBets().catch(console.error);
