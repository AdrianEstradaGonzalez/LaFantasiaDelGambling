/**
 * SCRIPT DIAGNÓSTICO: Listar Apuestas Pendientes
 * 
 * Ejecutar con: npx tsx scripts/list-pending-bets.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listPendingBets() {
  console.log('📋 Listando todas las apuestas pendientes...\n');

  try {
    // Obtener TODAS las apuestas pendientes (sin filtro de liga)
    const allPendingBets = await prisma.bet.findMany({
      where: {
        status: 'pending'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total de apuestas pendientes en el sistema: ${allPendingBets.length}\n`);

    if (allPendingBets.length === 0) {
      console.log('⚠️ No hay apuestas pendientes en la base de datos');
      return;
    }

    // Mostrar detalles de cada apuesta
    allPendingBets.forEach((bet, index) => {
      console.log(`${index + 1}. Apuesta ID: ${bet.id}`);
      console.log(`   Liga: ${bet.leagueId}`);
      console.log(`   Usuario: ${bet.userId}`);
      console.log(`   Partido: ${bet.matchId}`);
      console.log(`   Equipos: ${bet.homeTeam || 'N/A'} vs ${bet.awayTeam || 'N/A'}`);
      console.log(`   Tipo: ${bet.betType}`);
      console.log(`   Label: ${bet.betLabel}`);
      console.log(`   Cantidad: ${bet.amount}M`);
      console.log(`   Creada: ${bet.createdAt.toISOString()}`);
      console.log('');
    });

    // Agrupar por liga
    const betsByLeague = new Map<string, typeof allPendingBets>();
    allPendingBets.forEach(bet => {
      if (!betsByLeague.has(bet.leagueId)) {
        betsByLeague.set(bet.leagueId, []);
      }
      betsByLeague.get(bet.leagueId)!.push(bet);
    });

    console.log('📊 Resumen por liga:');
    console.log('==================');
    for (const [leagueId, bets] of betsByLeague.entries()) {
      console.log(`Liga ${leagueId}: ${bets.length} apuesta(s)`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

listPendingBets();
