# 📱 Notificaciones Semanales - Jueves 17:00

## 🎯 Implementación Completada

Se ha configurado el sistema de notificaciones para enviar un recordatorio **todos los jueves a las 17:00** a los usuarios.

### 📋 Mensaje de la Notificación
- **Título:** "⚽ ¡Cierre de Jornada Próximo!"
- **Cuerpo:** "Recuerda realizar tu plantilla y apuestas antes del cierre de jornada"
- **Icono:** Logo de la aplicación (ic_launcher)
- **Repetición:** Semanal (cada jueves)

---

## 📂 Archivos Modificados

### 1. **frontend/services/NotificationService.ts**
   - ✅ Cambiado de viernes → **jueves a las 17:00**
   - ✅ Actualizado mensaje de notificación
   - ✅ Configurado icono de la app en Android (smallIcon y largeIcon)
   - ✅ Añadido soporte para permisos de Android 13+
   - ✅ Mejoras en el canal de notificaciones (vibración, descripción)
   - ✅ Funciones de prueba y verificación añadidas

### 2. **frontend/App.tsx**
   - ✅ Importado y inicializado `NotificationService`
   - ✅ Se ejecuta al arrancar la app

### 3. **frontend/android/app/src/main/AndroidManifest.xml**
   - ✅ Añadidos permisos necesarios:
     - `POST_NOTIFICATIONS` (Android 13+)
     - `SCHEDULE_EXACT_ALARM` (notificaciones exactas)
     - `USE_EXACT_ALARM` (alarmas exactas)

---

## 🧪 Cómo Probar las Notificaciones

### Método 1: Prueba Inmediata (10 segundos)
Añade este código en cualquier componente (ej: en un botón de prueba):

```typescript
import { NotificationService } from '../services/NotificationService';

// En algún botón o useEffect:
NotificationService.testWeeklyNotification();
```

Esto mostrará la notificación en 10 segundos para verificar que funciona correctamente.

### Método 2: Verificar Notificaciones Programadas
```typescript
NotificationService.checkScheduledNotifications();
```

Esto imprimirá en la consola todas las notificaciones programadas con sus fechas.

### Método 3: Esperar al Próximo Jueves 17:00
La notificación se activará automáticamente cada jueves a las 17:00.

---

## 📱 Plataformas Soportadas

### ✅ Android
- Icono de la app visible en la notificación
- Canal "Actualizaciones de Liga" con alta prioridad
- Vibración configurada
- Sonido predeterminado
- Permisos configurados para Android 13+

### ✅ iOS
- Notificaciones programadas con sonido
- Icono de la app (automático en iOS)
- Permisos solicitados automáticamente

---

## 🔧 Funciones Disponibles

```typescript
// Inicializar (se hace automáticamente al arrancar la app)
await NotificationService.initialize();

// Programar notificación semanal (jueves 17:00)
await NotificationService.scheduleWeeklyNotification();

// Probar notificación (muestra en 10 segundos)
await NotificationService.testWeeklyNotification();

// Ver notificaciones programadas
await NotificationService.checkScheduledNotifications();

// Cancelar todas las notificaciones
await NotificationService.cancelAllNotifications();

// Mostrar notificación inmediata
await NotificationService.showLocalNotification(
  'Título',
  'Mensaje'
);
```

---

## 🎨 Personalización del Icono

### Android
El icono se configura automáticamente usando `ic_launcher` que es el icono de la app.

Si quieres un icono específico para notificaciones:
1. Crear icono en `android/app/src/main/res/drawable/notification_icon.png`
2. Cambiar en `NotificationService.ts`:
   ```typescript
   smallIcon: 'notification_icon',
   ```

### iOS
iOS usa automáticamente el icono de la app. No requiere configuración adicional.

---

## 📊 Flujo de la Notificación

```
1. App se inicia
   ↓
2. NotificationService.initialize()
   ↓
3. Solicitar permisos
   ↓
4. Crear canal (Android)
   ↓
5. Programar notificación semanal
   ↓
6. Calcular próximo jueves 17:00
   ↓
7. Crear trigger con RepeatFrequency.WEEKLY
   ↓
8. Notificación se muestra cada jueves 17:00
```

---

## ⚠️ Notas Importantes

1. **Permisos**: Los usuarios deben aceptar permisos de notificaciones en el primer uso
2. **Batería**: En algunos dispositivos Android, las apps en segundo plano pueden tener restricciones. Los usuarios deben desactivar "optimización de batería" para la app si quieren notificaciones garantizadas
3. **Hora Local**: La notificación usa la hora local del dispositivo (17:00 hora del usuario)
4. **Persistencia**: La notificación se re-programa automáticamente cada semana

---

## 🐛 Solución de Problemas

### La notificación no aparece
1. Verificar que los permisos están aceptados
2. Comprobar notificaciones programadas: `NotificationService.checkScheduledNotifications()`
3. Verificar que no hay optimización de batería activa
4. En Android, verificar que el canal está habilitado en ajustes del sistema

### Probar en desarrollo
```typescript
// Añadir en cualquier componente para test inmediato
import { NotificationService } from '../services/NotificationService';

useEffect(() => {
  NotificationService.testWeeklyNotification();
}, []);
```

---

## ✅ Checklist de Implementación

- [x] Servicio de notificaciones configurado
- [x] Notificación programada para jueves 17:00
- [x] Mensaje actualizado con texto correcto
- [x] Icono de la app configurado (Android e iOS)
- [x] Permisos añadidos a AndroidManifest.xml
- [x] Servicio inicializado en App.tsx
- [x] Canal de notificaciones con alta prioridad
- [x] Repetición semanal configurada
- [x] Funciones de prueba añadidas
- [x] Soporte para Android 13+ (POST_NOTIFICATIONS)

---

## 🚀 Próximos Pasos (Opcional)

1. **Backend**: Implementar notificaciones push desde el servidor para casos específicos
2. **Personalización**: Permitir al usuario elegir el día/hora del recordatorio
3. **Deep Linking**: Al tocar la notificación, llevar directamente a la pantalla de plantilla
4. **Analytics**: Trackear cuántos usuarios reciben y abren las notificaciones

---

**Última actualización:** 26 de noviembre de 2025
