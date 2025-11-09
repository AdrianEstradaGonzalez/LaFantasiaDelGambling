/**
 * Script para verificar las apuestas del partido Rayo Vallecano - Real Madrid
 * que finalizó 0-0
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBets() {
  console.log('🔍 Verificando apuestas del Rayo - Real Madrid (0-0)\n');

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
  console.log(`⚽ Partido encontrado: ${match.homeTeam} vs ${match.awayTeam} (ID: ${match.matchId})\n`);

  // Buscar las opciones de apuesta
  const betOptions = await prisma.bet_option.findMany({
    where: {
      matchId: match.matchId,
      betType: { contains: 'Ambos' }
    },
    select: {
      id: true,
      betType: true,
      betLabel: true,
      odd: true
    }
  });

  console.log(`📋 Opciones de apuesta generadas:`);
  betOptions.forEach((opt: any) => {
    console.log(`   - ID: ${opt.id}`);
    console.log(`     Tipo: ${opt.betType}`);
    console.log(`     Label: ${opt.betLabel}`);
    console.log(`     Cuota: ${opt.odd}`);
    console.log('');
  });

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
            select: { name: true, email: true }
          }
        }
      }
    }
  });

  console.log(`\n💰 Apuestas de usuarios (${userBets.length} total):`);
  userBets.forEach(bet => {
    const userName = bet.leagueMember?.user?.name || 'Usuario';
    console.log(`\n   👤 ${userName}:`);
    console.log(`      - Bet ID: ${bet.id}`);
    console.log(`      - Tipo: ${bet.betType}`);
    console.log(`      - Label: ${bet.betLabel}`);
    console.log(`      - Cantidad: €${bet.amount}`);
    console.log(`      - Cuota: ${bet.odd}`);
    console.log(`      - Estado: ${bet.status}`);
    console.log(`      - Resultado API: ${bet.apiValue || 'N/A'}`);
    console.log(`      - Evaluada: ${bet.evaluatedAt ? bet.evaluatedAt.toISOString() : 'No'}`);
  });

  // Análisis de la evaluación
  console.log('\n\n📊 ANÁLISIS DE EVALUACIÓN:');
  console.log('   Resultado del partido: 0-0 (ningún equipo marcó)');
  console.log('   ');
  console.log('   Evaluación correcta:');
  console.log('   ✅ "Ambos equipos marcarán" → PERDIDA (ninguno marcó)');
  console.log('   ✅ "Al menos un equipo no marcará" → GANADA (ambos no marcaron)');
  console.log('   ');
  
  const wrongBets = userBets.filter(bet => {
    const isYesPrediction = bet.betLabel.includes('Ambos equipos marcarán');
    const isNoPrediction = bet.betLabel.includes('Al menos un equipo no marcará');
    
    // En un 0-0, "Sí ambos marcan" debe perder, "No ambos marcan" debe ganar
    if (isYesPrediction && bet.status !== 'lost') return true;
    if (isNoPrediction && bet.status !== 'won') return true;
    return false;
  });

  if (wrongBets.length > 0) {
    console.log(`   ❌ ${wrongBets.length} apuestas evaluadas INCORRECTAMENTE:`);
    wrongBets.forEach(bet => {
      const userName = bet.leagueMember?.user?.name || 'Usuario';
      console.log(`      - ${userName}: "${bet.betLabel}" → ${bet.status} (debería ser ${bet.betLabel.includes('Ambos equipos marcarán') ? 'lost' : 'won'})`);
    });
  } else {
    console.log('   ✅ Todas las apuestas están correctamente evaluadas');
  }

  await prisma.$disconnect();
}

checkBets().catch(console.error);
