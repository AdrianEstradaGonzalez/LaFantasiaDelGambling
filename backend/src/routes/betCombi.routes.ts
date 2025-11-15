import { FastifyInstance } from 'fastify';
import { BetCombiController } from '../controllers/betCombi.controller.js';

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

  /**
   * DELETE /bet-combis/:combiId/selections/:betId
   * Eliminar una selección de una combi
   */
  fastify.delete('/:combiId/selections/:betId', {
    preHandler: [fastify.auth],
  }, BetCombiController.removeSelection);

  /**
   * POST /bet-combis/:combiId/selections
   * Añadir una selección a una combi existente
   * Body: { selection: CombiSelection }
   */
  fastify.post('/:combiId/selections', {
    preHandler: [fastify.auth],
  }, BetCombiController.addSelection);
}
