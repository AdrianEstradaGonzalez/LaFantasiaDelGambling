import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const LeagueRepo = {
    create: async (name: string, leaderId: string, code: string) => {
        // Obtener la jornada actual de la primera liga existente
        const firstLeague = await prisma.league.findFirst({
            select: { currentJornada: true }
        });
        
        const currentJornada = firstLeague?.currentJornada || 9; // Fallback a jornada 9
        
        return prisma.league.create({
            data: {
                name,
                code,
                leaderId,
                currentJornada,
                members: { create: { userId: leaderId, points: 0 } },
            },
        });
    },

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

    getByCode: (code: string) =>
        prisma.league.findFirst({
            where: { code },
            include: { leader: true, members: { include: { user: true } } },
        }),

};
