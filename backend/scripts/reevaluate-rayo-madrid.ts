/**
 * Script para reevaluar las apuestas del partido Rayo Vallecano - Real Madrid (0-0)
 * que fueron evaluadas incorrectamente
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reevaluateBets() {
  console.log('🔄 Reevaluando apuestas del Rayo - Real Madrid (0-0)\n');

  // Buscar el match
  const matches = await prisma.bet_option.findMany({
    where: {
      OR: [
        { homeTeam: { contains: 'Rayo' }, awayTeam: { contains: 'Real Madrid' } },
        { homeTeam: { contains: 'Real Madrid' }, awayTeam: { contains: 'Rayo' } }
      ],
      betType: { contains: 'Ambos' }
    },
    distinct: ['matchId'],
    select: {
      matchId: true,
      homeTeam: true,
      awayTeam: true
    }
  });

  if (matches.length === 0) {
    console.log('❌ No se encontró el partido');
    return;
  }

  const match = matches[0];
  console.log(`⚽ Partido: ${match.homeTeam} vs ${match.awayTeam} (ID: ${match.matchId})`);
  console.log(`📊 Resultado: 0-0 (ningún equipo marcó)\n`);

  // Buscar las apuestas realizadas
  const userBets = await prisma.bet.findMany({
    where: {
      matchId: match.matchId,
      betType: { contains: 'Ambos' }
    },
    include: {
      leagueMember: {
        include: {
          user: {
            select: { name: true }
          }
        }
      }
    }
  });

  console.log(`💰 Encontradas ${userBets.length} apuestas para reevaluar\n`);

  let corrected = 0;
  let alreadyCorrect = 0;

  for (const bet of userBets) {
    const userName = bet.leagueMember?.user?.name || 'Usuario';
    const labelLower = bet.betLabel.toLowerCase().trim();
    
    // Determinar predicción
    const isNoPrediction = labelLower === 'no' || 
                          labelLower.includes('no ') || 
                          labelLower.includes('al menos un equipo no');
    
    const prediction = !isNoPrediction; // true = SÍ ambos marcan, false = NO ambos marcan
    
    // En un 0-0, ambos NO marcaron
    const bothScored = false;
    
    // Evaluación correcta
    const shouldBeWon = bothScored === prediction;
    const correctStatus = shouldBeWon ? 'won' : 'lost';
    
    console.log(`   👤 ${userName}: "${bet.betLabel}"`);
    console.log(`      - Predicción: ${prediction ? 'SÍ ambos marcan' : 'NO ambos marcan'}`);
    console.log(`      - Estado actual: ${bet.status}`);
    console.log(`      - Estado correcto: ${correctStatus}`);
    
    if (bet.status !== correctStatus) {
      // Actualizar la apuesta
      await prisma.bet.update({
        where: { id: bet.id },
        data: {
          status: correctStatus,
          evaluatedAt: new Date()
        }
      });
      
      console.log(`      ✅ CORREGIDA: ${bet.status} → ${correctStatus}`);
      corrected++;
    } else {
      console.log(`      ✓ Ya correcta`);
      alreadyCorrect++;
    }
    
    console.log('');
  }

  console.log(`\n📊 RESUMEN:`);
  console.log(`   - Total apuestas: ${userBets.length}`);
  console.log(`   - Corregidas: ${corrected}`);
  console.log(`   - Ya correctas: ${alreadyCorrect}`);

  await prisma.$disconnect();
}

reevaluateBets().catch(console.error);
