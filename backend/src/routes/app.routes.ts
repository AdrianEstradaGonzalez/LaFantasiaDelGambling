import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export default async function appRoutes(app: FastifyInstance) {
  // Endpoint público que devuelve la versión mínima soportada y la última versión disponible
  app.get('/app/version', async (request, reply) => {
    return reply.send({
      latest: env.APP_LATEST_VERSION,
      minSupported: env.APP_MIN_SUPPORTED_VERSION,
      // Optional platform-specific overrides
      minAndroidVersion: env.APP_MIN_ANDROID_VERSION || undefined,
      minIOSVersion: env.APP_MIN_IOS_VERSION || undefined,
      // Optional store URLs
      storeUrlAndroid: env.STORE_URL_ANDROID || undefined,
      storeUrliOS: env.STORE_URL_IOS || undefined,
    });
  });
}

export { };
