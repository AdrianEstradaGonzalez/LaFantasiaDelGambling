import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBets() {
  try {
    // F.C.Estrada userId
    const fcEstradaId = 'cmh529xq200ff32y4dv8y7ism';
    const santaxId = 'cmh52nn5n00hw32y4aqwj7i2t'; // ElSantax real
    const cboLeagueId = 'cmhe4097k00518kc4tsms6h5g';

    console.log('🔍 VERIFICANDO APUESTAS F.C.ESTRADA EN CBO (J12)\n');
    const fcBets = await prisma.bet.findMany({
      where: {
        userId: fcEstradaId,
        leagueId: cboLeagueId,
        jornada: 12
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Total apuestas FC Estrada: ${fcBets.length}\n`);
    let fcBalance = 0;
    fcBets.forEach((bet, i) => {
      let result = 0;
      if (bet.status === 'won') {
        result = bet.potentialWin; // Ganancia COMPLETA
      } else if (bet.status === 'lost') {
        result = -bet.amount;
      }
      fcBalance += result;
      console.log(
        `${i+1}. ${bet.betLabel}\n` +
        `   Apostó: ${bet.amount}M | Ganancia potencial: ${bet.potentialWin}M\n` +
        `   Estado: ${bet.status} | Resultado: ${result >= 0 ? '+' : ''}${result}M\n`
      );
    });
    console.log(`💰 BALANCE TOTAL FC ESTRADA: ${fcBalance >= 0 ? '+' : ''}${fcBalance}M\n`);

    console.log('\n🔍 VERIFICANDO APUESTAS ELSANTAX EN CBO (J12)\n');
    const santaxBets = await prisma.bet.findMany({
      where: {
        userId: santaxId,
        leagueId: cboLeagueId,
        jornada: 12
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Total apuestas ElSantax: ${santaxBets.length}\n`);
    let santaxBalance = 0;
    santaxBets.forEach((bet, i) => {
      let result = 0;
      if (bet.status === 'won') {
        result = bet.potentialWin; // Ganancia COMPLETA
      } else if (bet.status === 'lost') {
        result = -bet.amount;
      }
      santaxBalance += result;
      console.log(
        `${i+1}. ${bet.betLabel}\n` +
        `   Apostó: ${bet.amount}M | Ganancia potencial: ${bet.potentialWin}M\n` +
        `   Estado: ${bet.status} | Resultado: ${result >= 0 ? '+' : ''}${result}M\n`
      );
    });
    console.log(`💰 BALANCE TOTAL ELSANTAX: ${santaxBalance >= 0 ? '+' : ''}${santaxBalance}M\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBets();
