import { FastifyRequest, FastifyReply } from "fastify";
import { LeagueService } from "../services/league.service";
import {
  createLeagueBody, deleteLeagueParams,
  addMemberParams, addMemberBody, removeMemberParams
} from "../schemas/league.schema";
import { AppError } from "../utils/errors";

export const LeagueController = {
  create: async (req: FastifyRequest, reply: FastifyReply) => {
    // líder = usuario autenticado
    const leaderId = (req.user as any)?.id;
    if (!leaderId) throw new AppError(401, "UNAUTHORIZED", "Token inválido");
    const { name } = createLeagueBody.parse((req as any).body);
    const league = await LeagueService.createLeague(name, leaderId);
    reply.code(201).send(league);
  },

  remove: async (req: FastifyRequest, reply: FastifyReply) => {
    const leaderId = (req.user as any)?.id;
    if (!leaderId) throw new AppError(401, "UNAUTHORIZED", "Token inválido");
    const { leagueId } = deleteLeagueParams.parse((req as any).params);
    const result = await LeagueService.deleteLeague(leagueId, leaderId);
    reply.send(result);
  },

  addMember: async (req: FastifyRequest, reply: FastifyReply) => {
    (req.user as any) && await req.jwtVerify(); // ya validado por hook
    const { leagueId } = addMemberParams.parse((req as any).params);
    const { userId } = addMemberBody.parse((req as any).body);
    const m = await LeagueService.addMember(leagueId, userId);
    reply.code(201).send(m);
  },

  removeMember: async (req: FastifyRequest, reply: FastifyReply) => {
    (req.user as any) && await req.jwtVerify();
    const { leagueId, userId } = removeMemberParams.parse((req as any).params);
    await LeagueService.removeMember(leagueId, userId);
    reply.code(204).send();
  },

  listMembers: async (req: FastifyRequest, reply: FastifyReply) => {
    const { leagueId } = deleteLeagueParams.parse((req as any).params);
    const members = await LeagueService.listMembers(leagueId);
    reply.send(members);
  },

  getByUser: async (req: any, reply: any) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError(401, "UNAUTHORIZED", "Token inválido");
  const leagues = await LeagueService.getLeaguesByUser(userId);
  reply.send(leagues);
},

};
