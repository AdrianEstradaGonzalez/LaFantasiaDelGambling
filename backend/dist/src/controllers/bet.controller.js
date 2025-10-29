import { BetService } from '../services/bet.service.js';
import { BetEvaluationService } from '../services/betEvaluation.service.js';
import { AppError } from '../utils/errors.js';
export class BetController {
    /**
     * GET /api/bets/budget/:leagueId
     * Obtener presupuesto de apuestas disponible
     */
    static async getBettingBudget(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId } = request.params;
            const budget = await BetService.getBettingBudget(userId, leagueId);
            return reply.status(200).send(budget);
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * GET /api/bets/all/:leagueId
     * Obtener todas las apuestas de la liga (todas las jornadas) con nombre y cantidad
     */
    static async getLeagueBets(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId } = request.params;
            const bets = await BetService.getLeagueBets(leagueId, userId);
            return reply.status(200).send(bets);
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * POST /api/bets/:leagueId
     * Crear una nueva apuesta
     */
    static async placeBet(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId } = request.params;
            const { matchId, homeTeam, awayTeam, betType, betLabel, odd, amount } = request.body;
            console.log('📥 BetController - Datos recibidos del frontend:', {
                matchId,
                homeTeam,
                awayTeam,
                betType,
                betLabel,
                odd,
                amount
            });
            const bet = await BetService.placeBet({
                userId,
                leagueId,
                matchId,
                homeTeam,
                awayTeam,
                betType,
                betLabel,
                odd,
                amount,
            });
            console.log('✅ BetController - Apuesta creada:', {
                id: bet.id,
                homeTeam: bet.homeTeam,
                awayTeam: bet.awayTeam,
                apiBetId: bet.apiBetId
            });
            return reply.status(201).send(bet);
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * GET /api/bets/:leagueId
     * Obtener apuestas del usuario en la jornada actual
     */
    static async getUserBets(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId } = request.params;
            const bets = await BetService.getUserBets(userId, leagueId);
            return reply.status(200).send(bets);
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * DELETE /api/bets/:leagueId/:betId
     * Eliminar una apuesta
     */
    static async deleteBet(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId, betId } = request.params;
            const result = await BetService.deleteBet(betId, userId, leagueId);
            return reply.status(200).send(result);
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * PUT /api/bets/:leagueId/:betId
     * Actualizar monto de una apuesta
     */
    static async updateBetAmount(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId, betId } = request.params;
            const { amount } = request.body;
            const bet = await BetService.updateBetAmount(betId, userId, leagueId, amount);
            return reply.status(200).send(bet);
        }
        catch (error) {
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * POST /api/bets/reset-budgets/:leagueId?
     * Resetear presupuestos de apuestas a 250M
     * Si se proporciona leagueId, solo resetea esa liga
     * Si no, resetea todas las ligas
     */
    static async resetBettingBudgets(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId } = request.params;
            await BetService.resetBettingBudgets(leagueId);
            return reply.status(200).send({
                success: true,
                message: leagueId
                    ? `Presupuestos reseteados a 250M para la liga ${leagueId}`
                    : 'Presupuestos reseteados a 250M para todas las ligas'
            });
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
    /**
     * GET /api/bets/realtime/:leagueId/:jornada
     * Evaluar apuestas en tiempo real sin actualizar la BD
     */
    static async evaluateBetsRealTime(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
            if (!userId) {
                return reply.status(401).send({ error: 'No autenticado' });
            }
            const { leagueId, jornada } = request.params;
            const jornadaNum = parseInt(jornada);
            if (isNaN(jornadaNum)) {
                return reply.status(400).send({ error: 'Jornada inválida' });
            }
            console.log(`⚡ Evaluando en tiempo real - Liga: ${leagueId}, Jornada: ${jornadaNum}`);
            const result = await BetEvaluationService.evaluateBetsRealTime(leagueId, jornadaNum);
            return reply.status(200).send({
                success: true,
                ...result
            });
        }
        catch (error) {
            console.error('❌ Error evaluando apuestas en tiempo real:', error);
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            return reply.status(500).send({ error: error.message });
        }
    }
}
