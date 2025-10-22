import { FastifyRequest, FastifyReply } from "fastify";
import { LeagueService } from "../services/league.service.js";
import {
  createLeagueBody, deleteLeagueParams,
  addMemberParams, addMemberBody, removeMemberParams
} from "../schemas/league.schema.js";
import { AppError } from "../utils/errors.js";

export const LeagueController = {
  create: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      // líder = usuario autenticado
      const leaderId = (req.user as any)?.sub || (req.user as any)?.id;
      if (!leaderId) throw new AppError(401, "UNAUTHORIZED", "Token inválido");
      const { name } = createLeagueBody.parse((req as any).body);
      const league = await LeagueService.createLeague(name, leaderId);
      reply.code(201).send(league);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      // Error inesperado
      req.log.error('Error creating league:', error);
      throw new AppError(500, "INTERNAL_ERROR", error.message || "Error al crear la liga");
    }
  },

  remove: async (req: FastifyRequest, reply: FastifyReply) => {
    const leaderId = (req.user as any)?.sub || (req.user as any)?.id;
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

  addMemberByCode: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req.user as any)?.sub || (req.user as any)?.id;
    if (!userId) throw new AppError(401, "UNAUTHORIZED", "Token inválido");
    const { code } = (req as any).params;
    const m = await LeagueService.addMemberByCode(code, userId);
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
    const jornada = (req as any).query?.jornada;
    
    // Si se especifica una jornada, calcular clasificación para esa jornada
    if (jornada && jornada !== 'Total') {
      const jornadaNum = parseInt(jornada, 10);
      if (isNaN(jornadaNum) || jornadaNum < 1 || jornadaNum > 38) {
        throw new AppError(400, "INVALID_JORNADA", "Jornada inválida");
      }
      const members = await LeagueService.listMembersByJornada(leagueId, jornadaNum);
      reply.send(members);
    } else {
      // Clasificación total (por defecto)
      const members = await LeagueService.listMembers(leagueId);
      reply.send(members);
    }
  },

  // Obtener TODAS las clasificaciones (Total + todas las jornadas) en una sola llamada
  getAllClassifications: async (req: FastifyRequest, reply: FastifyReply) => {
    const { leagueId } = deleteLeagueParams.parse((req as any).params);
    const result = await LeagueService.getAllClassifications(leagueId);
    reply.send(result);
  },

getByUser: async (req: any, reply: any) => {
const { userId } = req.params as { userId: string };
const leagues = await LeagueService.getLeaguesByUser(userId);
reply.send(leagues);
},

  // Calcular puntos en tiempo real consultando API-Football
  calculateRealTimePoints: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { leagueId } = deleteLeagueParams.parse((req as any).params);
      const result = await LeagueService.calculateRealTimePoints(leagueId);
      reply.send(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      req.log.error('Error calculating real-time points:', error);
      throw new AppError(500, "INTERNAL_ERROR", error.message || "Error al calcular puntos en tiempo real");
    }
  },

  // 🚀 Disparar cálculo de puntos para TODAS las ligas (background)
  triggerPointsCalculation: async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('🚀 [triggerPointsCalculation] Usuario disparó cálculo de puntos');
      
      // Importar dinámicamente el servicio de cálculo
      const { PointsCalculationService } = await import('../services/pointsCalculation.service.js');
      
      // Ejecutar en background sin bloquear la respuesta
      PointsCalculationService.calculateAllPoints().catch(err => {
        console.error('❌ Error en cálculo de puntos en background:', err);
      });
      
      // Responder inmediatamente
      reply.send({
        success: true,
        message: 'Cálculo de puntos iniciado en segundo plano'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      req.log.error('Error triggering points calculation:', error);
      throw new AppError(500, "INTERNAL_ERROR", "Error al iniciar cálculo de puntos");
    }
  },

};
