import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

// Registrar token FCM de dispositivo
router.post('/register', NotificationController.registerDevice);

// Enviar notificación de jornada abierta
router.post('/jornada-abierta', NotificationController.notifyJornadaAbierta);

// Enviar notificación de jornada cerrada
router.post('/jornada-cerrada', NotificationController.notifyJornadaCerrada);

// Testing: Enviar notificación de prueba
router.post('/test', NotificationController.sendTestNotification);

export default router;
