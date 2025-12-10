# 🔥 Configuración Firebase para Notificaciones Push (Android + iOS)

## ✅ PASO 1: Crear Proyecto Firebase (2 minutos)

1. Ve a [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Nombre: `LaFantasiaDelGambling`
4. Desactiva Google Analytics (opcional)
5. Click **"Create project"**

---

## 📱 PASO 2: Configurar Android (5 minutos)

### 2.1 Registrar App Android en Firebase

1. En tu proyecto Firebase, click el ícono de **Android** (🤖)
2. Completa:
   - **Android package name**: `com.dreamleague`
   - **App nickname**: `La Fantasia Android`
   - **Debug SHA-1**: (opcional, para testing)
3. Click **"Register app"**

### 2.2 Descargar google-services.json

1. Click **"Download google-services.json"**
2. Guárdalo en: `frontend/android/app/google-services.json`

**⚠️ IMPORTANTE:** El archivo debe estar en `frontend/android/app/`, NO en otra carpeta.

### 2.3 Configuración ya aplicada en el código ✅

Ya he agregado:
- ✅ `com.google.gms:google-services` en `android/build.gradle`
- ✅ `apply plugin: "com.google.gms.google-services"` en `android/app/build.gradle`

---

## 🍎 PASO 3: Configurar iOS (10 minutos)

### 3.1 Registrar App iOS en Firebase

1. En Firebase Console, click el ícono de **iOS** (🍎)
2. Completa:
   - **iOS bundle ID**: Obténlo de Xcode o `Info.plist`
   - **App nickname**: `La Fantasia iOS`
   - **App Store ID**: (opcional, agregar después)
3. Click **"Register app"**

### 3.2 Descargar GoogleService-Info.plist

1. Click **"Download GoogleService-Info.plist"**
2. Guárdalo en: `frontend/ios/GoogleService-Info.plist`

### 3.3 Agregar a Xcode

```bash
cd frontend/ios
open frontend.xcworkspace
```

En Xcode:
1. Arrastra `GoogleService-Info.plist` al proyecto (carpeta `frontend`)
2. Marca ✅ **"Copy items if needed"**
3. Marca ✅ el target principal

### 3.4 Configurar Push Notifications

En Xcode:
1. Selecciona el proyecto → Target principal
2. **"Signing & Capabilities"** → Click **"+ Capability"**
3. Agrega **"Push Notifications"**
4. Agrega **"Background Modes"**
   - Marca ✅ **"Remote notifications"**

### 3.5 Certificados APNs en Firebase

**Opción A: Auth Key .p8 (Recomendado)**

1. Ve a [Apple Developer](https://developer.apple.com/) → **Keys**
2. Click **+** → Nombre: `Firebase Push Key`
3. Marca ✅ **"Apple Push Notifications service (APNs)"**
4. Click **"Continue"** → **"Register"**
5. Descarga el archivo `.p8` (⚠️ solo se puede descargar UNA VEZ)
6. Copia **Key ID** y **Team ID**

En Firebase Console:
1. Ve a **Project Settings** → **Cloud Messaging** → **iOS**
2. Sección **"APNs Authentication Key"**
3. Click **"Upload"**
4. Sube el archivo `.p8`
5. Pega **Key ID** y **Team ID**
6. Click **"Upload"**

**Opción B: Certificado .p12**

1. Crea certificado APNs en Apple Developer
2. Exporta como `.p12` desde Keychain
3. Súbelo a Firebase Console

---

## 🔑 PASO 4: Obtener Credenciales del Backend (3 minutos)

En Firebase Console:

1. Ve a **⚙️ Project Settings** → **Service Accounts**
2. Click **"Generate New Private Key"**
3. Se descargará un archivo JSON

El archivo tiene esta estructura:
```json
{
  "project_id": "tu-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com"
}
```

---

## 💻 PASO 5: Configurar Backend (2 minutos)

Abre `backend/.env` y agrega:

```env
# ─── Firebase Cloud Messaging (Notificaciones Push) ───────────
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANTE:**
- La `FIREBASE_PRIVATE_KEY` debe estar entre comillas dobles
- Los `\n` son importantes, NO los quites
- Copia exactamente como aparece en el archivo JSON

Reinicia el backend:
```bash
cd backend
npm run dev
```

Deberías ver:
```
✅ Firebase Admin SDK inicializado
```

---

## 🚀 PASO 6: Compilar y Probar

### Android:

```bash
cd frontend
npx react-native run-android
```

### iOS:

```bash
cd frontend/ios
pod install
cd ..
npx react-native run-ios
```

---

## 🧪 PASO 7: Probar Notificaciones

### Desde la App (automático):

1. Abre la app (se registra el token FCM automáticamente)
2. Como admin, abre una jornada
3. **Todos los usuarios reciben notificación** (aunque app esté cerrada)

### Desde Firebase Console (manual):

1. Ve a **Engage** → **Messaging**
2. Click **"Create your first campaign"** → **"Firebase Notification messages"**
3. Completa:
   - **Notification title**: `Prueba`
   - **Notification text**: `Esto es una prueba`
4. Click **"Next"**
5. **Target**: Select app → `La Fantasia Android` o `La Fantasia iOS`
6. Click **"Next"** → **"Review"** → **"Publish"**

Si funciona, recibirás la notificación aunque la app esté cerrada! 🎉

---

## 📋 Checklist Completo

### Firebase Console:
- [ ] Proyecto Firebase creado
- [ ] App Android registrada (`com.dreamleague`)
- [ ] `google-services.json` descargado
- [ ] App iOS registrada
- [ ] `GoogleService-Info.plist` descargado
- [ ] Certificado APNs configurado (.p8 o .p12)
- [ ] Service Account Key descargado (JSON)

### Backend:
- [ ] `backend/.env` configurado con credenciales
- [ ] Backend reiniciado
- [ ] Mensaje "✅ Firebase Admin SDK inicializado" visible

### Frontend Android:
- [ ] `google-services.json` en `frontend/android/app/`
- [ ] App recompilada
- [ ] Notificación de prueba recibida

### Frontend iOS:
- [ ] `GoogleService-Info.plist` en `frontend/ios/`
- [ ] Archivo agregado a Xcode
- [ ] Push Notifications capability agregada
- [ ] Background Modes → Remote notifications activado
- [ ] Pods instalados (`pod install`)
- [ ] App recompilada
- [ ] Notificación de prueba recibida

---

## 🎯 Cómo Funciona

### Flujo de Notificaciones:

```
1. Usuario abre la app
   ↓
2. App se registra en Firebase y obtiene FCM token
   ↓
3. Token se guarda en backend (tabla device_tokens)
   ↓
4. Admin abre jornada
   ↓
5. Backend llama a NotificationService.sendToAllUsers()
   ↓
6. Firebase envía push notification a TODOS los tokens
   ↓
7. Usuarios reciben notificación (AUNQUE APP ESTÉ CERRADA)
```

### Mensaje de la notificación:

```
⚽ ¡Nueva Jornada Disponible!
Ya puedes hacer tus cambios y tus pronósticos para la jornada X
```

---

## 🆘 Solución de Problemas

### No recibo notificaciones:

**Android:**
1. Verifica que `google-services.json` está en `frontend/android/app/`
2. Recompila: `cd frontend/android && ./gradlew clean && cd .. && npx react-native run-android`
3. Verifica logs: `adb logcat | grep FCM`

**iOS:**
1. Verifica que `GoogleService-Info.plist` está en el proyecto de Xcode
2. Verifica que Push Notifications capability está agregada
3. Verifica que el certificado APNs está configurado en Firebase
4. Recompila: `cd frontend/ios && pod install && cd .. && npx react-native run-ios`

**Backend:**
1. Verifica logs: Debe decir "✅ Firebase Admin SDK inicializado"
2. Si dice "⚠️ Firebase no configurado", revisa las variables en `.env`
3. Asegúrate de que la `FIREBASE_PRIVATE_KEY` tiene los `\n` correctos

### Error: "default app already exists"

Backend: Elimina la inicialización duplicada de Firebase.

### Los tokens no se registran:

Frontend: Verifica que `NotificationService.ts` está registrando tokens correctamente.

---

## 📊 Ventajas de Firebase

| Característica | Firebase | OneSignal | Notifee Local |
|----------------|----------|-----------|---------------|
| **App cerrada** | ✅ Sí | ✅ Sí | ❌ No |
| **Android + iOS** | ✅ Sí | ✅ Sí | ✅ Sí |
| **Configuración** | Media | Simple | Muy simple |
| **Costo** | Gratis | Gratis | Gratis |
| **Usuarios gratis** | 10M/mes | 10,000 | Ilimitado |
| **Integración** | Nativa RN | Plugin | Plugin |

---

## ✅ Resultado Final

Con Firebase configurado:

- ✅ Notificaciones viernes 17:00 (Notifee local)
- ✅ Notificaciones ofertas diarias (Notifee local)
- ✅ **Notificación cuando admin abre jornada (Firebase push, aunque app esté cerrada)**
- ✅ Funciona en Android + iOS
- ✅ Sin costo adicional

🎉 **¡Sistema completo de notificaciones funcionando!**
