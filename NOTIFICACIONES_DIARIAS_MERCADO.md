# Notificaciones Diarias - Ofertas del Mercado

## Descripción
Notificación local programada que se envía diariamente a las 00:00 para recordar a los usuarios que hay nuevas ofertas en el mercado de jugadores.

## Configuración

### Frecuencia
- **Horario**: 00:00 (medianoche) todos los días
- **Tipo**: Notificación local programada (Notifee)
- **Repetición**: Diaria

### Contenido
- **Título**: 🛒 ¡Nuevas Ofertas en el Mercado!
- **Cuerpo**: Descubre las ofertas del día y mejora tu plantilla con los mejores jugadores

### Características
- ✅ **Android**: Notificación con alta importancia, sonido y vibración
- ✅ **iOS**: Notificación con sonido por defecto
- ✅ **Icono**: Logo de la app (ic_launcher)
- ✅ **Canal**: "Actualizaciones de Liga" (liga-updates)
- ✅ **Auto-programación**: Se programa automáticamente al iniciar la app

## Implementación

### Archivo Principal
`frontend/services/NotificationService.ts`

### Función Clave
```typescript
static async scheduleDailyMarketNotification(): Promise<void>
```

Esta función:
1. Cancela cualquier notificación diaria anterior
2. Calcula la próxima medianoche (00:00)
3. Crea una notificación trigger con repetición diaria
4. Programa la notificación con Notifee

### Inicialización
La notificación se programa automáticamente cuando la app se inicia:

```typescript
// En NotificationService.initialize()
await this.scheduleDailyMarketNotification();
```

## Testing

### Test Manual (10 segundos)
Para probar la notificación sin esperar hasta medianoche:

```typescript
import { NotificationService } from './services/NotificationService';

// En algún componente o consola
NotificationService.testDailyMarketNotification();
```

Esto mostrará la notificación después de 10 segundos.

### Verificar Notificaciones Programadas
```typescript
NotificationService.checkScheduledNotifications();
```

Esto imprimirá en consola todas las notificaciones programadas con sus horarios.

### Ejemplo de Logs
```
✅ Notificación diaria del mercado programada para: 26/11/2025 00:00:00
📋 Notificaciones programadas: 2
  - weekly-reminder: 28/11/2025 17:00:00
  - daily-market-offers: 26/11/2025 00:00:00
```

## Cancelación

### Cancelar Solo la Notificación Diaria
```typescript
const notifications = await notifee.getTriggerNotifications();
for (const notification of notifications) {
  if (notification.notification.id === 'daily-market-offers') {
    await notifee.cancelNotification(notification.notification.id);
  }
}
```

### Cancelar Todas las Notificaciones
```typescript
NotificationService.cancelAllNotifications();
```

## Permisos Requeridos

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

### iOS (Info.plist)
```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

## Comportamiento

### Primera Instalación
1. Usuario instala la app
2. Se solicitan permisos de notificaciones
3. Si acepta, se programan automáticamente las notificaciones
4. La primera notificación se enviará a la próxima medianoche (00:00)

### Después de Cada Reinicio
- Las notificaciones persisten entre reinicios de la app (Notifee)
- Si la app se cierra, la notificación seguirá funcionando
- Android/iOS mantendrán la programación activa

### Interacción del Usuario
- Al tocar la notificación, abre la app en la pantalla principal (Home)
- Puede navegar al mercado de jugadores desde ahí

## Notas Técnicas

### RepeatFrequency.DAILY
```typescript
repeatFrequency: RepeatFrequency.DAILY
```
- Programa la notificación para repetirse cada 24 horas
- Notifee maneja automáticamente la reprogramación
- Funciona incluso si la app está cerrada

### Timestamp Calculation
```typescript
const nextMidnight = new Date();
if (now.getHours() >= 0 && now.getMinutes() > 0) {
  nextMidnight.setDate(now.getDate() + 1);
}
nextMidnight.setHours(0, 0, 0, 0);
```
- Si ya pasó la medianoche del día actual, programa para mañana
- Asegura que siempre haya una notificación programada

## Troubleshooting

### La notificación no aparece
1. ✅ Verificar permisos: `Configuración > Apps > DreamLeague > Notificaciones`
2. ✅ Revisar logs: `npx react-native log-android` o `npx react-native log-ios`
3. ✅ Verificar que está programada: `NotificationService.checkScheduledNotifications()`
4. ✅ Probar con test: `NotificationService.testDailyMarketNotification()`

### Android 13+ no muestra notificaciones
- Android 13+ requiere permiso explícito de `POST_NOTIFICATIONS`
- Notifee lo solicita automáticamente en `requestPermission()`

### iOS no programa notificaciones locales
- Verificar que Notifee esté configurado correctamente
- Ejecutar `pod install` en la carpeta `ios/`
- Recompilar la app

## Integración Futura

### Sincronización con Backend
En el futuro, puedes sincronizar con el backend para:
- Enviar notificaciones push en lugar de locales
- Personalizar el mensaje según las ofertas reales disponibles
- Enviar solo si hay ofertas nuevas ese día

```typescript
// Ejemplo futuro
static async scheduleDailyMarketNotification(): Promise<void> {
  // Verificar si hay ofertas del día en el backend
  const hasOffers = await ApiService.checkDailyOffers();
  
  if (hasOffers) {
    // Enviar notificación push personalizada
    await this.sendPushNotification(...);
  }
}
```

## Referencias

- **Notifee Documentation**: https://notifee.app/react-native/docs/triggers
- **Firebase Messaging**: https://rnfirebase.io/messaging/usage
- **RepeatFrequency**: https://notifee.app/react-native/reference/repeatfrequency

## Changelog

- **2025-01-26**: Implementación inicial de notificación diaria a las 00:00
- **Formato**: Notificación local con Notifee
- **ID**: `daily-market-offers`
