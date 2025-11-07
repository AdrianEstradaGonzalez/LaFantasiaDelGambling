import { PrismaClient } from '@prisma/client';

(async function main(){
  const prisma = new PrismaClient();
  try {
    const league = await prisma.league.findFirst({ where: { division: 'primera' }, select: { currentJornada: true } });
    const current = league?.currentJornada ?? 12;
    console.log('[inspect] Current jornada:', current);

    // Inspeccionar columnas existentes (debug)
    const sample = await prisma.$queryRaw`SELECT * FROM player_stats LIMIT 1` as any[];
    if (sample && sample.length > 0) {
      console.log('[inspect] player_stats columns:', Object.keys(sample[0]));
    } else {
      console.log('[inspect] player_stats appears empty or no sample row');
    }
    // Consultas: filas con pointsBreakdown NULL vs NOT NULL (usar nombres camelCase)
    const problematic = await prisma.$queryRaw`
      SELECT id, "playerId", "totalPoints", minutes, "pointsBreakdown"
      FROM player_stats
      WHERE jornada = ${current} AND "totalPoints" > 0 AND "pointsBreakdown" IS NULL
      LIMIT 50
    ` as any[];

    const ok = await prisma.$queryRaw`
      SELECT id, "playerId", "totalPoints", minutes, "pointsBreakdown"
      FROM player_stats
      WHERE jornada = ${current} AND "totalPoints" > 0 AND "pointsBreakdown" IS NOT NULL
      LIMIT 50
    ` as any[];

    console.log('[inspect] Problematic count (pointsBreakdown IS NULL) sample:', problematic.length);
    problematic.slice(0,10).forEach(p => console.log(JSON.stringify(p)));

    console.log('[inspect] OK count (pointsBreakdown NOT null) sample:', ok.length);
    ok.slice(0,10).forEach(p => {
      const labels = Array.isArray(p.pointsBreakdown) ? (p.pointsBreakdown as any[]).map(x => x.label).slice(0,6) : typeof p.pointsBreakdown;
      console.log({ playerId: p.playerId, totalPoints: p.totalPoints, minutes: p.minutes, labels });
    });

    const totalProblematicRes = await prisma.$queryRaw`SELECT count(1) as c FROM player_stats WHERE jornada = ${current} AND "totalPoints" > 0 AND "pointsBreakdown" IS NULL` as any[];
    const totalOkRes = await prisma.$queryRaw`SELECT count(1) as c FROM player_stats WHERE jornada = ${current} AND "totalPoints" > 0 AND "pointsBreakdown" IS NOT NULL` as any[];
    const totalProblematic = totalProblematicRes?.[0]?.c ?? 0;
    const totalOk = totalOkRes?.[0]?.c ?? 0;
    console.log('[inspect] totals -> problematic:', totalProblematic, 'ok:', totalOk);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
