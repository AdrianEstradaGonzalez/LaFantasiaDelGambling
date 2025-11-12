# 📱 Sistema de Notificaciones Push - Guía Completa

## 🎯 Funcionalidades Implementadas

1. **Notificación de Jornada Abierta**: Se envía automáticamente cuando el admin abre una nueva jornada
2. **Notificación de Jornada Cerrada**: Se envía automáticamente cuando el admin cierra una jornada
3. **Recordatorio Semanal**: Notificación local programada todos los viernes a las 17:00

---

## 📦 INSTALACIÓN

### 1. Backend - Dependencias

```bash
cd backend
npm install firebase-admin
```

### 2. Frontend - Dependencias

```bash
cd frontend
npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
```

Para iOS (si aplica):
```bash
cd ios
pod install
cd ..
```

---

## 🔧 CONFIGURACIÓN

### Backend

#### 1. Firebase Admin SDK

Crea un proyecto en [Firebase Console](https://console.firebase.google.com/):
1. Crea un nuevo proyecto
2. Ve a Project Settings > Service Accounts
3. Click en "Generate New Private Key"
4. Guarda el archivo JSON en `backend/firebase-service-account.json`

#### 2. Variables de Entorno

Añade en `backend/.env`:
```env
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=tu-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

O simplemente coloca el archivo `firebase-service-account.json` en la raíz del backend.

#### 3. Migración de Base de Datos

```bash
cd backend
npx prisma migrate dev --name add_device_tokens
npx prisma generate
```

#### 4. Registrar Rutas

En `backend/src/app.ts` o donde configures las rutas:

```typescript
import notificationRoutes from './routes/notification.routes';

// ...
app.use('/api/notifications', notificationRoutes);
```

---

### Frontend

#### 1. Configuración de Firebase

**Android:**

1. En Firebase Console, añade una app Android:
   - Package name: Lo encuentras en `android/app/build.gradle` (applicationId)
   - Descarga `google-services.json`
   - Colócalo en `android/app/google-services.json`

2. Edita `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        // ...
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

3. Edita `android/app/build.gradle` (al final del archivo):
```gradle
apply plugin: 'com.google.gms.google-services'
```

**iOS:**

1. En Firebase Console, añade una app iOS:
   - Bundle ID: Lo encuentras en Xcode
   - Descarga `GoogleService-Info.plist`
   - Arrástralo a tu proyecto en Xcode

2. Edita `ios/Podfile`:
```ruby
use_frameworks! :linkage => :static
$RNFirebaseAsStaticFramework = true
```

3. Corre:
```bash
cd ios
pod install
cd ..
```

#### 2. Permisos

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<manifest>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
    
    <application>
        <!-- ... -->
        
        <!-- Servicio para notificaciones en segundo plano -->
        <service
            android:name="com.notifee.core.ForegroundService"
            android:foregroundServiceType="dataSync" />
    </application>
</manifest>
```

**iOS** (`ios/YourApp/Info.plist`):
```xml
<dict>
    <!-- ... -->
    <key>UIBackgroundModes</key>
    <array>
        <string>remote-notification</string>
    </array>
    
    <key>FirebaseAppDelegateProxyEnabled</key>
    <false/>
</dict>
```

#### 3. Inicializar en App.tsx

```typescript
import { NotificationService } from './services/NotificationService';

function App() {
  useEffect(() => {
    // Inicializar notificaciones
    NotificationService.initialize();
  }, []);

  // ... resto del código
}
```

#### 4. Registrar Token al Login

En tu componente de login o donde manejes la autenticación:

```typescript
import { NotificationService } from '../services/NotificationService';

const handleLogin = async (email, password) => {
  const response = await AuthService.login(email, password);
  
  if (response.success) {
    // Registrar token FCM
    const userId = response.user.id;
    const ligaId = response.user.currentLigaId || 'default';
    await NotificationService.sendTokenToBackend(userId, ligaId);
  }
};
```

---

## 🚀 USO

### En el Backend

#### Cuando se Abre una Jornada

En tu función que abre jornadas (probablemente en `jornada.controller.ts`):

```typescript
import axios from 'axios';

const abrirJornada = async (ligaId: string, jornada: number) => {
  // ... lógica para abrir jornada ...
  
  // Enviar notificación
  try {
    await axios.post('http://localhost:3000/api/notifications/jornada-abierta', {
      ligaId,
      jornada
    });
  } catch (error) {
    console.error('Error al enviar notificación de jornada abierta:', error);
  }
};
```

#### Cuando se Cierra una Jornada

```typescript
const cerrarJornada = async (ligaId: string, jornada: number) => {
  // ... lógica para cerrar jornada ...
  
  // Enviar notificación
  try {
    await axios.post('http://localhost:3000/api/notifications/jornada-cerrada', {
      ligaId,
      jornada
    });
  } catch (error) {
    console.error('Error al enviar notificación de jornada cerrada:', error);
  }
};
```

---

## 🧪 TESTING

### 1. Probar Notificación Local (Frontend)

```typescript
import { NotificationService } from './services/NotificationService';

// En cualquier parte de tu app
NotificationService.showLocalNotification(
  '⚽ Prueba',
  'Esta es una notificación de prueba'
);
```

### 2. Probar Notificación desde Backend

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "tu-user-id",
    "title": "🧪 Test",
    "body": "Notificación de prueba"
  }'
```

### 3. Verificar Token Registrado

```bash
curl -X POST http://localhost:3000/api/notifications/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "ligaId": "test-liga",
    "fcmToken": "token-from-device",
    "platform": "android"
  }'
```

---

## 📋 ENDPOINTS API

### POST `/api/notifications/register`
Registrar token de dispositivo

**Body:**
```json
{
  "userId": "string",
  "ligaId": "string",
  "fcmToken": "string",
  "platform": "ios" | "android"
}
```

### POST `/api/notifications/jornada-abierta`
Enviar notificación de jornada abierta

**Body:**
```json
{
  "ligaId": "string",
  "jornada": number
}
```

### POST `/api/notifications/jornada-cerrada`
Enviar notificación de jornada cerrada

**Body:**
```json
{
  "ligaId": "string",
  "jornada": number
}
```

### POST `/api/notifications/test`
Enviar notificación de prueba

**Body:**
```json
{
  "userId": "string",
  "title": "string",
  "body": "string"
}
```

---

## 🔍 DEBUGGING

### Ver logs en tiempo real

**Android:**
```bash
npx react-native log-android
```

**iOS:**
```bash
npx react-native log-ios
```

### Verificar token FCM

```typescript
import { NotificationService } from './services/NotificationService';

const token = await NotificationService.getFCMToken();
console.log('Token FCM:', token);
```

### Ver notificaciones programadas

```typescript
import notifee from '@notifee/react-native';

const notifications = await notifee.getTriggerNotifications();
console.log('Notificaciones programadas:', notifications);
```

---

## ⚠️ NOTAS IMPORTANTES

1. **Testing en Dispositivo Real**: Las notificaciones push NO funcionan en emuladores. Usa dispositivos reales.

2. **iOS**: Requiere certificado APNs configurado en Firebase Console.

3. **Tokens Expirados**: Los tokens FCM pueden expirar. El servicio maneja esto automáticamente.

4. **Límites de Firebase**: 
   - Cuota gratuita: ~1 millón de mensajes/mes
   - Rate limit: ~500 mensajes/segundo

5. **Notificación Semanal**: Es local, no requiere backend. Se programa automáticamente al inicializar el servicio.

6. **Background/Quit State**: Las notificaciones funcionan incluso cuando la app está cerrada.

---

## 🐛 PROBLEMAS COMUNES

### "Permisos denegados"
- Verifica que el usuario haya otorgado permisos
- En Android 13+, los permisos de notificaciones son explícitos

### "No se reciben notificaciones"
- Verifica que Firebase esté correctamente configurado
- Comprueba que el token FCM esté registrado en el backend
- Revisa los logs del backend

### "Notificaciones no aparecen en iOS"
- Verifica certificado APNs en Firebase Console
- Asegúrate de tener `FirebaseAppDelegateProxyEnabled` en Info.plist

### "Error al inicializar Firebase Admin"
- Verifica las variables de entorno o el archivo de credenciales
- Comprueba los permisos del archivo JSON

---

## 📚 RECURSOS

- [React Native Firebase Docs](https://rnfirebase.io/)
- [Notifee Docs](https://notifee.app/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
