import { BetCombiService } from '../services/betCombi.service.js';
import { AppError } from '../utils/errors.js';
export class BetCombiController {
    /**
     * POST /bet-combis/:leagueId
     * Crear una nueva apuesta combinada
     */
    static async create(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId } = request.params;
            const { jornada, selections, amount } = request.body;
            // Validar datos
            if (!jornada || !selections || !amount) {
                return reply.status(400).send({ error: 'Faltan campos requeridos' });
            }
            if (selections.length < 2) {
                return reply.status(400).send({ error: 'Se requieren mínimo 2 apuestas para una combi' });
            }
            if (amount > 50000000) {
                return reply.status(400).send({ error: 'El monto máximo para combis es 50M' });
            }
            const combi = await BetCombiService.createCombi({
                leagueId,
                userId,
                jornada,
                selections,
                amount,
            });
            return reply.status(201).send(combi);
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * GET /bet-combis/:leagueId
     * Obtener combis del usuario en una liga
     */
    static async getByLeague(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId } = request.params;
            const jornada = request.query.jornada ? parseInt(request.query.jornada) : undefined;
            const combis = await BetCombiService.getUserCombis(userId, leagueId, jornada);
            return reply.status(200).send(combis);
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * POST /bet-combis/evaluate/:combiId
     * Evaluar una combi específica
     */
    static async evaluate(request, reply) {
        try {
            const { combiId } = request.params;
            const combi = await BetCombiService.evaluateCombi(combiId);
            return reply.status(200).send(combi);
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * POST /bet-combis/evaluate-jornada
     * Evaluar todas las combis de una jornada
     */
    static async evaluateJornada(request, reply) {
        try {
            const { leagueId, jornada } = request.body;
            if (!leagueId || !jornada) {
                return reply.status(400).send({ error: 'Faltan campos requeridos' });
            }
            const results = await BetCombiService.evaluateJornadaCombis(leagueId, jornada);
            return reply.status(200).send(results);
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
}
