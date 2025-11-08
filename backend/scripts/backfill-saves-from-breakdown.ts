import { PrismaClient } from '@prisma/client';

(async function main(){
  const prisma = new PrismaClient();
  try {
    const jornada = parseInt(process.argv[2] || '12', 10);
    console.log('Backfilling saves and penaltySaved from pointsBreakdown for jornada', jornada);

    const rows = await prisma.playerStats.findMany({
      where: { jornada, season: 2025 },
      select: { id: true, playerId: true, saves: true, penaltySaved: true, pointsBreakdown: true }
    });

    let updated = 0;

    for (const r of rows) {
      const breakdown = Array.isArray(r.pointsBreakdown) ? r.pointsBreakdown as any[] : [];
      const pbSaves = breakdown.find(b => b.label === 'Paradas');
      const pbPen = breakdown.find(b => b.label === 'Penaltis parados');

      const wantSaves = typeof pbSaves?.amount === 'number' ? pbSaves.amount : undefined;
      const wantPen = typeof pbPen?.amount === 'number' ? pbPen.amount : undefined;

      const data: any = {};
      if ((r.saves ?? 0) === 0 && typeof wantSaves === 'number' && wantSaves > 0) data.saves = wantSaves;
      if ((r.penaltySaved ?? 0) === 0 && typeof wantPen === 'number' && wantPen > 0) data.penaltySaved = wantPen;

      if (Object.keys(data).length > 0) {
        await prisma.playerStats.update({ where: { id: r.id }, data });
        updated++;
      }
    }

    console.log('✅ Updated rows:', updated);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
