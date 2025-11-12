import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notification.service';

const prisma = new PrismaClient();

export class NotificationController {
  /**
   * Registrar token FCM de un dispositivo
   */
  static async registerDevice(req: Request, res: Response) {
    try {
      const { userId, ligaId, fcmToken, platform } = req.body;

      if (!userId || !fcmToken) {
        return res.status(400).json({ error: 'userId y fcmToken son requeridos' });
      }

      // Guardar o actualizar token en la base de datos
      const device = await prisma.deviceToken.upsert({
        where: {
          userId_ligaId: {
            userId,
            ligaId: ligaId || 'default',
          },
        },
        update: {
          token: fcmToken,
          platform: platform || 'android',
          updatedAt: new Date(),
        },
        create: {
          userId,
          ligaId: ligaId || 'default',
          token: fcmToken,
          platform: platform || 'android',
        },
      });

      console.log('✅ Token registrado:', device);
      res.json({ success: true, device });
    } catch (error) {
      console.error('❌ Error al registrar token:', error);
      res.status(500).json({ error: 'Error al registrar token' });
    }
  }

  /**
   * Enviar notificación cuando se abre una jornada
   */
  static async notifyJornadaAbierta(req: Request, res: Response) {
    try {
      const { ligaId, jornada } = req.body;

      if (!ligaId || !jornada) {
        return res.status(400).json({ error: 'ligaId y jornada son requeridos' });
      }

      // Obtener todos los tokens de usuarios en esta liga
      const devices = await prisma.deviceToken.findMany({
        where: { ligaId },
      });

      const tokens = devices.map(d => d.token);

      if (tokens.length === 0) {
        return res.json({ success: true, sent: 0, message: 'No hay dispositivos registrados' });
      }

      // Enviar notificación a todos los dispositivos
      const result = await NotificationService.sendToMultiple(
        tokens,
        '⚽ ¡Nueva jornada disponible!',
        `La jornada ${jornada} ya está abierta. ¡Haz tus apuestas!`,
        { type: 'jornada-abierta', ligaId, jornada: jornada.toString() }
      );

      console.log('✅ Notificación de jornada abierta enviada:', result);
      res.json({ success: true, sent: result.successCount, failed: result.failureCount });
    } catch (error) {
      console.error('❌ Error al enviar notificación de jornada abierta:', error);
      res.status(500).json({ error: 'Error al enviar notificación' });
    }
  }

  /**
   * Enviar notificación cuando se cierra una jornada
   */
  static async notifyJornadaCerrada(req: Request, res: Response) {
    try {
      const { ligaId, jornada } = req.body;

      if (!ligaId || !jornada) {
        return res.status(400).json({ error: 'ligaId y jornada son requeridos' });
      }

      // Obtener todos los tokens de usuarios en esta liga
      const devices = await prisma.deviceToken.findMany({
        where: { ligaId },
      });

      const tokens = devices.map(d => d.token);

      if (tokens.length === 0) {
        return res.json({ success: true, sent: 0, message: 'No hay dispositivos registrados' });
      }

      // Enviar notificación a todos los dispositivos
      const result = await NotificationService.sendToMultiple(
        tokens,
        '🔒 Jornada cerrada',
        `La jornada ${jornada} ha finalizado. ¡Revisa tus resultados!`,
        { type: 'jornada-cerrada', ligaId, jornada: jornada.toString() }
      );

      console.log('✅ Notificación de jornada cerrada enviada:', result);
      res.json({ success: true, sent: result.successCount, failed: result.failureCount });
    } catch (error) {
      console.error('❌ Error al enviar notificación de jornada cerrada:', error);
      res.status(500).json({ error: 'Error al enviar notificación' });
    }
  }

  /**
   * Enviar notificación de prueba
   */
  static async sendTestNotification(req: Request, res: Response) {
    try {
      const { userId, title, body } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId es requerido' });
      }

      // Obtener token del usuario
      const device = await prisma.deviceToken.findFirst({
        where: { userId },
      });

      if (!device) {
        return res.status(404).json({ error: 'No se encontró token para este usuario' });
      }

      // Enviar notificación
      await NotificationService.sendToSingle(
        device.token,
        title || '🧪 Notificación de prueba',
        body || 'Esta es una notificación de prueba del sistema',
        { type: 'test' }
      );

      console.log('✅ Notificación de prueba enviada');
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error al enviar notificación de prueba:', error);
      res.status(500).json({ error: 'Error al enviar notificación' });
    }
  }
}
