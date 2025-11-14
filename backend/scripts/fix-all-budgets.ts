import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllBudgets() {
  console.log('🔧 Iniciando corrección de presupuestos...\n');

  try {
    // Obtener todos los miembros de todas las ligas
    const allMembers = await prisma.leagueMember.findMany({
      include: {
        league: true
      }
    });

    console.log(`📊 Total de membresías encontradas: ${allMembers.length}\n`);

    let correctedCount = 0;
    let alreadyCorrectCount = 0;

    for (const member of allMembers) {
      // Obtener la plantilla del usuario en esta liga
      const squad = await prisma.squad.findUnique({
        where: {
          userId_leagueId: {
            userId: member.userId,
            leagueId: member.leagueId
          }
        },
        include: {
          players: true
        }
      });

      // Calcular el valor actual del equipo
      let squadValue = 0;
      if (squad && squad.players.length > 0) {
        squadValue = squad.players.reduce((sum, player) => sum + player.pricePaid, 0);
      }

      // Calcular el presupuesto correcto
      const correctBudget = member.initialBudget - squadValue;

      // Verificar si necesita corrección
      if (member.budget !== correctBudget) {
        console.log(`🔄 Corrigiendo: Liga ${member.league.name}`);
        console.log(`   Usuario: ${member.userId}`);
        console.log(`   Initial Budget: ${member.initialBudget}M`);
        console.log(`   Valor equipo: ${squadValue}M`);
        console.log(`   Presupuesto actual (incorrecto): ${member.budget}M`);
        console.log(`   Presupuesto correcto: ${correctBudget}M`);
        console.log(`   Diferencia: ${correctBudget - member.budget}M\n`);

        // Actualizar el presupuesto
        await prisma.leagueMember.update({
          where: {
            leagueId_userId: {
              leagueId: member.leagueId,
              userId: member.userId
            }
          },
          data: {
            budget: correctBudget
          }
        });

        correctedCount++;
      } else {
        alreadyCorrectCount++;
      }
    }

    console.log('\n✅ Proceso completado:');
    console.log(`   ✓ Presupuestos corregidos: ${correctedCount}`);
    console.log(`   ✓ Presupuestos ya correctos: ${alreadyCorrectCount}`);
    console.log(`   ✓ Total procesados: ${allMembers.length}`);

  } catch (error) {
    console.error('❌ Error al corregir presupuestos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
fixAllBudgets()
  .then(() => {
    console.log('\n🎉 Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
