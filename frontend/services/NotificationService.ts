import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, TriggerType, RepeatFrequency } from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class NotificationService {
  private static initialized = false;

  /**
   * Inicializar el servicio de notificaciones
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Solicitar permisos de notificaciones
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Permisos de notificaciones otorgados');
        
        // Solicitar permisos adicionales para Notifee (Android 13+)
        if (Platform.OS === 'android') {
          const settings = await notifee.requestPermission();
          console.log('📱 Permisos Notifee:', settings);
        }
        
        // Obtener token FCM
        const token = await messaging().getToken();
        console.log('📱 FCM Token:', token);
        
        // Guardar token en AsyncStorage para enviarlo al backend
        await AsyncStorage.setItem('fcmToken', token);
        
        // Configurar canal de notificaciones para Android
        await this.createNotificationChannel();
        
        // Configurar listeners
        this.setupNotificationListeners();
        
        // Programar notificación semanal (jueves 17:00)
        await this.scheduleWeeklyNotification();
        
        // Programar notificación diaria (00:00 - ofertas del mercado)
        await this.scheduleDailyMarketNotification();
        
        this.initialized = true;
      } else {
        console.warn('⚠️ Permisos de notificaciones denegados');
      }
    } catch (error) {
      console.error('❌ Error al inicializar notificaciones:', error);
    }
  }

  /**
   * Crear canal de notificaciones para Android
   */
  static async createNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'liga-updates',
        name: 'Actualizaciones de Liga',
        description: 'Recordatorios de plantilla, apuestas y resultados',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 500],
      });
      console.log('✅ Canal de notificaciones creado');
    }
  }

  /**
   * Configurar listeners para notificaciones
   */
  static setupNotificationListeners(): void {
    // Notificación en primer plano
    messaging().onMessage(async remoteMessage => {
      console.log('📬 Notificación recibida en primer plano:', remoteMessage);
      
      if (remoteMessage.notification) {
        await notifee.displayNotification({
          title: remoteMessage.notification.title,
          body: remoteMessage.notification.body,
          android: {
            channelId: 'liga-updates',
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
          },
          ios: {
            sound: 'default',
          },
        });
      }
    });

    // Notificación en segundo plano
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📬 Notificación recibida en segundo plano:', remoteMessage);
    });

    // Cuando el usuario toca la notificación
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('👆 Usuario abrió la app desde notificación:', remoteMessage);
      // Aquí puedes navegar a una pantalla específica
    });

    // Cuando la app se abre desde una notificación mientras estaba cerrada
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🚀 App abierta desde notificación:', remoteMessage);
        }
      });
  }

  /**
   * Programar notificación semanal todos los jueves a las 17:00
   */
  static async scheduleWeeklyNotification(): Promise<void> {
    try {
      // Cancelar notificaciones programadas anteriores
      const notifications = await notifee.getTriggerNotifications();
      for (const notification of notifications) {
        if (notification.notification.id === 'weekly-reminder') {
          await notifee.cancelNotification(notification.notification.id);
        }
      }

      // Calcular próximo viernes a las 17:00
      const now = new Date();
      const nextFriday = new Date();
      
      // Establecer día de la semana a viernes (5)
      const daysUntilFriday = (5 - now.getDay() + 7) % 7;
      nextFriday.setDate(now.getDate() + (daysUntilFriday || 7)); // Si ya es viernes, programar para el siguiente
      
      // Establecer hora a 17:00
      nextFriday.setHours(17, 0, 0, 0);
      
      // Si ya pasó la hora de hoy y es viernes, programar para el siguiente viernes
      if (now.getDay() === 5 && now.getHours() >= 17) {
        nextFriday.setDate(nextFriday.getDate() + 7);
      }

      // Crear trigger para repetir semanalmente
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: nextFriday.getTime(),
        repeatFrequency: RepeatFrequency.WEEKLY,
      };

      await notifee.createTriggerNotification(
        {
          id: 'weekly-reminder',
          title: '⚽ ¡Cierre de Jornada Próximo!',
          body: 'Recuerda realizar tu plantilla y apuestas antes del cierre de jornada',
          android: {
            channelId: 'liga-updates',
            importance: AndroidImportance.HIGH,
            smallIcon: 'ic_launcher', // Icono de la app
            largeIcon: 'ic_launcher', // Logo de la app
            pressAction: {
              id: 'default',
            },
            sound: 'default',
          },
          ios: {
            sound: 'default',
            attachments: [
              {
                url: 'app-icon', // iOS usa el icono de la app automáticamente
              },
            ],
          },
        },
        trigger as any
      );

      console.log('✅ Notificación semanal programada para:', nextFriday.toLocaleString());
    } catch (error) {
      console.error('❌ Error al programar notificación semanal:', error);
    }
  }

  /**
   * Programar notificación diaria a las 00:00 para ofertas del mercado
   */
  static async scheduleDailyMarketNotification(): Promise<void> {
    try {
      // Cancelar notificaciones programadas anteriores
      const notifications = await notifee.getTriggerNotifications();
      for (const notification of notifications) {
        if (notification.notification.id === 'daily-market-offers') {
          await notifee.cancelNotification(notification.notification.id);
        }
      }

      // Calcular próxima medianoche (00:00)
      const now = new Date();
      const nextMidnight = new Date();
      
      // Si ya pasó la medianoche de hoy, programar para mañana
      if (now.getHours() >= 0 && now.getMinutes() > 0) {
        nextMidnight.setDate(now.getDate() + 1);
      }
      
      // Establecer hora a 00:00
      nextMidnight.setHours(0, 0, 0, 0);

      // Crear trigger para repetir diariamente
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: nextMidnight.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
      };

      await notifee.createTriggerNotification(
        {
          id: 'daily-market-offers',
          title: '🛒 ¡Nuevas Ofertas en el Mercado!',
          body: 'Descubre las ofertas del día y mejora tu plantilla con los mejores jugadores',
          android: {
            channelId: 'liga-updates',
            importance: AndroidImportance.HIGH,
            smallIcon: 'ic_launcher',
            largeIcon: 'ic_launcher',
            pressAction: {
              id: 'default',
            },
            sound: 'default',
          },
          ios: {
            sound: 'default',
            attachments: [
              {
                url: 'app-icon',
              },
            ],
          },
        },
        trigger as any
      );

      console.log('✅ Notificación diaria del mercado programada para:', nextMidnight.toLocaleString());
    } catch (error) {
      console.error('❌ Error al programar notificación diaria del mercado:', error);
    }
  }

  /**
   * Obtener token FCM del dispositivo
   */
  static async getFCMToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('fcmToken');
    } catch (error) {
      console.error('❌ Error al obtener token FCM:', error);
      return null;
    }
  }

  /**
   * Enviar token al backend
   */
  static async sendTokenToBackend(userId: string, ligaId: string): Promise<void> {
    try {
      const token = await this.getFCMToken();
      if (!token) {
        console.warn('⚠️ No hay token FCM disponible');
        return;
      }

      // Aquí enviarías el token al backend
      // await axios.post('/api/notifications/register', { userId, ligaId, token });
      console.log('📤 Token enviado al backend:', { userId, ligaId, token });
    } catch (error) {
      console.error('❌ Error al enviar token al backend:', error);
    }
  }

  /**
   * Mostrar notificación local (para testing)
   */
  static async showLocalNotification(title: string, body: string): Promise<void> {
    try {
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: 'liga-updates',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      });
      console.log('✅ Notificación local mostrada');
    } catch (error) {
      console.error('❌ Error al mostrar notificación local:', error);
    }
  }

  /**
   * Cancelar todas las notificaciones programadas
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
      console.log('✅ Todas las notificaciones canceladas');
    } catch (error) {
      console.error('❌ Error al cancelar notificaciones:', error);
    }
  }

  /**
   * Probar notificación semanal (para testing - muestra en 10 segundos)
   */
  static async testWeeklyNotification(): Promise<void> {
    try {
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 10000, // 10 segundos desde ahora
      };

      await notifee.createTriggerNotification(
        {
          id: 'test-weekly-reminder',
          title: '⚽ ¡Cierre de Jornada Próximo!',
          body: 'Recuerda realizar tu plantilla y apuestas antes del cierre de jornada',
          android: {
            channelId: 'liga-updates',
            importance: AndroidImportance.HIGH,
            smallIcon: 'ic_launcher',
            largeIcon: 'ic_launcher',
            pressAction: {
              id: 'default',
            },
            sound: 'default',
          },
          ios: {
            sound: 'default',
          },
        },
        trigger as any
      );

      console.log('✅ Notificación de prueba programada para 10 segundos');
    } catch (error) {
      console.error('❌ Error al programar notificación de prueba:', error);
    }
  }

  /**
   * Probar notificación diaria del mercado (para testing - muestra en 10 segundos)
   */
  static async testDailyMarketNotification(): Promise<void> {
    try {
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 10000, // 10 segundos desde ahora
      };

      await notifee.createTriggerNotification(
        {
          id: 'test-daily-market',
          title: '🛒 ¡Nuevas Ofertas en el Mercado!',
          body: 'Descubre las ofertas del día y mejora tu plantilla con los mejores jugadores',
          android: {
            channelId: 'liga-updates',
            importance: AndroidImportance.HIGH,
            smallIcon: 'ic_launcher',
            largeIcon: 'ic_launcher',
            pressAction: {
              id: 'default',
            },
            sound: 'default',
          },
          ios: {
            sound: 'default',
          },
        },
        trigger as any
      );

      console.log('✅ Notificación de prueba del mercado programada para 10 segundos');
    } catch (error) {
      console.error('❌ Error al programar notificación de prueba del mercado:', error);
    }
  }

  /**
   * Verificar notificaciones programadas
   */
  static async checkScheduledNotifications(): Promise<void> {
    try {
      const notifications = await notifee.getTriggerNotifications();
      console.log('📋 Notificaciones programadas:', notifications.length);
      notifications.forEach(notif => {
        const triggerTime = new Date((notif.trigger as any).timestamp);
        console.log(`  - ${notif.notification.id}: ${triggerTime.toLocaleString()}`);
      });
    } catch (error) {
      console.error('❌ Error al verificar notificaciones:', error);
    }
  }
}

// Auto-inicializar cuando se importa el módulo
NotificationService.initialize().catch(err => {
  console.error('Error auto-inicializando notificaciones:', err);
});
