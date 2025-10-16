import { FastifyRequest, FastifyReply } from 'fastify';
import { JornadaService } from '../services/jornada.service.js';

export class JornadaController {
  /**
   * POST /api/jornada/reset/:leagueId
   * Resetear una liga específica para nueva jornada
   */
  static async resetJornadaLeague(
    request: FastifyRequest<{
      Params: { leagueId: string };
      Body: { jornada: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { leagueId } = request.params;
      const { jornada } = request.body;

      if (!jornada || jornada < 1) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      const result = await JornadaService.resetJornada(leagueId, jornada);

      // Convertir Map a objeto para JSON
      const balancesObj: any = {};
      result.balances.forEach((value, key) => {
        balancesObj[key] = value;
      });

      return reply.status(200).send({
        success: true,
        message: `Jornada ${jornada} procesada correctamente`,
        data: {
          evaluatedBets: result.evaluations.length,
          updatedMembers: result.updatedMembers,
          balances: balancesObj,
        },
      });
    } catch (error: any) {
      console.error('Error en resetJornadaLeague:', error);
      return reply.status(500).send({ error: error.message || 'Error al resetear jornada' });
    }
  }

  /**
   * POST /api/jornada/reset-all
   * Resetear todas las ligas para nueva jornada
   */
  static async resetJornadaAll(
    request: FastifyRequest<{
      Body: { jornada: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { jornada } = request.body;

      if (!jornada || jornada < 1) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      const result = await JornadaService.resetAllLeagues(jornada);

      return reply.status(200).send({
        success: true,
        message: `Jornada ${jornada} procesada para todas las ligas`,
        data: {
          leaguesProcessed: result.leaguesProcessed,
          totalEvaluations: result.totalEvaluations,
        },
      });
    } catch (error: any) {
      console.error('Error en resetJornadaAll:', error);
      return reply.status(500).send({ error: error.message || 'Error al resetear jornada' });
    }
  }

  /**
   * POST /api/jornada/evaluate/:leagueId
   * Evaluar apuestas de una jornada sin resetear presupuestos (solo para testing)
   */
  static async evaluateJornada(
    request: FastifyRequest<{
      Params: { leagueId: string };
      Body: { jornada: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { leagueId } = request.params;
      const { jornada } = request.body;

      if (!jornada || jornada < 1) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      const evaluations = await JornadaService.evaluateJornadaBets(jornada, leagueId);
      const balances = await JornadaService.calculateUserBalances(leagueId, evaluations);

      // Convertir Map a objeto
      const balancesObj: any = {};
      balances.forEach((value, key) => {
        balancesObj[key] = value;
      });

      return reply.status(200).send({
        success: true,
        message: `Apuestas de jornada ${jornada} evaluadas (sin aplicar cambios de presupuesto)`,
        data: {
          evaluations,
          balances: balancesObj,
        },
      });
    } catch (error: any) {
      console.error('Error en evaluateJornada:', error);
      return reply.status(500).send({ error: error.message || 'Error al evaluar jornada' });
    }
  }
}
