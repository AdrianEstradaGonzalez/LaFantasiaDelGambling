import { PrismaClient } from '@prisma/client';

(async function main(){
  const prisma = new PrismaClient();
  try {
    const jornada = parseInt(process.argv[2] || '12', 10);
    console.log(`Corrigiendo member.points para que NO incluya jornada ${jornada}\n`);

    const leagues = await prisma.league.findMany({ 
      where: { division: 'primera' },
      include: { members: true }
    });

    console.log(`Found ${leagues.length} ligas\n`);

    for (const league of leagues) {
      console.log(`Liga: ${league.name}`);
      
      for (const member of league.members) {
        // Obtener squad
        const squad = await prisma.squad.findUnique({
          where: { userId_leagueId: { userId: member.userId, leagueId: league.id } },
          include: { players: true }
        });

        if (!squad) continue;

        // Calcular puntos de la jornada actual
        const playerIds = squad.players.map(p => p.playerId);
        const stats = await prisma.playerStats.findMany({
          where: { playerId: { in: playerIds }, jornada, season: 2025 },
          select: { playerId: true, totalPoints: true }
        });

        let jornadaActualPoints = 0;
        const captainId = squad.players.find((p: any) => p.isCaptain)?.playerId ?? null;
        
        for (const s of stats) {
          const pts = s.totalPoints ?? 0;
          if (captainId && s.playerId === captainId) jornadaActualPoints += pts * 2;
          else jornadaActualPoints += pts;
        }

        if (squad.players.length < 11) jornadaActualPoints = 0;

        // Corregir: histórico debe ser total actual MENOS jornada actual
        const currentTotal = member.points || 0;
        const correctHistorical = currentTotal - jornadaActualPoints;

        // Solo actualizar si hay diferencia
        if (correctHistorical !== currentTotal) {
          await prisma.leagueMember.update({
            where: { leagueId_userId: { leagueId: league.id, userId: member.userId } },
            data: { points: correctHistorical }
          });
          
          const user = await prisma.user.findUnique({ where: { id: member.userId }, select: { name: true } });
          console.log(`  ✅ ${user?.name || member.userId}: ${currentTotal} → ${correctHistorical} (restó ${jornadaActualPoints} de j${jornada})`);
        }
      }
    }

    console.log('\n✅ Corrección completada');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
