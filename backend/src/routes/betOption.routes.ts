import { FastifyInstance } from 'fastify';
import { BetOptionController } from '../controllers/betOption.controller.js';

export default async function betOptionRoutes(fastify: FastifyInstance) {
  // Obtener opciones de apuesta
  fastify.get(
    '/bet-options/:leagueId/:jornada',
    { preHandler: [fastify.auth] },
    BetOptionController.getBetOptions
  );

  // Guardar opciones de apuesta
  fastify.post(
    '/bet-options/:leagueId/:jornada',
    { preHandler: [fastify.auth] },
    BetOptionController.saveBetOptions
  );

  // Verificar si existen opciones
  fastify.get(
    '/bet-options/:leagueId/:jornada/exists',
    { preHandler: [fastify.auth] },
    BetOptionController.checkOptionsExist
  );
}
