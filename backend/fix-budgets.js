import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBudgets() {
  try {
    console.log('🔧 Recalculando presupuestos correctamente para J13...\n');

    // Obtener todos los miembros de todas las ligas
    const members = await prisma.leagueMember.findMany({
      include: {
        league: true,
        user: true
      }
    });

    console.log(`📊 Total de miembros encontrados: ${members.length}\n`);

    let updated = 0;

    for (const member of members) {
      const { leagueId, userId } = member;

      // 1. Obtener apuestas de la jornada 12
      const betsJ12 = await prisma.bet.findMany({
        where: {
          leagueId,
          userId,
          jornada: 12,
          status: { not: 'pending' } // Solo apuestas resueltas
        }
      });

      // Calcular balance de apuestas J12
      // IMPORTANTE: cuando ganas, obtienes potentialWin COMPLETO (no la diferencia)
      let betsBalance = 0;
      for (const bet of betsJ12) {
        if (bet.status === 'won') {
          betsBalance += bet.potentialWin; // Ganancia TOTAL
        } else if (bet.status === 'lost') {
          betsBalance -= bet.amount; // Pérdida
        }
        // Si es 'void' no suma ni resta
      }

      // 2. Obtener puntos de la jornada 12 desde pointsPerJornada
      let pointsJ12 = 0;
      if (member.pointsPerJornada && typeof member.pointsPerJornada === 'object') {
        const ppj = member.pointsPerJornada;
        // Intentar como número y como string
        pointsJ12 = ppj[12] || ppj['12'] || 0;
      }

      // 3. FÓRMULA CORRECTA: 500 + balance apuestas J12 + puntos J12
      const newBudget = 500 + betsBalance + pointsJ12;
      const newInitialBudget = newBudget;

      console.log(
        `👤 ${member.user.name} (Liga: ${member.league.name})\n` +
        `   Base: 500M\n` +
        `   Balance apuestas J12: ${betsBalance >= 0 ? '+' : ''}${betsBalance}M (${betsJ12.length} apuestas)\n` +
        `   Puntos J12: +${pointsJ12}M\n` +
        `   TOTAL: 500 + ${betsBalance} + ${pointsJ12} = ${newBudget}M\n`
      );

      await prisma.leagueMember.update({
        where: { leagueId_userId: { leagueId, userId } },
        data: {
          budget: newBudget,
          initialBudget: newInitialBudget
        }
      });

      updated++;
    }

    console.log(`\n✅ ${updated} miembros actualizados correctamente`);

  } catch (error) {
    console.error('❌ Error recalculando presupuestos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixBudgets();
