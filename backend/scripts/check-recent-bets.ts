import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentBets() {
  try {
    console.log('🔍 Verificando las últimas 10 apuestas creadas...\n');

    const recentBets = await prisma.bet.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        betLabel: true,
        amount: true,
        odd: true,
        potentialWin: true,
        status: true,
        jornada: true,
        createdAt: true,
        user: {
          select: {
            username: true
          }
        }
      }
    });

    if (recentBets.length === 0) {
      console.log('❌ No se encontraron apuestas');
      return;
    }

    console.log(`📊 Últimas ${recentBets.length} apuestas:\n`);
    
    recentBets.forEach((bet, index) => {
      console.log(`${index + 1}. ${bet.homeTeam} vs ${bet.awayTeam}`);
      console.log(`   Usuario: ${bet.user.username}`);
      console.log(`   ${bet.betLabel}`);
      console.log(`   Estado: ${bet.status} | Jornada: ${bet.jornada} | Cuota: ${bet.odd}`);
      console.log(`   💰 Apostado: ${bet.amount}M | Ganancia potencial: ${bet.potentialWin}M`);
      console.log(`   📅 Creada: ${bet.createdAt.toLocaleString()}`);
      console.log('');
    });

    // Verificar si hay apuestas con amount = 50
    const betsWithFifty = recentBets.filter(b => b.amount === 50);
    const betsWithOne = recentBets.filter(b => b.amount === 1);

    console.log(`\n📈 Resumen:`);
    console.log(`   ✅ Apuestas con 50M: ${betsWithFifty.length}`);
    console.log(`   ⚠️  Apuestas con 1M: ${betsWithOne.length}`);

    if (betsWithOne.length > 0) {
      console.log('\n⚠️  ADVERTENCIA: Todavía hay apuestas con 1M. Esto puede significar:');
      console.log('   1. Estas apuestas fueron creadas antes de aplicar los cambios');
      console.log('   2. El frontend no se ha recargado correctamente');
      console.log('   3. Necesitas crear nuevas apuestas para ver el cambio');
    }

    if (betsWithFifty.length > 0) {
      console.log('\n✅ Excelente: Las nuevas apuestas se están creando con 50M correctamente');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentBets();
