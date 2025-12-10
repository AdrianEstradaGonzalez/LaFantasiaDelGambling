/**
 * Servicio de OneSignal para notificaciones push
 * Permite enviar notificaciones aunque la app esté cerrada (sin Firebase)
 */

import axios from 'axios';

export class OneSignalService {
  private static APP_ID = ''; // Configurar en OneSignal Dashboard
  private static REST_API_KEY = ''; // Configurar en OneSignal Dashboard
  private static API_URL = 'https://onesignal.com/api/v1/notifications';

  /**
   * Enviar notificación a todos los usuarios
   */
  static async sendToAll(title: string, message: string, data?: any): Promise<void> {
    if (!this.APP_ID || !this.REST_API_KEY) {
      console.warn('⚠️ OneSignal no configurado. Configurar APP_ID y REST_API_KEY');
      return;
    }

    try {
      const notification = {
        app_id: this.APP_ID,
        included_segments: ['All'], // Enviar a todos los usuarios
        headings: { en: title },
        contents: { en: message },
        data: data || {},
        android_channel_id: 'liga-updates',
        priority: 10,
      };

      await axios.post(this.API_URL, notification, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.REST_API_KEY}`,
        },
      });

      console.log('✅ Notificación OneSignal enviada:', title);
    } catch (error) {
      console.error('❌ Error al enviar notificación OneSignal:', error);
    }
  }

  /**
   * Enviar notificación a usuarios específicos por IDs externos
   */
  static async sendToUsers(userIds: string[], title: string, message: string, data?: any): Promise<void> {
    if (!this.APP_ID || !this.REST_API_KEY) {
      console.warn('⚠️ OneSignal no configurado');
      return;
    }

    try {
      const notification = {
        app_id: this.APP_ID,
        include_external_user_ids: userIds,
        headings: { en: title },
        contents: { en: message },
        data: data || {},
        android_channel_id: 'liga-updates',
        priority: 10,
      };

      await axios.post(this.API_URL, notification, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.REST_API_KEY}`,
        },
      });

      console.log(`✅ Notificación OneSignal enviada a ${userIds.length} usuarios`);
    } catch (error) {
      console.error('❌ Error al enviar notificación OneSignal:', error);
    }
  }
}
