import { LeagueService } from "../services/league.service.js";
import { createLeagueBody, deleteLeagueParams, addMemberParams, addMemberBody, removeMemberParams } from "../schemas/league.schema.js";
import { AppError } from "../utils/errors.js";
export const LeagueController = {
    create: async (req, reply) => {
        try {
            // líder = usuario autenticado
            const leaderId = req.user?.sub || req.user?.id;
            if (!leaderId)
                throw new AppError(401, "UNAUTHORIZED", "Token inválido");
            const { name, division } = createLeagueBody.parse(req.body);
            const league = await LeagueService.createLeague(name, leaderId, division);
            reply.code(201).send(league);
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            // Error inesperado
            req.log.error('Error creating league:', error);
            throw new AppError(500, "INTERNAL_ERROR", error.message || "Error al crear la liga");
        }
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
    leaveLeague: async (req, reply) => {
        try {
            const userId = req.user?.sub || req.user?.id;
            if (!userId)
                throw new AppError(401, "UNAUTHORIZED", "Token inválido");
            const { leagueId } = req.params;
            const result = await LeagueService.leaveLeague(leagueId, userId);
            reply.send(result);
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            req.log.error('Error leaving league:', error);
            throw new AppError(500, "INTERNAL_ERROR", error.message || "Error al abandonar la liga");
        }
    },
    listMembers: async (req, reply) => {
        const { leagueId } = deleteLeagueParams.parse(req.params);
        const jornada = req.query?.jornada;
        // Si se especifica una jornada, calcular clasificación para esa jornada
        if (jornada && jornada !== 'Total') {
            const jornadaNum = parseInt(jornada, 10);
            if (isNaN(jornadaNum) || jornadaNum < 1 || jornadaNum > 38) {
                throw new AppError(400, "INVALID_JORNADA", "Jornada inválida");
            }
            const members = await LeagueService.listMembersByJornada(leagueId, jornadaNum);
            reply.send(members);
        }
        else {
            // Clasificación total (por defecto)
            const members = await LeagueService.listMembers(leagueId);
            reply.send(members);
        }
    },
    // Obtener TODAS las clasificaciones (Total + todas las jornadas) en una sola llamada
    getAllClassifications: async (req, reply) => {
        const { leagueId } = deleteLeagueParams.parse(req.params);
        const result = await LeagueService.getAllClassifications(leagueId);
        reply.send(result);
    },
    getByUser: async (req, reply) => {
        const { userId } = req.params;
        const leagues = await LeagueService.getLeaguesByUser(userId);
        reply.send(leagues);
    },
    // Calcular puntos en tiempo real consultando API-Football
    calculateRealTimePoints: async (req, reply) => {
        try {
            const { leagueId } = deleteLeagueParams.parse(req.params);
            const result = await LeagueService.calculateRealTimePoints(leagueId);
            reply.send(result);
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            req.log.error('Error calculating real-time points:', error);
            throw new AppError(500, "INTERNAL_ERROR", error.message || "Error al calcular puntos en tiempo real");
        }
    },
    // 🚀 Disparar cálculo de puntos para TODAS las ligas (background)
    triggerPointsCalculation: async (req, reply) => {
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
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            req.log.error('Error triggering points calculation:', error);
            throw new AppError(500, "INTERNAL_ERROR", "Error al iniciar cálculo de puntos");
        }
    },
};
