import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const LeagueMemberRepo = {
    add: (leagueId, userId) => {
        // Inicializar pointsPerJornada con todas las jornadas a 0 (1-38)
        const initialPointsPerJornada = {};
        for (let i = 1; i <= 38; i++) {
            initialPointsPerJornada[i.toString()] = 0;
        }
        return prisma.leagueMember.upsert({
            where: { leagueId_userId: { leagueId, userId } },
            create: {
                leagueId,
                userId,
                pointsPerJornada: initialPointsPerJornada
            },
            update: {},
        });
    },
    remove: (leagueId, userId) => prisma.leagueMember.deleteMany({ where: { leagueId, userId } }),
    listByLeague: (leagueId) => prisma.leagueMember.findMany({
        where: { leagueId },
        include: {
            user: true,
            league: { select: { id: true, name: true, code: true } }
        },
        orderBy: { points: "desc" },
    }),
};
