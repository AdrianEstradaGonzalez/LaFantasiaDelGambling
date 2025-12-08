import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para listar todas las apuestas de usuarios en la jornada 15
 */
async function listJornada15Bets() {
  try {
    console.log('📊 APUESTAS DE USUARIOS - JORNADA 15\n');
    console.log('='.repeat(80) + '\n');

    // Obtener todas las apuestas de jornada 15
    const bets = await prisma.bet.findMany({
      where: {
        jornada: 15
      },
      include: {
        leagueMember: {
          include: {
            user: true,
            league: true
          }
        },
        betCombi: true
      },
      orderBy: [
        { leagueId: 'asc' },
        { userId: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Obtener combis de jornada 15
    const combis = await prisma.betCombi.findMany({
      where: {
        jornada: 15
      },
      include: {
        leagueMember: {
          include: {
            user: true,
            league: true
          }
        },
        selections: true
      },
      orderBy: [
        { leagueId: 'asc' },
        { userId: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    console.log(`🎯 Total apuestas simples: ${bets.filter(b => !b.combiId).length}`);
    console.log(`🎲 Total combinadas: ${combis.length}`);
    console.log(`📝 Total selecciones (incluyendo las de combis): ${bets.length}\n`);
    console.log('='.repeat(80) + '\n');

    // Agrupar por usuario
    const userBets = new Map<string, any>();

    // Procesar apuestas simples
    bets.forEach(bet => {
      if (bet.combiId) return; // Las de combi se procesan aparte

      const key = `${bet.leagueId}-${bet.userId}`;
      if (!userBets.has(key)) {
        userBets.set(key, {
          user: bet.leagueMember.user.name,
          league: bet.leagueMember.league.name,
          simples: [],
          combis: []
        });
      }
      userBets.get(key).simples.push(bet);
    });

    // Procesar combis
    combis.forEach(combi => {
      const key = `${combi.leagueId}-${combi.userId}`;
      if (!userBets.has(key)) {
        userBets.set(key, {
          user: combi.leagueMember.user.name,
          league: combi.leagueMember.league.name,
          simples: [],
          combis: []
        });
      }
      userBets.get(key).combis.push(combi);
    });

    // Mostrar por usuario
    let userCount = 0;
    for (const [key, data] of userBets) {
      userCount++;
      console.log(`👤 Usuario: ${data.user}`);
      console.log(`   Liga: ${data.league}`);
      console.log(`   Apuestas simples: ${data.simples.length}`);
      console.log(`   Combinadas: ${data.combis.length}`);
      console.log(`   Total tickets usados: ${data.simples.length + data.combis.length}`);

      if (data.simples.length > 0) {
        console.log('\n   📌 Apuestas simples:');
        data.simples.forEach((bet: any, idx: number) => {
          console.log(`      ${idx + 1}. ${bet.homeTeam} vs ${bet.awayTeam}`);
          console.log(`         ${bet.betType}: ${bet.betLabel}`);
          console.log(`         Estado: ${bet.status} | Cuota: ${bet.odd}`);
          console.log(`         💰 Apostado: ${bet.amount}M | Ganancia potencial: ${bet.potentialWin}M`);
        });
      }

      if (data.combis.length > 0) {
        console.log('\n   🎲 Combinadas:');
        data.combis.forEach((combi: any, idx: number) => {
          console.log(`      Combi ${idx + 1}: ${combi.selections.length} selecciones`);
          console.log(`         Cuota total: ${combi.totalOdd.toFixed(2)}`);
          console.log(`         Estado: ${combi.status}`);
          console.log(`         💰 Apostado: ${combi.amount}M | Ganancia potencial: ${combi.potentialWin}M`);
          console.log(`         Selecciones:`);
          combi.selections.forEach((sel: any, selIdx: number) => {
            console.log(`            ${selIdx + 1}. ${sel.homeTeam} vs ${sel.awayTeam} - ${sel.betLabel}`);
          });
        });
      }

      console.log('\n' + '-'.repeat(80) + '\n');
    }

    // Calcular totales de dinero
    const simpleBets = bets.filter(b => !b.combiId);
    const totalAmountSimples = simpleBets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalPotentialWinSimples = simpleBets.reduce((sum, bet) => sum + bet.potentialWin, 0);
    const totalAmountCombis = combis.reduce((sum, combi) => sum + combi.amount, 0);
    const totalPotentialWinCombis = combis.reduce((sum, combi) => sum + combi.potentialWin, 0);

    console.log('='.repeat(80));
    console.log(`📊 RESUMEN FINAL`);
    console.log('='.repeat(80));
    console.log(`Total usuarios con apuestas: ${userCount}`);
    console.log(`Total apuestas simples: ${simpleBets.length}`);
    console.log(`Total combinadas: ${combis.length}`);
    console.log(`Total tickets usados: ${simpleBets.length + combis.length}`);
    console.log('');
    console.log('💰 DINERO EN JUEGO:');
    console.log(`   Simples - Apostado: ${totalAmountSimples}M | Ganancia potencial: ${totalPotentialWinSimples}M`);
    console.log(`   Combis  - Apostado: ${totalAmountCombis}M | Ganancia potencial: ${totalPotentialWinCombis}M`);
    console.log(`   TOTAL   - Apostado: ${totalAmountSimples + totalAmountCombis}M | Ganancia potencial: ${totalPotentialWinSimples + totalPotentialWinCombis}M`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listJornada15Bets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
