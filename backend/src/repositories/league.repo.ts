import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const LeagueRepo = {
    create: (name: string, leaderId: string) =>
        prisma.league.create({
            data: {
                name,
                leaderId,
                members: { create: { userId: leaderId, points: 0 } },
            },
        }),

    deleteIfLeader: (leagueId: string, leaderId: string) =>
        prisma.league.deleteMany({ where: { id: leagueId, leaderId } }),

    getById: (leagueId: string) =>
        prisma.league.findUnique({
            where: { id: leagueId },
            include: { members: { include: { user: true } }, leader: true },
        }),

    getByUserId: (userId: string) =>
        prisma.league.findMany({
            where: { members: { some: { userId } } },
            include: {
                leader: { select: { id: true, name: true, email: true } },
                members: { select: { userId: true, points: true } },
            },
            orderBy: { createdAt: "desc" },
        }),

};
