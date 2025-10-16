import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const LeagueRepo = {
    create: (name, leaderId, code) => prisma.league.create({
        data: {
            name,
            code,
            leaderId,
            members: { create: { userId: leaderId, points: 0 } },
        },
    }),
    deleteIfLeader: (leagueId, leaderId) => prisma.league.deleteMany({ where: { id: leagueId, leaderId } }),
    getById: (leagueId) => prisma.league.findUnique({
        where: { id: leagueId },
        include: { members: { include: { user: true } }, leader: true },
    }),
    getByUserId: (userId) => prisma.league.findMany({
        where: { members: { some: { userId } } },
        include: {
            leader: { select: { id: true, name: true, email: true } },
            members: { select: { userId: true, points: true } },
        },
        orderBy: { createdAt: "desc" },
    }),
    getByCode: (code) => prisma.league.findFirst({
        where: { code },
        include: { leader: true, members: { include: { user: true } } },
    }),
};
