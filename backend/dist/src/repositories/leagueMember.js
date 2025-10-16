import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const LeagueMemberRepo = {
    add: (leagueId, userId) => prisma.leagueMember.upsert({
        where: { leagueId_userId: { leagueId, userId } },
        create: { leagueId, userId },
        update: {},
    }),
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
