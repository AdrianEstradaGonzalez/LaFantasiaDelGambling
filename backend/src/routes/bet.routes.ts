import { FastifyInstance } from 'fastify';
import { BetController } from '../controllers/bet.controller.js';
import { cronAuth } from '../middleware/cronAuth.js';

export default async function betRoutes(fastify: FastifyInstance) {
  // Obtener presupuesto de apuestas
  fastify.get('/budget/:leagueId', {
    preHandler: [fastify.auth],
  }, BetController.getBettingBudget);

  // Obtener todas las apuestas de la liga (jornada actual) - debe ir ANTES de '/:leagueId' para evitar colisiones
  fastify.get('/all/:leagueId', {
    preHandler: [fastify.auth],
  }, BetController.getLeagueBets);

  // Evaluar apuestas en tiempo real (sin actualizar BD)
  fastify.get('/realtime/:leagueId/:jornada', {
    preHandler: [fastify.auth],
  }, BetController.evaluateBetsRealTime);

  // Evaluar todas las apuestas pendientes (cron token)
  fastify.get('/evaluate-all', {
    preHandler: [cronAuth],
  }, BetController.evaluateAllPendingBets);

  fastify.post('/evaluate-all', {
    preHandler: [cronAuth],
  }, BetController.evaluateAllPendingBets);

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
