import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DE_JONG_ID = 538;
const JORNADA = 12;
const SEASON = 2025;

async function fixDeJongCards() {
  console.log('🔧 Corrigiendo tarjetas de De Jong - Jornada 12...\n');

  const current = await prisma.playerStats.findUnique({
    where: {
      playerId_jornada_season: {
        playerId: DE_JONG_ID,
        jornada: JORNADA,
        season: SEASON
      }
    }
  });

  if (!current) {
    console.log('❌ No se encontraron stats de De Jong para jornada 12');
    return;
  }

  console.log(`📊 Stats actuales:`);
  console.log(`   Amarillas: ${current.yellowCards}`);
  console.log(`   Rojas: ${current.redCards}`);
  console.log(`   Puntos totales: ${current.totalPoints}\n`);

  // Actualizar: 2 amarillas -> 1 roja
  await prisma.playerStats.update({
    where: {
      playerId_jornada_season: {
        playerId: DE_JONG_ID,
        jornada: JORNADA,
        season: SEASON
      }
    },
    data: {
      yellowCards: 0,  // Las 2 amarillas no cuentan
      redCards: 1,      // Se convierten en 1 roja
      updatedAt: new Date()
    }
  });

  console.log(`✅ Tarjetas actualizadas:`);
  console.log(`   Amarillas: 0 (antes: ${current.yellowCards})`);
  console.log(`   Rojas: 1 (antes: ${current.redCards})`);
  console.log(`\n⚠️  NOTA: Los puntos NO se recalculan automáticamente.`);
  console.log(`   Si necesitas recalcular los puntos, ejecuta el script de recálculo de puntos.`);

  await prisma.$disconnect();
}

fixDeJongCards();
