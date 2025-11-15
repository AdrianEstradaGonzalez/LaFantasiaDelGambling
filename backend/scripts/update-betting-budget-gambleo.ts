import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateBettingBudgetGambleo() {
  try {
    console.log('🎰 Actualizando presupuesto de apuestas para La Fantasía del Gambleo...\n');

    // Buscar la liga por nombre
    const league = await prisma.league.findFirst({
      where: {
        name: {
          contains: 'Gambleo',
          mode: 'insensitive'
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    if (!league) {
      console.error('❌ No se encontró la liga "La Fantasía del Gambleo"');
      return;
    }

    console.log(`✅ Liga encontrada: ${league.name} (${league.id})`);
    console.log(`👥 Miembros: ${league.members.length}\n`);

    // Actualizar presupuesto de todos los miembros
    const newBudget = 250;
    
    for (const member of league.members) {
      const oldBudget = member.bettingBudget;
      
      await prisma.leagueMember.update({
        where: {
          leagueId_userId: {
            leagueId: league.id,
            userId: member.userId
          }
        },
        data: {
          bettingBudget: newBudget
        }
      });

      console.log(`✅ ${member.user.name}: ${oldBudget}M → ${newBudget}M`);
    }

    console.log(`\n🎉 Presupuesto actualizado para ${league.members.length} miembros!`);
    console.log(`💰 Nuevo presupuesto: ${newBudget}M`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateBettingBudgetGambleo();
