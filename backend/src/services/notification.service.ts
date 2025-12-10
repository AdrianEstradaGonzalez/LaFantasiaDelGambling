/**
 * Servicio de notificaciones con Firebase Cloud Messaging
 * 
 * Envía notificaciones push a Android e iOS aunque la app esté cerrada.
 */

import * as admin from 'firebase-admin';

let firebaseInitialized = false;

// Inicializar Firebase Admin SDK
const initializeFirebase = () => {
  if (firebaseInitialized) return;

  try {
    // Usando variables de entorno
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK inicializado');
    } else {
      console.warn('⚠️ Firebase no configurado. Configura las variables de entorno.');
    }
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
  }
};

initializeFirebase();

export class NotificationService {
  /**
   * Enviar notificación a un solo dispositivo
   */
  static async sendToSingle(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase no inicializado. No se puede enviar notificación.');
      return;
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token,
        android: {
          priority: 'high',
          notification: {
            channelId: 'liga-updates',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Notificación enviada exitosamente:', response);
    } catch (error) {
      console.error('❌ Error al enviar notificación:', error);
    }
  }

  /**
   * Enviar notificación a múltiples dispositivos
   */
  static async sendToMultiple(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase no inicializado. No se puede enviar notificación.');
      return { successCount: 0, failureCount: 0 };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: data || {},
        tokens,
        android: {
          priority: 'high',
          notification: {
            channelId: 'liga-updates',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ Notificaciones enviadas: ${response.successCount}/${tokens.length}`);
      
      if (response.failureCount > 0) {
        console.warn(`⚠️ ${response.failureCount} notificaciones fallaron`);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Error en token ${idx}:`, resp.error);
          }
        });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('❌ Error al enviar notificaciones múltiples:', error);
      return { successCount: 0, failureCount: tokens.length };
    }
  }

  /**
   * Enviar notificación a un tema (topic)
   * NOTA: Sin Firebase, solo registra el evento.
   */
  static async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    console.log(`📱 [Notificación Local] Evento para topic "${topic}":`, { title, body });
    return;
  }

  /**
   * Suscribir tokens a un tema
   * NOTA: Sin Firebase, solo registra el evento.
   */
  static async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    console.log(`📱 [Notificación Local] ${tokens.length} dispositivos suscritos a "${topic}"`);
    return;
  }

  /**
   * Desuscribir tokens de un tema
   * NOTA: Sin Firebase, solo registra el evento.
   */
  static async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    console.log(`📱 [Notificación Local] ${tokens.length} dispositivos desuscritos de "${topic}"`);
    return;
  }

  /**
   * Enviar notificación a todos los usuarios de una liga
   * NOTA: Sin Firebase, solo registra el evento.
   */
  static async sendToLeagueMembers(
    leagueId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ successCount: number; failureCount: number; totalMembers: number }> {
    try {
      // Importar Prisma para contar miembros
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const members = await prisma.leagueMember.findMany({
        where: { leagueId: leagueId },
        select: { userId: true }
      });

      await prisma.$disconnect();

      const totalMembers = members.length;
      console.log(`📱 [Notificación Local] Evento para ${totalMembers} miembros de liga:`, { title, body });
      
      return { successCount: totalMembers, failureCount: 0, totalMembers };
    } catch (error) {
      console.error('❌ Error al contar miembros de liga:', error);
      return { successCount: 0, failureCount: 0, totalMembers: 0 };
    }
  }

  /**
   * Enviar notificación a TODOS los usuarios únicos (sin duplicados)
   * Útil para notificaciones globales como apertura de jornada
   */
  static async sendToAllUsers(
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ successCount: number; failureCount: number; totalUsers: number }> {
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase no inicializado. No se puede enviar notificación.');
      return { successCount: 0, failureCount: 0, totalUsers: 0 };
    }

    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      const deviceTokens = await prisma.deviceToken.findMany({
        select: { token: true },
        distinct: ['token']
      });

      await prisma.$disconnect();

      const tokens = deviceTokens.map(dt => dt.token);
      
      if (tokens.length === 0) {
        console.log('ℹ️ No hay dispositivos registrados');
        return { successCount: 0, failureCount: 0, totalUsers: 0 };
      }

      console.log(`📱 Enviando notificación Firebase a ${tokens.length} dispositivos únicos`);

      const result = await this.sendToMultiple(tokens, title, body, data);

      return {
        ...result,
        totalUsers: tokens.length
      };
    } catch (error) {
      console.error('❌ Error al enviar notificación global:', error);
      return { successCount: 0, failureCount: 0, totalUsers: 0 };
    }
  }
}
