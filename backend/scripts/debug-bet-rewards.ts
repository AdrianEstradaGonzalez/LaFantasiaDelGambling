import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugBetRewards() {
  const ligaId = 'cmh51d4wc002m32y4sd3i7d1u';
  const userId = 'cm4l9d45r0000q2isdqzobdhs'; // rubenrc233
  const jornada = 15;

  console.log(`\n🔍 Analizando apuestas de rubenrc233 en Jornada ${jornada}\n`);

  // Apuestas individuales
  const userBets = await prisma.bet.findMany({
    where: {
      leagueId: ligaId,
      userId: userId,
      jornada: jornada
    }
  });

  console.log(`📊 Apuestas individuales: ${userBets.length}\n`);

  let totalFromBets = 0;
  let wonCount = 0;

  for (const bet of userBets) {
    console.log(`  ${bet.status === 'won' ? '✅' : bet.status === 'lost' ? '❌' : '⏳'} ${bet.betType}: ${bet.betLabel}`);
    console.log(`     ID: ${bet.id}`);
    console.log(`     Status: ${bet.status}`);
    console.log(`     Amount: ${bet.amount}M`);
    console.log(`     Odd: ${bet.odd}`);
    console.log(`     PotentialWin: ${bet.potentialWin}M`);
    
    if (bet.status === 'won') {
      totalFromBets += bet.potentialWin;
      wonCount++;
      console.log(`     ✅ Suma: +${bet.potentialWin}M`);
    }
    console.log('');
  }

  console.log(`\n💰 Total de apuestas individuales ganadas: ${totalFromBets}M (${wonCount} apuestas)\n`);

  // Combis
  const userCombis = await (prisma as any).betCombi.findMany({
    where: {
      leagueId: ligaId,
      userId: userId,
      jornada: jornada,
      status: { in: ['won', 'lost', 'pending'] }
    }
  });

  console.log(`🎰 Combis: ${userCombis.length}\n`);

  let totalFromCombis = 0;
  let wonCombisCount = 0;

  for (const combi of userCombis) {
    console.log(`  ${combi.status === 'won' ? '✅' : combi.status === 'lost' ? '❌' : '⏳'} Combi ${combi.id}`);
    console.log(`     Status: ${combi.status}`);
    console.log(`     Amount: ${combi.amount}M`);
    console.log(`     TotalOdd: ${combi.totalOdd}`);
    console.log(`     PotentialWin: ${combi.potentialWin}M`);
    
    if (combi.status === 'won') {
      totalFromCombis += combi.potentialWin;
      wonCombisCount++;
      console.log(`     ✅ Suma: +${combi.potentialWin}M`);
    }
    console.log('');
  }

  console.log(`\n💰 Total de combis ganadas: ${totalFromCombis}M (${wonCombisCount} combis)\n`);

  const grandTotal = totalFromBets + totalFromCombis;
  console.log(`\n🎯 TOTAL RECOMPENSA: ${grandTotal}M\n`);
  console.log(`   - Apuestas individuales: ${totalFromBets}M`);
  console.log(`   - Combis: ${totalFromCombis}M`);
  console.log(`   - Total apuestas ganadas: ${wonCount + wonCombisCount}\n`);

  await prisma.$disconnect();
}

debugBetRewards();
