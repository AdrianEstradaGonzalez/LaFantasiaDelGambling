/**
 * SCRIPT: Resetear apuesta específica a pending
 * 
 * Ejecutar con: npx tsx scripts/reset-bet.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetBet() {
  // ID de la apuesta que quieres resetear
  const betId = 'cmgza76do00014niwyla1oh9p';

  try {
    console.log(`🔄 Reseteando apuesta ${betId}...`);

    const updated = await prisma.bet.update({
      where: { id: betId },
      data: {
        status: 'pending',
        evaluatedAt: null,
        apiValue: null
      }
    });

    console.log('✅ Apuesta reseteada:');
    console.log(`   ID: ${updated.id}`);
    console.log(`   Estado: ${updated.status}`);
    console.log(`   Tipo: ${updated.betType}`);
    console.log(`   Label: ${updated.betLabel}`);
    console.log(`   Match: ${updated.matchId}`);
    console.log('\n🎯 Ahora puedes volver a evaluarla con la lógica corregida');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetBet();
