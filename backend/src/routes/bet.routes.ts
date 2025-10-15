import { FastifyInstance } from 'fastify';
import { BetController } from '../controllers/bet.controller';

export default async function betRoutes(fastify: FastifyInstance) {
  // Obtener presupuesto de apuestas
  fastify.get('/budget/:leagueId', {
    preHandler: [fastify.auth],
  }, BetController.getBettingBudget);

  // Obtener apuestas del usuario
  fastify.get('/:leagueId', {
    preHandler: [fastify.auth],
  }, BetController.getUserBets);

  // Crear nueva apuesta
  fastify.post('/:leagueId', {
    preHandler: [fastify.auth],
  }, BetController.placeBet);

  // Actualizar monto de apuesta
  fastify.put('/:leagueId/:betId', {
    preHandler: [fastify.auth],
  }, BetController.updateBetAmount);

  // Eliminar apuesta
  fastify.delete('/:leagueId/:betId', {
    preHandler: [fastify.auth],
  }, BetController.deleteBet);

  // Resetear presupuestos de apuestas a 250M (para todos los miembros de una liga o todas las ligas)
  fastify.post('/reset-budgets/:leagueId?', {
    preHandler: [fastify.auth],
  }, BetController.resetBettingBudgets);
}
