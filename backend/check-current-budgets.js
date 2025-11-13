import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentBudgets() {
  try {
    const cboLeagueId = 'cmhe4097k00518kc4tsms6h5g';
    
    const members = await prisma.leagueMember.findMany({
      where: { leagueId: cboLeagueId },
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    });

    console.log('💰 PRESUPUESTOS ACTUALES EN CBO (J13)\n');
    
    for (const member of members) {
      const ppj = member.pointsPerJornada || {};
      const pointsJ12 = ppj[12] || ppj['12'] || 0;
      
      console.log(
        `👤 ${member.user.name}\n` +
        `   Budget actual: ${member.budget}M\n` +
        `   InitialBudget: ${member.initialBudget}M\n` +
        `   Puntos J12: ${pointsJ12}\n`
      );
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentBudgets();
