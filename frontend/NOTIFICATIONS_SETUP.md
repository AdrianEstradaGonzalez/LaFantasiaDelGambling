# Sistema de Notificaciones Push - Instalación

## 📦 Dependencias Requeridas

### 1. Instalar paquetes NPM
```bash
cd frontend
npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
```

### 2. Configuración de Firebase

#### iOS (si aplica):
```bash
cd ios
pod install
cd ..
```

#### Android:
1. Descarga el archivo `google-services.json` desde Firebase Console
2. Colócalo en `frontend/android/app/google-services.json`

3. Edita `frontend/android/build.gradle`:
```gradle
buildscript {
    dependencies {
        // ...
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

4. Edita `frontend/android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

### 3. Configuración de Permisos

#### iOS (`frontend/ios/YourApp/Info.plist`):
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

#### Android (`frontend/android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
```

## 🔧 Backend - Endpoints Necesarios

### 1. Registrar token de dispositivo
```
POST /api/notifications/register
Body: {
  userId: string,
  ligaId: string,
  fcmToken: string,
  platform: 'ios' | 'android'
}
```

### 2. Enviar notificación cuando se abre la jornada
```
POST /api/notifications/jornada-abierta
Body: {
  ligaId: string,
  jornada: number
}
```

### 3. Enviar notificación cuando se cierra la jornada
```
POST /api/notifications/jornada-cerrada
Body: {
  ligaId: string,
  jornada: number
}
```

## 📱 Tipos de Notificaciones

### 1. Jornada Abierta
- **Título**: "⚽ ¡Nueva jornada disponible!"
- **Cuerpo**: "La jornada {número} ya está abierta. ¡Haz tus apuestas!"
- **Trigger**: Cuando el backend abre una jornada

### 2. Jornada Cerrada
- **Título**: "🔒 Jornada cerrada"
- **Cuerpo**: "La jornada {número} ha finalizado. ¡Revisa tus resultados!"
- **Trigger**: Cuando el backend cierra una jornada

### 3. Recordatorio Semanal
- **Título**: "⚽ ¡Es viernes de Fantasy!"
- **Cuerpo**: "¡La nueva jornada está próxima! Revisa tus apuestas y prepara tu estrategia."
- **Trigger**: Todos los viernes a las 17:00 (local)
- **Tipo**: Notificación programada localmente

## 🚀 Uso en el Frontend

### Inicializar en App.tsx:
```typescript
import { NotificationService } from './services/NotificationService';

useEffect(() => {
  NotificationService.initialize();
}, []);
```

### Registrar token cuando el usuario inicia sesión:
```typescript
import { NotificationService } from '../services/NotificationService';

const handleLogin = async (userId: string, ligaId: string) => {
  // ... login logic
  await NotificationService.sendTokenToBackend(userId, ligaId);
};
```

## 🧪 Testing

### Probar notificación local:
```typescript
import { NotificationService } from '../services/NotificationService';

NotificationService.showLocalNotification(
  '⚽ ¡Nueva jornada disponible!',
  'La jornada 10 ya está abierta. ¡Haz tus apuestas!'
);
```

## 📋 Notas Importantes

1. **Firebase Project**: Necesitas crear un proyecto en Firebase Console
2. **APNs Certificate**: Para iOS, necesitas configurar certificados APNs
3. **Background Handlers**: Las notificaciones en segundo plano requieren configuración adicional
4. **Testing**: Usa dispositivos reales, el emulador tiene limitaciones con notificaciones

## 🔐 Seguridad

- Los tokens FCM deben almacenarse de forma segura en el backend
- Implementar rate limiting en los endpoints de notificaciones
- Validar que el usuario pertenece a la liga antes de enviar notificaciones
