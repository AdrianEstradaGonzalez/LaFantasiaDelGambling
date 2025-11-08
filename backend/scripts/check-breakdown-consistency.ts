import { PrismaClient } from '@prisma/client';

(async function main() {
  const prisma = new PrismaClient();
  try {
    const jornada = parseInt(process.argv[2] || '12', 10);
    console.log('Checking breakdown consistency for jornada', jornada);

    const rows = await prisma.playerStats.findMany({
      where: { jornada, season: 2025 },
      select: {
        id: true,
        playerId: true,
        duelsWon: true,
        tacklesInterceptions: true,
        yellowCards: true,
        redCards: true,
        passesKey: true,
        dribblesSuccess: true,
        penaltySaved: true,
        saves: true,
        pointsBreakdown: true,
      },
    });

    let total = 0;
    const issues: any[] = [];

    for (const r of rows) {
      total++;
      const labels = Array.isArray(r.pointsBreakdown) ? r.pointsBreakdown.map((b: any) => String(b.label)) : [];

      if ((r.duelsWon ?? 0) > 0 && !labels.includes('Duelos ganados')) {
        issues.push({ playerId: r.playerId, field: 'duelsWon', value: r.duelsWon, labels });
      }
      if ((r.tacklesInterceptions ?? 0) > 0 && !labels.includes('Intercepciones')) {
        issues.push({ playerId: r.playerId, field: 'tacklesInterceptions', value: r.tacklesInterceptions, labels });
      }
      if ((r.yellowCards ?? 0) > 0 && !labels.includes('Tarjetas amarillas')) {
        issues.push({ playerId: r.playerId, field: 'yellowCards', value: r.yellowCards, labels });
      }
      if ((r.redCards ?? 0) > 0 && !labels.includes('Tarjeta roja')) {
        issues.push({ playerId: r.playerId, field: 'redCards', value: r.redCards, labels });
      }
      if ((r.passesKey ?? 0) > 0 && !labels.includes('Pases clave')) {
        issues.push({ playerId: r.playerId, field: 'passesKey', value: r.passesKey, labels });
      }
      if ((r.dribblesSuccess ?? 0) > 0 && !labels.includes('Regates exitosos')) {
        issues.push({ playerId: r.playerId, field: 'dribblesSuccess', value: r.dribblesSuccess, labels });
      }
      if ((r.penaltySaved ?? 0) > 0 && !labels.includes('Penaltis parados')) {
        issues.push({ playerId: r.playerId, field: 'penaltySaved', value: r.penaltySaved, labels });
      }
      if ((r.saves ?? 0) > 0 && !labels.includes('Paradas')) {
        issues.push({ playerId: r.playerId, field: 'saves', value: r.saves, labels });
      }
    }

    console.log(`Scanned ${total} rows. Issues found: ${issues.length}`);
    console.log('Sample issues (up to 20):');
    console.log(JSON.stringify(issues.slice(0, 20), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
