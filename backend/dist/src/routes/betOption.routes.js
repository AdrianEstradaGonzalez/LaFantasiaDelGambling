import { BetOptionController } from '../controllers/betOption.controller.js';
export default async function betOptionRoutes(fastify) {
    // Obtener opciones de apuesta
    fastify.get('/bet-options/:leagueId/:jornada', { preHandler: [fastify.auth] }, BetOptionController.getBetOptions);
    // Guardar opciones de apuesta
    fastify.post('/bet-options/:leagueId/:jornada', { preHandler: [fastify.auth] }, BetOptionController.saveBetOptions);
    // Verificar si existen opciones
    fastify.get('/bet-options/:leagueId/:jornada/exists', { preHandler: [fastify.auth] }, BetOptionController.checkOptionsExist);
    // Generar opciones de apuesta automáticamente
    fastify.post('/bet-options/:leagueId/:jornada/generate', { preHandler: [fastify.auth] }, BetOptionController.generateBetOptions);
    // Obtener o generar opciones (endpoint principal para el frontend)
    fastify.get('/bet-options/:leagueId/:jornada/get-or-generate', { preHandler: [fastify.auth] }, BetOptionController.getOrGenerateBetOptions);
}
