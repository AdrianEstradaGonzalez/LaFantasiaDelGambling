import * as admin from 'firebase-admin';

// Inicializar Firebase Admin SDK
// Necesitas configurar las credenciales de Firebase en el backend
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;

  try {
    // Opción 1: Usando archivo de credenciales
    // const serviceAccount = require('../../firebase-service-account.json');
    // admin.initializeApp({
    //   credential: admin.credential.cert(serviceAccount),
    // });

    // Opción 2: Usando variables de entorno
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
      console.warn('⚠️ Firebase no configurado. Variables de entorno faltantes.');
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
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Notificación enviada exitosamente:', response);
    } catch (error) {
      console.error('❌ Error al enviar notificación:', error);
      throw error;
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
      throw error;
    }
  }

  /**
   * Enviar notificación a un tema (topic)
   */
  static async sendToTopic(
    topic: string,
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
        topic,
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

      const response = await admin.messaging().send(message);
      console.log('✅ Notificación enviada al tema:', response);
    } catch (error) {
      console.error('❌ Error al enviar notificación al tema:', error);
      throw error;
    }
  }

  /**
   * Suscribir tokens a un tema
   */
  static async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase no inicializado. No se puede suscribir.');
      return;
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      console.log(`✅ ${response.successCount} dispositivos suscritos al tema ${topic}`);
      
      if (response.failureCount > 0) {
        console.warn(`⚠️ ${response.failureCount} suscripciones fallaron`);
      }
    } catch (error) {
      console.error('❌ Error al suscribir al tema:', error);
      throw error;
    }
  }

  /**
   * Desuscribir tokens de un tema
   */
  static async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase no inicializado. No se puede desuscribir.');
      return;
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      console.log(`✅ ${response.successCount} dispositivos desuscritos del tema ${topic}`);
      
      if (response.failureCount > 0) {
        console.warn(`⚠️ ${response.failureCount} desuscripciones fallaron`);
      }
    } catch (error) {
      console.error('❌ Error al desuscribir del tema:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación a todos los usuarios de una liga
   */
  static async sendToLeagueMembers(
    leagueId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ successCount: number; failureCount: number; totalMembers: number }> {
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase no inicializado. No se puede enviar notificación.');
      return { successCount: 0, failureCount: 0, totalMembers: 0 };
    }

    try {
      // Importar Prisma para obtener tokens
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Obtener todos los tokens de dispositivos de los miembros de la liga
      const members = await prisma.leagueMember.findMany({
        where: { leagueId: leagueId },
        select: { userId: true }
      });

      const userIds = members.map(m => m.userId);

      const deviceTokens = await prisma.deviceToken.findMany({
        where: {
          userId: { in: userIds }
        },
        select: {
          token: true
        }
      });

      await prisma.$disconnect();

      const tokens = deviceTokens.map(dt => dt.token);
      
      if (tokens.length === 0) {
        console.log('ℹ️ No hay dispositivos registrados para esta liga');
        return { successCount: 0, failureCount: 0, totalMembers: 0 };
      }

      console.log(`📱 Enviando notificación a ${tokens.length} dispositivos de la liga ${leagueId}`);

      const result = await this.sendToMultiple(tokens, title, body, data);

      return {
        ...result,
        totalMembers: tokens.length
      };
    } catch (error) {
      console.error('❌ Error al enviar notificación a miembros de liga:', error);
      throw error;
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
      // Importar Prisma para obtener tokens
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Obtener TODOS los tokens únicos (sin duplicados por usuario)
      const deviceTokens = await prisma.deviceToken.findMany({
        select: {
          token: true
        },
        distinct: ['token']
      });

      await prisma.$disconnect();

      const tokens = deviceTokens.map(dt => dt.token);
      
      if (tokens.length === 0) {
        console.log('ℹ️ No hay dispositivos registrados');
        return { successCount: 0, failureCount: 0, totalUsers: 0 };
      }

      console.log(`📱 Enviando notificación global a ${tokens.length} dispositivos únicos`);

      const result = await this.sendToMultiple(tokens, title, body, data);

      return {
        ...result,
        totalUsers: tokens.length
      };
    } catch (error) {
      console.error('❌ Error al enviar notificación global:', error);
      throw error;
    }
  }
}
