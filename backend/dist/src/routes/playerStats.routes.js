import { PlayerStatsController } from '../controllers/playerStats.controller.js';
// JWT Auth
async function jwtAuth(req, reply) {
    await req.jwtVerify();
}
// Admin Auth
async function adminAuth(req, reply) {
    await req.jwtVerify();
    if (!req.user?.isAdmin) {
        return reply.code(403).send({
            code: 'FORBIDDEN',
            message: 'No tienes permisos de administrador',
        });
    }
}
export const playerStatsRoutes = async (app) => {
    // Obtener estadísticas de un jugador en una jornada
    app.get('/player-stats/:playerId/jornada/:jornada', { preHandler: jwtAuth }, PlayerStatsController.getPlayerJornadaStats);
    // Obtener estadísticas de múltiples jornadas
    app.post('/player-stats/:playerId/multiple-jornadas', { preHandler: jwtAuth }, PlayerStatsController.getPlayerMultipleJornadasStats);
    // Actualizar todas las estadísticas de una jornada (admin)
    app.post('/player-stats/update-jornada', { preHandler: adminAuth }, PlayerStatsController.updateJornadaStats);
};
