import { FastifyInstance } from 'fastify';
import { NotificationController } from '../controllers/notification.controller.js';

export default async function notificationRoutes(app: FastifyInstance) {
  // Registrar token FCM de dispositivo
  app.post('/register', NotificationController.registerDevice);

  // Enviar notificación de jornada abierta
  app.post('/jornada-abierta', NotificationController.notifyJornadaAbierta);

  // Enviar notificación de jornada cerrada
  app.post('/jornada-cerrada', NotificationController.notifyJornadaCerrada);

  // Testing: Enviar notificación de prueba
  app.post('/test', NotificationController.sendTestNotification);
}
