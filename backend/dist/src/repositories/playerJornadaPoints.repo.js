import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DEFAULT_SEASON = Number(process.env.FOOTBALL_API_SEASON ?? 2025);
const columnMap = new Map(Array.from({ length: 38 }, (_, idx) => {
    const jornada = idx + 1;
    return [jornada, `pointsJ${jornada}`];
}));
function getColumnName(jornada) {
    const key = columnMap.get(jornada);
    if (!key) {
        throw new Error(`Jornada ${jornada} fuera de rango (1-38)`);
    }
    return key;
}
export const PlayerJornadaPointsRepo = {
    async findByPlayerSeason(playerId, season = DEFAULT_SEASON) {
        return prisma.playerJornadaPoints.findUnique({
            where: { playerId_season: { playerId, season } },
        });
    },
    async upsertPoints(playerId, season, updates) {
        if (!Object.keys(updates).length)
            return;
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
