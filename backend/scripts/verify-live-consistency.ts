import { PrismaClient } from '@prisma/client';

(async function main(){
  const prisma = new PrismaClient();
  try {
    const season = 2025;
    const leagues = await prisma.league.findMany({ where: { division: 'primera' }, include: { members: true } });
    console.log(`Found ${leagues.length} primera leagues`);

    for (const league of leagues) {
      const jornada = league.currentJornada ?? 12;
      console.log(`\nLeague ${league.name} (id=${league.id}) checking jornada ${jornada}`);

      for (const member of league.members) {
        // fetch stored points
        const stored = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: member.leagueId, userId: member.userId } }, select: { points: true } });
        const storedPoints = stored?.points ?? 0;

        // load squad
        const squad = await prisma.squad.findUnique({ where: { userId_leagueId: { userId: member.userId, leagueId: member.leagueId } }, include: { players: true } });
        if (!squad) {
          if (storedPoints !== 0) console.log(`  MISMATCH member ${member.userId} stored ${storedPoints} vs computed 0 (no squad)`);
          continue;
        }

        const playerIds = squad.players.map(p => p.playerId);
        const stats = await prisma.playerStats.findMany({ where: { playerId: { in: playerIds }, jornada, season }, select: { playerId: true, totalPoints: true } });
        let sum = 0;
        const captainId = squad.players.find((p: any) => p.isCaptain)?.playerId ?? null;
        for (const p of stats) {
          const pts = p.totalPoints ?? 0;
          if (captainId && p.playerId === captainId) sum += pts * 2;
          else sum += pts;
        }
        const computed = squad.players.length < 11 ? 0 : sum;
        if (computed !== storedPoints) {
          console.log(`  MISMATCH member ${member.userId}: stored=${storedPoints} computed=${computed} (squadSize=${squad.players.length})`);
        }
      }
    }

    console.log('\nVerification complete');
  } catch (err) {
    console.error('Error during verification', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
