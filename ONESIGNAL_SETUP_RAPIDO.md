# 🔔 Configuración OneSignal - Notificaciones Push Gratis

## ✅ VENTAJAS DE ONESIGNAL

- ✅ **100% Gratis** hasta 10,000 usuarios
- ✅ **Funciona aunque la app esté cerrada**
- ✅ **Sin Firebase** (más simple)
- ✅ **Configuración en 10 minutos**
- ✅ **Android + iOS**

---

## 📱 PASO 1: Crear Cuenta en OneSignal (2 minutos)

1. Ve a [https://onesignal.com/](https://onesignal.com/)
2. Click en **"Sign Up Free"**
3. Crea tu cuenta (email + contraseña)
4. Confirma tu email

---

## 🔧 PASO 2: Crear App en OneSignal (5 minutos)

1. En el dashboard, click **"New App/Website"**
2. Nombre: `La Fantasía del Gambling`
3. Selecciona **AMBAS plataformas**: 
   - ✅ Google Android (FCM)
   - ✅ Apple iOS (APNs)
4. Click **"Next: Configure Your Platform"**

### 2.1 Configuración Android (FCM):

Necesitas el archivo `google-services.json` que ya tienes en:
```
frontend/android/app/google-services.json
```

1. Abre ese archivo y copia el valor de `"project_id"`
2. Pégalo en OneSignal como **"Firebase Project ID"**
3. También necesitarás el **Server Key** de Firebase:
   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Selecciona tu proyecto
   - ⚙️ Project Settings → Cloud Messaging
   - Copia el **"Server Key"** (está en la sección "Cloud Messaging API (Legacy)")
   - Pégalo en OneSignal
4. Click **"Save & Continue"**

### 2.2 Configuración iOS (APNs):

Para iOS necesitas certificados de Apple. **Hay 2 opciones:**

#### Opción A: Certificado p12 (más simple)

1. Ve a [Apple Developer](https://developer.apple.com/)
2. Ve a **Certificates, Identifiers & Profiles**
3. Click **+** para crear nuevo certificado
4. Selecciona **"Apple Push Notification service SSL"**
5. Sigue los pasos para crear el certificado
6. Descarga el certificado (.cer) y ábrelo (se agrega a Keychain)
7. En Keychain Access:
   - Busca el certificado
   - Click derecho → Export
   - Guarda como `.p12`
   - Pon una contraseña (o déjala vacía)
8. En OneSignal:
   - Sube el archivo `.p12`
   - Pon la contraseña (si usaste una)
   - Selecciona **"Production"** (para App Store)
9. Click **"Save"**

#### Opción B: Auth Key (más fácil, recomendado)

1. Ve a [Apple Developer](https://developer.apple.com/)
2. Ve a **Certificates, Identifiers & Profiles** → **Keys**
3. Click **+** para crear nueva key
4. Nombre: `OneSignal Push Key`
5. Marca ✅ **"Apple Push Notifications service (APNs)"**
6. Click **"Continue"** → **"Register"**
7. Descarga el archivo `.p8` (solo se puede descargar UNA VEZ)
8. Copia:
   - **Key ID** (aparece en la página)
   - **Team ID** (en tu cuenta de Apple Developer, arriba a la derecha)
9. En OneSignal:
   - Selecciona **"Use .p8 Auth Key"**
   - Sube el archivo `.p8`
   - Pega **Key ID**
   - Pega **Team ID**
   - Selecciona **"Production"**
10. Click **"Save"**

**⚠️ IMPORTANTE:** Guarda el archivo `.p8` en un lugar seguro, solo se puede descargar una vez.

---

## 🔑 PASO 3: Obtener Credenciales (1 minuto)

En el dashboard de OneSignal:

1. Ve a **Settings** → **Keys & IDs**
2. Copia estos valores:

```
OneSignal App ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REST API Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 💻 PASO 4: Configurar Backend (2 minutos)

### Opción A: Variables de entorno (recomendado)

Abre `backend/.env` y agrega:

```env
# ─── OneSignal Push Notifications ───────────────────────────
ONESIGNAL_APP_ID=tu-app-id-aqui
ONESIGNAL_REST_API_KEY=tu-rest-api-key-aqui
```

Luego edita `backend/src/services/onesignal.service.ts` líneas 8-9:

```typescript
private static APP_ID = process.env.ONESIGNAL_APP_ID || '';
private static REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';
```

### Opción B: Hardcoded (rápido para testing)

Edita `backend/src/services/onesignal.service.ts` líneas 8-9:

```typescript
private static APP_ID = 'tu-app-id-aqui';
private static REST_API_KEY = 'tu-rest-api-key-aqui';
```

---

## 📱 PASO 5A: Configurar Frontend Android (2 minutos)

Edita `frontend/android/app/build.gradle` y agrega:

```gradle
android {
    defaultConfig {
        // ... otros configs ...
        
        // OneSignal
        manifestPlaceholders = [
            onesignal_app_id: "TU_ONESIGNAL_APP_ID_AQUI",
            onesignal_google_project_number: "REMOTE"
        ]
    }
}
```

Reemplaza `TU_ONESIGNAL_APP_ID_AQUI` con tu App ID de OneSignal.

---

## 📱 PASO 5B: Configurar Frontend iOS (3 minutos)

### 1. Agregar capacidad de Push Notifications en Xcode

```bash
cd frontend/ios
open frontend.xcworkspace  # Abre Xcode
```

En Xcode:
1. Selecciona el proyecto en el navegador izquierdo
2. Selecciona el target principal
3. Ve a **"Signing & Capabilities"**
4. Click **"+ Capability"**
5. Busca y agrega **"Push Notifications"**
6. También agrega **"Background Modes"**
   - Marca ✅ **"Remote notifications"**

### 2. Modificar AppDelegate.mm

Edita `frontend/ios/frontend/AppDelegate.mm` y agrega al inicio (después de los imports):

```objc
#import <OneSignalFramework/OneSignalFramework.h>

// ... resto del código ...

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Inicializar OneSignal
  [OneSignal initialize:@"TU_ONESIGNAL_APP_ID_AQUI" withLaunchOptions:launchOptions];
  
  // Solicitar permisos
  [OneSignal Notifications].requestPermission:^(BOOL accepted) {
    NSLog(@"User accepted notifications: %d", accepted);
  };
  
  // ... resto del código existente ...
}
```

### 3. Instalar pods

```bash
cd ios
pod install
cd ..
```

---

## 🚀 PASO 6: Inicializar OneSignal en App

Edita `frontend/App.tsx` y agrega al inicio:

```typescript
import OneSignal from 'react-native-onesignal';
import { Platform } from 'react-native';

const App = () => {
  React.useEffect(() => {
    // Inicializar OneSignal (solo Android, iOS se inicializa en AppDelegate)
    if (Platform.OS === 'android') {
      OneSignal.setAppId('TU_ONESIGNAL_APP_ID_AQUI');
    }
    
    // Solicitar permisos de notificaciones
    OneSignal.promptForPushNotificationsWithUserResponse();

    // Escuchar cuando se abre una notificación
    OneSignal.setNotificationOpenedHandler((notification) => {
      console.log('Notificación abierta:', notification);
    });

    // Resto del código...
  }, []);
  
  // ...
};
```

---

## 🧪 PASO 7: Probar (1 minuto)

### Android:

```bash
cd frontend/android
./gradlew clean
cd ..
npx react-native run-android
```

### iOS:

```bash
cd frontend/ios
pod install
cd ..
npx react-native run-ios
```

### Enviar notificación de prueba:

1. En OneSignal Dashboard → **Messages** → **New Push**
2. Título: `Prueba`
3. Mensaje: `Esto es una prueba`
4. Click **"Send"**

**Si funciona**, recibirás la notificación aunque cierres la app! 🎉

---

## 🎯 Cómo Funciona Ahora

### Admin abre jornada:
```
1. Admin hace clic en "Abrir Jornada"
2. Backend llama a NotificationService.sendToAllUsers()
3. OneSignal envía notificación push a TODOS los usuarios
4. Usuarios reciben notificación AUNQUE LA APP ESTÉ CERRADA
```

### Flujo técnico:
```typescript
// Backend (jornada.service.ts)
await NotificationService.sendToAllUsers(
  '⚽ ¡Nueva Jornada Disponible!',
  'Ya puedes hacer tus cambios y tus pronósticos para la nueva jornada'
);

// OneSignal envía push notification
// ↓
// Usuario recibe notificación aunque app esté cerrada
```

---

## 📋 Checklist Final

### Backend:
- [ ] Cuenta OneSignal creada
- [ ] App creada en OneSignal (Android + iOS)
- [ ] Firebase Server Key configurado (Android)
- [ ] Apple Push certificado configurado (iOS: .p8 o .p12)
- [ ] Credenciales copiadas (APP_ID + REST_API_KEY)
- [ ] `backend/.env` configurado con credenciales
- [ ] Backend reiniciado (`npm run dev`)

### Frontend Android:
- [ ] `frontend/android/app/build.gradle` configurado con APP_ID
- [ ] `frontend/App.tsx` inicializa OneSignal
- [ ] App recompilada (`npx react-native run-android`)
- [ ] Notificación de prueba recibida en Android

### Frontend iOS:
- [ ] Xcode: Push Notifications capability agregada
- [ ] Xcode: Background Modes → Remote notifications activado
- [ ] `ios/frontend/AppDelegate.mm` modificado
- [ ] Pods instalados (`cd ios && pod install`)
- [ ] `frontend/App.tsx` inicializa OneSignal
- [ ] App recompilada (`npx react-native run-ios`)
- [ ] Notificación de prueba recibida en iOS

---

## 🆚 Comparación Final

| Característica | Firebase | OneSignal | Notificaciones Locales |
|----------------|----------|-----------|----------------------|
| **App cerrada** | ✅ Sí | ✅ Sí | ❌ No |
| **App abierta** | ✅ Sí | ✅ Sí | ✅ Sí |
| **Configuración** | Compleja | Simple | Muy simple |
| **Costo** | Gratis | Gratis | Gratis |
| **Usuarios gratis** | 10M/mes | 10,000 | Ilimitado |

---

## 💡 Recomendación

**Usa OneSignal** porque:
- ✅ Más simple que Firebase
- ✅ Gratis para tu caso de uso
- ✅ Funciona aunque app esté cerrada
- ✅ Ya tienes el paquete instalado
- ✅ Configuración en 10 minutos

---

## 🆘 Solución de Problemas

### No recibo notificaciones:

1. **Verifica permisos en el móvil:**
   - Android: Configuración → Apps → LaFantasia → Notificaciones (activadas)

2. **Verifica logs del backend:**
   ```
   ✅ Notificación OneSignal enviada: ⚽ ¡Nueva Jornada Disponible!
   ```

3. **Verifica que OneSignal está inicializado:**
   - Abre la app
   - En logs deberías ver el Player ID de OneSignal

4. **Test desde OneSignal Dashboard:**
   - Ve a Messages → New Push
   - Envía mensaje de prueba
   - Si funciona, el problema está en el backend

### App no compila:

```bash
cd frontend/android
./gradlew clean
cd ..
rm -rf node_modules
npm install
npx react-native run-android
```

---

## 📞 Soporte

- **OneSignal Docs**: https://documentation.onesignal.com/
- **React Native Setup**: https://documentation.onesignal.com/docs/react-native-sdk-setup
