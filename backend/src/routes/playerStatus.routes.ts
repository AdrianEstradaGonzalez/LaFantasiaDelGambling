/**
 * RUTAS DE ESTADO DE JUGADORES
 */

import { FastifyPluginAsync } from 'fastify';
import {
  getPlayersAvailability,
  syncPlayersAvailability,
  syncPlayerAvailability,
} from '../controllers/playerStatus.controller.js';

// Admin middleware to check if user is admin
async function adminAuth(req: any, reply: any) {
  // First authenticate the user
  await req.jwtVerify();
  
  // Check if user is admin
  if (!req.user?.isAdmin) {
    return reply.code(403).send({
      code: 'FORBIDDEN',
      message: 'No tienes permisos de administrador',
    });
  }
}

const playerStatusRoutes: FastifyPluginAsync = async (app) => {
  // Obtener estado de todos los jugadores (público)
  app.get('/status', getPlayersAvailability);

  // Sincronizar todos los jugadores (requiere auth + admin)
  app.post('/status/sync', {
    preHandler: adminAuth,
  }, syncPlayersAvailability);

  // Sincronizar un jugador específico (requiere auth + admin)
  app.post('/:id/status/sync', {
    preHandler: adminAuth,
  }, syncPlayerAvailability);
};

export default playerStatusRoutes;
