import { FastifyRequest, FastifyReply } from 'fastify';
import { BetService } from '../services/bet.service';

export class BetController {
  /**
   * GET /api/bets/budget/:leagueId
   * Obtener presupuesto de apuestas disponible
   */
  static async getBettingBudget(request: FastifyRequest<{ Params: { leagueId: string } }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId } = request.params;
      const budget = await BetService.getBettingBudget(userId, leagueId);
      return reply.status(200).send(budget);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * POST /api/bets/:leagueId
   * Crear una nueva apuesta
   */
  static async placeBet(
    request: FastifyRequest<{
      Params: { leagueId: string };
      Body: {
        matchId: number;
        betType: string;
        betLabel: string;
        odd: number;
        amount: number;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId } = request.params;
      const { matchId, betType, betLabel, odd, amount } = request.body;

      const bet = await BetService.placeBet({
        userId,
        leagueId,
        matchId,
        betType,
        betLabel,
        odd,
        amount,
      });

      return reply.status(201).send(bet);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * GET /api/bets/:leagueId
   * Obtener apuestas del usuario en la jornada actual
   */
  static async getUserBets(request: FastifyRequest<{ Params: { leagueId: string } }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId } = request.params;
      const bets = await BetService.getUserBets(userId, leagueId);
      return reply.status(200).send(bets);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * DELETE /api/bets/:leagueId/:betId
   * Eliminar una apuesta
   */
  static async deleteBet(request: FastifyRequest<{ Params: { leagueId: string; betId: string } }>, reply: FastifyReply) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId, betId } = request.params;
      const result = await BetService.deleteBet(betId, userId, leagueId);
      return reply.status(200).send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * PUT /api/bets/:leagueId/:betId
   * Actualizar monto de una apuesta
   */
  static async updateBetAmount(
    request: FastifyRequest<{
      Params: { leagueId: string; betId: string };
      Body: { amount: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId, betId } = request.params;
      const { amount } = request.body;

      const bet = await BetService.updateBetAmount(betId, userId, leagueId, amount);
      return reply.status(200).send(bet);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}
