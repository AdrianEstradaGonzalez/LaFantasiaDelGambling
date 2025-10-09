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
};
