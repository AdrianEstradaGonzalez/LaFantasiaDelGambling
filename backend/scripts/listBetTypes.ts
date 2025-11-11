import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listBetTypes() {
  const bets = await prisma.bet_option.findMany({
    select: { betType: true, betLabel: true }
  });
  
  const types = new Set(bets.map(b => b.betType));
  const labels = new Set(bets.map(b => b.betLabel));
  
  console.log('\n📋 TIPOS DE APUESTA (únicos):');
  console.log('==========================================');
  Array.from(types).sort().forEach(t => console.log(`  - ${t}`));
  
  console.log('\n\n🏷️  ETIQUETAS DE APUESTA (únicos):');
  console.log('==========================================');
  Array.from(labels).sort().forEach(l => console.log(`  - ${l}`));
  
  await prisma.$disconnect();
}

listBetTypes();
