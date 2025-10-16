import { FastifyInstance } from 'fastify';
import { SquadController } from '../controllers/squad.controller.js';

async function squadRoutes(fastify: FastifyInstance) {
  // GET /api/squads/:ligaId - Obtener plantilla del usuario para una liga
  fastify.get('/:ligaId', {
    preHandler: [fastify.auth]
  }, SquadController.getUserSquad);

  // GET /api/squads/:ligaId/budget - Obtener presupuesto del usuario
  fastify.get('/:ligaId/budget', {
    preHandler: [fastify.auth]
  }, SquadController.getUserBudget);

  // POST /api/squads/:ligaId/players - Añadir jugador a la plantilla
  fastify.post('/:ligaId/players', {
    preHandler: [fastify.auth]
  }, SquadController.addPlayerToSquad);

  // DELETE /api/squads/:ligaId/players/:position - Eliminar jugador de la plantilla
  fastify.delete('/:ligaId/players/:position', {
    preHandler: [fastify.auth]
  }, SquadController.removePlayerFromSquad);

  // POST /api/squads/:ligaId/save - Guardar o actualizar plantilla
  fastify.post('/:ligaId/save', {
    preHandler: [fastify.auth]
  }, SquadController.saveSquad);

  // POST /api/squads/:ligaId/captain - Establecer capitán de la plantilla
  fastify.post('/:ligaId/captain', {
    preHandler: [fastify.auth]
  }, SquadController.setCaptain);

  // POST /api/squads - Crear nueva plantilla
  fastify.post('/', {
    preHandler: [fastify.auth]
  }, SquadController.createSquad);

  // PUT /api/squads/:ligaId - Actualizar plantilla existente
  fastify.put('/:ligaId', {
    preHandler: [fastify.auth]
  }, SquadController.updateSquad);

  // DELETE /api/squads/:ligaId - Eliminar plantilla
  fastify.delete('/:ligaId', {
    preHandler: [fastify.auth]
  }, SquadController.deleteSquad);
}

export default squadRoutes;