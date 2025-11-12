import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notification.service.js';

const prisma = new PrismaClient();

export class NotificationController {
  static async registerDevice(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId, ligaId, fcmToken, platform } = request.body as any;
      if (!userId || !fcmToken) {
        return reply.status(400).send({ error: 'userId y fcmToken son requeridos' });
      }
      const device = await prisma.deviceToken.upsert({
        where: { userId_ligaId: { userId, ligaId: ligaId || 'default' } },
        update: { token: fcmToken, platform: platform || 'android', updatedAt: new Date() },
        create: { userId, ligaId: ligaId || 'default', token: fcmToken, platform: platform || 'android' },
      });
      console.log('✅ Token registrado:', device);
      return reply.send({ success: true, device });
    } catch (error) {
      console.error('❌ Error al registrar token:', error);
      return reply.status(500).send({ error: 'Error al registrar token' });
    }
  }

  static async notifyJornadaAbierta(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { ligaId, jornada } = request.body as any;
      if (!ligaId || !jornada) {
        return reply.status(400).send({ error: 'ligaId y jornada son requeridos' });
      }
      const devices = await prisma.deviceToken.findMany({ where: { ligaId } });
      const tokens = devices.map((d: any) => d.token);
      if (tokens.length === 0) {
        return reply.send({ success: true, sent: 0, message: 'No hay dispositivos registrados' });
      }
      const result = await NotificationService.sendToMultiple(
        tokens, '⚽ ¡Nueva jornada disponible!', `La jornada ${jornada} ya está abierta. ¡Haz tus apuestas!`,
        { type: 'jornada-abierta', ligaId, jornada: jornada.toString() }
      );
      console.log('✅ Notificación de jornada abierta enviada:', result);
      return reply.send({ success: true, sent: result.successCount, failed: result.failureCount });
    } catch (error: any) {
      console.error('❌ Error al enviar notificación de jornada abierta:', error);
      return reply.status(500).send({ error: 'Error al enviar notificación' });
    }
  }

  static async notifyJornadaCerrada(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { ligaId, jornada } = request.body as any;
      if (!ligaId || !jornada) {
        return reply.status(400).send({ error: 'ligaId y jornada son requeridos' });
      }
      const devices = await prisma.deviceToken.findMany({ where: { ligaId } });
      const tokens = devices.map((d: any) => d.token);
      if (tokens.length === 0) {
        return reply.send({ success: true, sent: 0, message: 'No hay dispositivos registrados' });
      }
      const result = await NotificationService.sendToMultiple(
        tokens, '🔒 Jornada cerrada', `La jornada ${jornada} ha finalizado. ¡Revisa tus resultados!`,
        { type: 'jornada-cerrada', ligaId, jornada: jornada.toString() }
      );
      console.log('✅ Notificación de jornada cerrada enviada:', result);
      return reply.send({ success: true, sent: result.successCount, failed: result.failureCount });
    } catch (error: any) {
      console.error('❌ Error al enviar notificación de jornada cerrada:', error);
      return reply.status(500).send({ error: 'Error al enviar notificación' });
    }
  }

  static async sendTestNotification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId, title, body } = request.body as any;
      if (!userId) {
        return reply.status(400).send({ error: 'userId es requerido' });
      }
      const device = await prisma.deviceToken.findFirst({ where: { userId } });
      if (!device) {
        return reply.status(404).send({ error: 'No se encontró token para este usuario' });
      }
      await NotificationService.sendToSingle(
        device.token, title || '🧪 Notificación de prueba',
        body || 'Esta es una notificación de prueba del sistema', { type: 'test' }
      );
      console.log('✅ Notificación de prueba enviada');
      return reply.send({ success: true });
    } catch (error: any) {
      console.error('❌ Error al enviar notificación de prueba:', error);
      return reply.status(500).send({ error: 'Error al enviar notificación' });
    }
  }
}
