import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Este script intenta recuperar los puntos de la jornada 11 
 * buscando en el campo pointsPerJornada de LeagueMember
 * Si pointsPerJornada["11"] existe y no es 0, lo usamos.
 * Si no, necesitaremos que el usuario proporcione los valores correctos.
 */

async function checkJ11Points() {
  console.log('🔍 Buscando puntos de jornada 11 en pointsPerJornada...\n');

  const cboLeague = await prisma.league.findFirst({
    where: {
      name: 'CBO'
    },
    include: {
      members: {
        include: {
          user: {
            select: { name: true }
          }
        }
      }
    }
  });

  if (!cboLeague) {
    console.log('❌ No se encontró la liga CBO');
    return;
  }

  console.log(`🏆 Liga: ${cboLeague.name}\n`);

  for (const member of cboLeague.members) {
    const ppj = member.pointsPerJornada as any;
    const j11Points = ppj?.['11'] || 0;
    
    console.log(`${member.user.name}: J11 = ${j11Points} pts (current member.points = ${member.points})`);
  }

  console.log('\n\n⚠️  Si todos aparecen en 0, necesitaremos los valores correctos manualmente.');
}

checkJ11Points()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
