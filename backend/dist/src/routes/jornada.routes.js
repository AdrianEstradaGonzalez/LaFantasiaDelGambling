import { JornadaController } from '../controllers/jornada.controller.js';
export default async function jornadaRoutes(fastify) {
    // Resetear jornada para una liga específica
    fastify.post('/reset/:leagueId', {
        preHandler: [fastify.auth],
    }, JornadaController.resetJornadaLeague);
    // Resetear jornada para todas las ligas
    fastify.post('/reset-all', {
        preHandler: [fastify.auth],
    }, JornadaController.resetJornadaAll);
    // Evaluar apuestas sin aplicar cambios (testing)
    fastify.post('/evaluate/:leagueId', {
        preHandler: [fastify.auth],
    }, JornadaController.evaluateJornada);
    // Cerrar jornada
    fastify.post('/close/:leagueId', {
        preHandler: [fastify.auth],
    }, JornadaController.closeJornada);
    // Abrir jornada
    fastify.post('/open/:leagueId', {
        preHandler: [fastify.auth],
    }, JornadaController.openJornada);
    // Obtener estado de jornada
    fastify.get('/status/:leagueId', {
        preHandler: [fastify.auth],
    }, JornadaController.getJornadaStatus);
    // Abrir jornada para TODAS las ligas
    fastify.post('/open-all', {
        preHandler: [fastify.auth],
    }, JornadaController.openAllJornadas);
    // Cerrar jornada para TODAS las ligas
    fastify.post('/close-all', {
        preHandler: [fastify.auth],
    }, JornadaController.closeAllJornadas);
}
