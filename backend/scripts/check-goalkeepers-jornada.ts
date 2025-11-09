/**
 * Script para verificar las paradas de porteros en la jornada actual
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGoalkeepers() {
  console.log('🔍 Verificando paradas de porteros en jornada actual\n');

  // Obtener la jornada actual
  const league = await prisma.league.findFirst({
    select: { currentJornada: true }
  });

  if (!league?.currentJornada) {
    console.log('❌ No hay jornada actual');
    return;
  }

  const jornada = league.currentJornada;
  console.log(`📅 Jornada actual: ${jornada}\n`);

  // Buscar todos los porteros con stats en esta jornada
  const goalkeepers = await prisma.playerStats.findMany({
    where: {
      jornada,
      season: 2025
    },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          position: true
        }
      }
    },
    orderBy: [
      { minutes: 'desc' },
      { saves: 'desc' }
    ]
  });

  const gks = goalkeepers.filter(g => g.player.position === 'Goalkeeper');

  console.log(`⚽ Total porteros en jornada ${jornada}: ${gks.length}\n`);

  let withSaves = 0;
  let withoutSaves = 0;
  let withMinutes = 0;

  for (const gk of gks) {
    const hasSaves = gk.saves && gk.saves > 0;
    const hasMinutes = gk.minutes && gk.minutes > 0;

    if (hasMinutes) withMinutes++;
    if (hasSaves) withSaves++;
    else if (hasMinutes) withoutSaves++;

    const status = hasMinutes ? (hasSaves ? '✅' : '⚠️ ') : '⏸️ ';
    
    console.log(`${status} ${gk.player.name}`);
    console.log(`   Minutos: ${gk.minutes}`);
    console.log(`   Paradas: ${gk.saves}`);
    console.log(`   Goles encajados: ${gk.conceded}`);
    console.log(`   Puntos totales: ${gk.totalPoints}`);
    console.log(`   Fixture ID: ${gk.fixtureId}`);
    
    // Mostrar breakdown si existe
    if (gk.pointsBreakdown && typeof gk.pointsBreakdown === 'object') {
      const breakdown = gk.pointsBreakdown as any;
      if (Array.isArray(breakdown)) {
        const paradasItem = breakdown.find((b: any) => b.label === 'Paradas');
        if (paradasItem) {
          console.log(`   Paradas en breakdown: ${paradasItem.amount} (${paradasItem.points} pts)`);
        }
      }
    }
    
    console.log('');
  }

  console.log(`\n📊 RESUMEN:`);
  console.log(`   - Total porteros: ${gks.length}`);
  console.log(`   - Con minutos jugados: ${withMinutes}`);
  console.log(`   - Con paradas registradas: ${withSaves}`);
  console.log(`   - ⚠️  Con minutos pero SIN paradas: ${withoutSaves}`);

  if (withoutSaves > 0) {
    console.log(`\n⚠️  HAY ${withoutSaves} PORTEROS CON MINUTOS PERO SIN PARADAS REGISTRADAS`);
  }

  await prisma.$disconnect();
}

checkGoalkeepers().catch(console.error);
