import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MATCH_IDS = [1390919, 1390920, 1390921, 1390926, 1390934];

async function findMatchResults() {
  for (const matchId of MATCH_IDS) {
    console.log(`\n📍 Partido ${matchId}:`);
    
    // Buscar cualquier apuesta que tenga el resultado
    const bets = await prisma.bet.findMany({
      where: {
        matchId: matchId,
        status: { not: 'pending' },
        apiValue: { not: null }
      },
      take: 20
    });

    console.log(`   Buscando en ${bets.length} apuestas...`);
    
    for (const bet of bets) {
      if (bet.apiValue && typeof bet.apiValue === 'string') {
        // Buscar patrón "X-Y"
        const scoreMatch = bet.apiValue.match(/(\d+)-(\d+)/);
        if (scoreMatch) {
          console.log(`   ✅ ${bet.homeTeam} ${scoreMatch[1]}-${scoreMatch[2]} ${bet.awayTeam}`);
          console.log(`      (Fuente: ${bet.betType})`);
          break;
        }
      }
    }
  }
  
  await prisma.$disconnect();
}

findMatchResults();
