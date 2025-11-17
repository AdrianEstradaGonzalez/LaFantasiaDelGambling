#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOffers() {
  try {
    console.log('🔍 Verificando ofertas en la base de datos...\n');
    
    // Contar ofertas totales
    const totalCount = await (prisma as any).dailyOffer.count();
    console.log(`📊 Total de ofertas: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('⚠️  No hay ofertas en la base de datos');
      return;
    }
    
    // Contar por división
    const primeraCount = await (prisma as any).dailyOffer.count({ where: { division: 'primera' } });
    const segundaCount = await (prisma as any).dailyOffer.count({ where: { division: 'segunda' } });
    const premierCount = await (prisma as any).dailyOffer.count({ where: { division: 'premier' } });
    
    console.log(`\n📈 Ofertas por división:`);
    console.log(`   Primera: ${primeraCount}`);
    console.log(`   Segunda: ${segundaCount}`);
    console.log(`   Premier: ${premierCount}`);
    
    // Mostrar algunas ofertas de ejemplo de Primera
    console.log(`\n🎁 Ejemplos de ofertas de Primera:`);
    const primeraOffers = await (prisma as any).dailyOffer.findMany({
      where: { division: 'primera' },
      take: 5
    });
    
    primeraOffers.forEach((offer: any) => {
      console.log(`   ${offer.playerName}: ${offer.originalPrice}M → ${offer.offerPrice}M (-${offer.discount}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOffers();
