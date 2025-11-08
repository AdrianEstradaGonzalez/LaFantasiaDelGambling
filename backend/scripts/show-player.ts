import { PrismaClient } from '@prisma/client';

(async function(){
  const prisma = new PrismaClient();
  try {
    const playerId = parseInt(process.argv[2] || '336594', 10);
    const jornada = parseInt(process.argv[3] || '12', 10);

    const ps = await prisma.playerStats.findFirst({
      where: { playerId, jornada, season: 2025 },
      select: { playerId: true, position: true, duelsWon: true, tacklesInterceptions: true, pointsBreakdown: true, totalPoints: true, minutes: true, saves: true, penaltySaved: true }
    });

    console.log(JSON.stringify(ps, null, 2));
  } catch (err) {
    console.error(err);
  } finally { process.exit(0); }
})();
