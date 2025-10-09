import { z } from "zod";

export const createLeagueBody = z.object({
  name: z.string().min(3),
});

export const deleteLeagueParams = z.object({
  leagueId: z.string().cuid(),
});

export const addMemberParams = z.object({
  leagueId: z.string().cuid(),
});
export const addMemberBody = z.object({
  userId: z.string().cuid(),
});

export const removeMemberParams = z.object({
  leagueId: z.string().cuid(),
  userId: z.string().cuid(),
});
