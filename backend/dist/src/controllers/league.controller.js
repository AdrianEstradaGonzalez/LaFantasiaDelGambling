import { LeagueService } from "../services/league.service";
import { createLeagueBody, deleteLeagueParams, addMemberParams, addMemberBody, removeMemberParams } from "../schemas/league.schema";
import { AppError } from "../utils/errors";
export const LeagueController = {
    create: async (req, reply) => {
        // líder = usuario autenticado
        const leaderId = req.user?.sub || req.user?.id;
        if (!leaderId)
            throw new AppError(401, "UNAUTHORIZED", "Token inválido");
        const { name } = createLeagueBody.parse(req.body);
        const league = await LeagueService.createLeague(name, leaderId);
        reply.code(201).send(league);
    },
    remove: async (req, reply) => {
        const leaderId = req.user?.sub || req.user?.id;
        if (!leaderId)
            throw new AppError(401, "UNAUTHORIZED", "Token inválido");
        const { leagueId } = deleteLeagueParams.parse(req.params);
        const result = await LeagueService.deleteLeague(leagueId, leaderId);
        reply.send(result);
    },
    addMember: async (req, reply) => {
        req.user && await req.jwtVerify(); // ya validado por hook
        const { leagueId } = addMemberParams.parse(req.params);
        const { userId } = addMemberBody.parse(req.body);
        const m = await LeagueService.addMember(leagueId, userId);
        reply.code(201).send(m);
    },
    addMemberByCode: async (req, reply) => {
        const userId = req.user?.sub || req.user?.id;
        if (!userId)
            throw new AppError(401, "UNAUTHORIZED", "Token inválido");
        const { code } = req.params;
        const m = await LeagueService.addMemberByCode(code, userId);
        reply.code(201).send(m);
    },
    removeMember: async (req, reply) => {
        req.user && await req.jwtVerify();
        const { leagueId, userId } = removeMemberParams.parse(req.params);
        await LeagueService.removeMember(leagueId, userId);
        reply.code(204).send();
    },
    listMembers: async (req, reply) => {
        const { leagueId } = deleteLeagueParams.parse(req.params);
        const members = await LeagueService.listMembers(leagueId);
        reply.send(members);
    },
    getByUser: async (req, reply) => {
        const { userId } = req.params;
        const leagues = await LeagueService.getLeaguesByUser(userId);
        reply.send(leagues);
    },
};
