import { FastifyPluginAsync } from 'fastify';
import { PlayerStatsController } from '../controllers/playerStats.controller.js';
import { cronAuth } from '../middleware/cronAuth.js';

// JWT Auth
async function jwtAuth(req: any, reply: any) {
  await req.jwtVerify();
}

// Admin Auth
async function adminAuth(req: any, reply: any) {
  await req.jwtVerify();
  
  if (!req.user?.isAdmin) {
    return reply.code(403).send({
      code: 'FORBIDDEN',
      message: 'No tienes permisos de administrador',
    });
  }
}

export const playerStatsRoutes: FastifyPluginAsync = async (app) => {
  // Obtener estadísticas de un jugador en una jornada
  app.get(
    '/player-stats/:playerId/jornada/:jornada',
    { preHandler: jwtAuth },
    PlayerStatsController.getPlayerJornadaStats
  );

  // Obtener estadísticas de múltiples jornadas
  app.post(
    '/player-stats/:playerId/multiple-jornadas',
    { preHandler: jwtAuth },
    PlayerStatsController.getPlayerMultipleJornadasStats
  );

  // Actualizar todas las estadísticas de una jornada (cron token)
  app.post(
    '/player-stats/update-jornada',
    { preHandler: cronAuth },
    PlayerStatsController.updateJornadaStats
  );

  // Actualizar jornada vía GET (para cron jobs que solo soportan GET)
  app.get(
    '/player-stats/update-jornada',
    { preHandler: cronAuth },
    PlayerStatsController.updateJornadaStats
  );

  // Actualizar estadísticas Segunda División (POST)
  app.post(
    '/player-stats/update-jornada-segunda',
    { preHandler: cronAuth },
    PlayerStatsController.updateJornadaStatsSegunda
  );

  // Actualizar estadísticas Segunda División (GET)
  app.get(
    '/player-stats/update-jornada-segunda',
    { preHandler: cronAuth },
    PlayerStatsController.updateJornadaStatsSegunda
  );

  // Actualizar estadísticas Premier League (POST)
  app.post(
    '/player-stats/update-jornada-premier',
    { preHandler: cronAuth },
    PlayerStatsController.updateJornadaStatsPremier
  );

  // Actualizar estadísticas Premier League (GET)
  app.get(
    '/player-stats/update-jornada-premier',
    { preHandler: cronAuth },
    PlayerStatsController.updateJornadaStatsPremier
  );

  // Obtener promedios por posición (todas las estadísticas)
  app.get(
    '/player-stats/averages-by-position',
    { preHandler: jwtAuth },
    PlayerStatsController.getAveragesByPosition
  );

  // Obtener análisis del próximo rival
  app.get(
    '/player-stats/:playerId/next-opponent',
    { preHandler: jwtAuth },
    PlayerStatsController.getNextOpponentAnalysis
  );
};
