import { FastifyInstance } from 'fastify';
import { BetCombiController } from '../controllers/betCombi.controller';

export default async function betCombiRoutes(fastify: FastifyInstance) {
  /**
   * POST /bet-combis/:leagueId
   * Crear una nueva apuesta combinada
   * Body: { jornada, selections: CombiSelection[], amount }
   */
  fastify.post('/:leagueId', {
    preHandler: [fastify.auth],
  }, BetCombiController.create);

  /**
   * GET /bet-combis/:leagueId
   * Obtener combis de un usuario en una liga
   * Query params: ?jornada=X (opcional)
   */
  fastify.get('/:leagueId', {
    preHandler: [fastify.auth],
  }, BetCombiController.getByLeague);

  /**
   * POST /bet-combis/evaluate/:combiId
   * Evaluar una combi específica
   */
  fastify.post('/evaluate/:combiId', {
    preHandler: [fastify.auth],
  }, BetCombiController.evaluate);

  /**
   * POST /bet-combis/evaluate-jornada
   * Evaluar todas las combis de una jornada
   * Body: { leagueId, jornada }
   */
  fastify.post('/evaluate-jornada', {
    preHandler: [fastify.auth],
  }, BetCombiController.evaluateJornada);
}
