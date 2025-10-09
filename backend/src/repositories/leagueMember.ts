import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const LeagueMemberRepo = {
  add: (leagueId: string, userId: string) =>
    prisma.leagueMember.upsert({
      where: { leagueId_userId: { leagueId, userId } },
      create: { leagueId, userId },
      update: {},
    }),

  remove: (leagueId: string, userId: string) =>
    prisma.leagueMember.deleteMany({ where: { leagueId, userId } }),

  listByLeague: (leagueId: string) =>
    prisma.leagueMember.findMany({
      where: { leagueId },
      include: { user: true },
      orderBy: { points: "desc" },
    }),
};
