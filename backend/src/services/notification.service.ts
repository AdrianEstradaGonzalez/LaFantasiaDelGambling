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
}
