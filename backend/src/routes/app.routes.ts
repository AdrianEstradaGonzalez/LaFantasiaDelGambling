import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export default async function appRoutes(app: FastifyInstance) {
  // Endpoint público que devuelve la versión mínima soportada y la última versión disponible
  app.get('/app/version', async (request, reply) => {
    return reply.send({
      latest: env.APP_LATEST_VERSION,
      minSupported: env.APP_MIN_SUPPORTED_VERSION,
    });
  });
}

export { };
