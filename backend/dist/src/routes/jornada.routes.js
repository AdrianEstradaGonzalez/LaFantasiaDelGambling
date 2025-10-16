import { JornadaController } from '../controllers/jornada.controller';
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
}
