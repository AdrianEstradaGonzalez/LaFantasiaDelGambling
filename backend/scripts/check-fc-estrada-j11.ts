import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFCEstradaJ11() {
  console.log('🔍 Verificando puntos de F.C.Estrada en jornada 11...\n');

  const leagueId = 'cmhe4097k00518kc4tsms6h5g'; // CBO
  const userId = 'cmh0pf4vj0000139xm3nnazgn'; // F.C.Estrada

  // Obtener usuario
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true }
  });

  console.log(`Usuario: ${user?.name || 'Unknown'}\n`);

  // Obtener plantilla
  const squad = await prisma.squad.findFirst({
    where: {
      leagueId,
      userId
    },
    include: {
      players: {
        orderBy: { position: 'asc' }
      }
    }
  });

  if (!squad) {
    console.log('❌ No se encontró plantilla');
    return;
  }

  console.log(`📋 Plantilla (${squad.players.length} jugadores):\n`);

  let totalJ11 = 0;
  let totalJ12 = 0;

  for (const player of squad.players) {
    // Stats jornada 11
    const statsJ11 = await prisma.playerStats.findFirst({
      where: {
        playerId: player.playerId,
        jornada: 11,
        season: 2025
      }
    });

    // Stats jornada 12
    const statsJ12 = await prisma.playerStats.findFirst({
      where: {
        playerId: player.playerId,
        jornada: 12,
        season: 2025
      }
    });

    const ptsJ11 = statsJ11?.totalPoints || 0;
    const ptsJ12 = statsJ12?.totalPoints || 0;

    totalJ11 += ptsJ11;
    totalJ12 += ptsJ12;

    console.log(`  ${player.position.padEnd(3)} - ${player.playerName.padEnd(25)} | J11: ${ptsJ11.toString().padStart(3)} pts | J12: ${ptsJ12.toString().padStart(3)} pts`);
  }

  console.log(`\n📊 TOTAL J11: ${totalJ11} pts`);
  console.log(`📊 TOTAL J12: ${totalJ12} pts`);
  console.log(`📊 ACUMULADO: ${totalJ11 + totalJ12} pts`);
}

checkFCEstradaJ11()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
