import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_SEASON = Number(process.env.FOOTBALL_API_SEASON ?? 2025);

type JornadaColumn =
  | "pointsJ1" | "pointsJ2" | "pointsJ3" | "pointsJ4" | "pointsJ5" | "pointsJ6" | "pointsJ7" | "pointsJ8" | "pointsJ9" | "pointsJ10"
  | "pointsJ11" | "pointsJ12" | "pointsJ13" | "pointsJ14" | "pointsJ15" | "pointsJ16" | "pointsJ17" | "pointsJ18" | "pointsJ19" | "pointsJ20"
  | "pointsJ21" | "pointsJ22" | "pointsJ23" | "pointsJ24" | "pointsJ25" | "pointsJ26" | "pointsJ27" | "pointsJ28" | "pointsJ29" | "pointsJ30"
  | "pointsJ31" | "pointsJ32" | "pointsJ33" | "pointsJ34" | "pointsJ35" | "pointsJ36" | "pointsJ37" | "pointsJ38";

const columnMap = new Map<number, JornadaColumn>(
  Array.from({ length: 38 }, (_, idx) => {
    const jornada = idx + 1;
    return [jornada, `pointsJ${jornada}` as JornadaColumn];
  })
);

function getColumnName(jornada: number): JornadaColumn {
  const key = columnMap.get(jornada);
  if (!key) {
    throw new Error(`Jornada ${jornada} fuera de rango (1-38)`);
  }
  return key;
}

export const PlayerJornadaPointsRepo = {
  async findByPlayerSeason(playerId: number, season: number = DEFAULT_SEASON) {
    return prisma.playerJornadaPoints.findUnique({
      where: { playerId_season: { playerId, season } },
    });
  },

  async upsertPoints(
    playerId: number,
    season: number,
    updates: Record<JornadaColumn, number | null | undefined>
  ) {
    if (!Object.keys(updates).length) return;

    await prisma.playerJornadaPoints.upsert({
      where: { playerId_season: { playerId, season } },
      create: {
        playerId,
        season,
        ...updates,
      },
      update: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  },

  getColumnName,
};
