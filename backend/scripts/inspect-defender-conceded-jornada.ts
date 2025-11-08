import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jornadaArg = process.argv[2];
  const jornada = jornadaArg ? parseInt(jornadaArg, 10) : undefined;
  if (!jornada) {
    console.log('Uso: npx tsx scripts/inspect-defender-conceded-jornada.ts <jornada>');
    process.exit(1);
  }

  const rows = await prisma.$queryRaw`
    SELECT p."playerId", p."conceded", p."pointsBreakdown"
    FROM player_stats p
    JOIN "player" pl ON pl.id = p."playerId"
    WHERE p."jornada" = ${jornada} AND pl."position" = 'Defender' AND p."minutes" > 0
    ORDER BY p."playerId"
    LIMIT 50
  `;

  for (const r of rows as any[]) {
  const labels = Array.isArray(r.pointsBreakdown) ? r.pointsBreakdown.map((b: any) => b.label) : [];
  console.log({ playerId: r.playerId, conceded: r.conceded, labels });
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
