import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBet() {
  const bet = await prisma.bet.findFirst({
    where: {
      betType: { contains: 'Portería a Cero' },
      matchId: 1390935
    }
  });
  
  console.log(JSON.stringify(bet, null, 2));
  
  // Buscar otras apuestas del mismo partido
  const otherBets = await prisma.bet.findMany({
    where: {
      matchId: 1390935,
      status: { not: 'pending' }
    },
    take: 10
  });
  
  console.log('\n\nOtras apuestas del mismo partido:');
  otherBets.forEach(b => {
    console.log(`${b.betType} - ${b.betLabel}: ${b.status} (${b.apiValue})`);
  });
  
  await prisma.$disconnect();
}

checkBet();
