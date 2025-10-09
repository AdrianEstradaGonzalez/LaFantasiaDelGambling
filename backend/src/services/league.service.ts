import { LeagueRepo } from "../repositories/league.repo";
import { LeagueMemberRepo } from "../repositories/leagueMember";

export const LeagueService = {
  createLeague: (name: string, leaderId: string) =>
    LeagueRepo.create(name, leaderId),

  deleteLeague: async (leagueId: string, leaderId: string) => {
    const res = await LeagueRepo.deleteIfLeader(leagueId, leaderId);
    if (res.count === 0) throw new Error("Not leader or league not found");
    return { deleted: true };
  },

  addMember: (leagueId: string, userId: string) =>
    LeagueMemberRepo.add(leagueId, userId),

  removeMember: (leagueId: string, userId: string) =>
    LeagueMemberRepo.remove(leagueId, userId),

  listMembers: (leagueId: string) =>
    LeagueMemberRepo.listByLeague(leagueId),
};
