import { FastifyRequest, FastifyReply } from 'fastify';

const CRON_TOKEN = '7B3TFD8Vo9TtIBGXE5zU4w76j7Dhz0IuUISMJDoCXRzAHLhi3yca4CQXAyLmwoxh';

/**
 * Middleware de autenticación para trabajos programados (cron)
 * Requiere un token especial en el header X-Cron-Token
 */
export async function cronAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers['x-cron-token'];
  
  if (!token || token !== CRON_TOKEN) {
    return reply.code(401).send({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Token de cron inválido',
    });
  }
}
