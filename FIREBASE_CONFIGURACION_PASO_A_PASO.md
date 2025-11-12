# 🔥 Configuración de Firebase - Guía Paso a Paso

## PARTE 1: Crear Proyecto en Firebase Console

### Paso 1: Ir a Firebase Console
1. Abre tu navegador y ve a: https://console.firebase.google.com/
2. Inicia sesión con tu cuenta de Google

### Paso 2: Crear Nuevo Proyecto
1. Click en **"Agregar proyecto"** o **"Add project"**
2. Nombre del proyecto: `LaFantasiaDelGambling` (o el nombre que prefieras)
3. Click en **"Continuar"**

### Paso 3: Google Analytics (Opcional)
1. Puedes **desactivar** Google Analytics si no lo necesitas
2. O dejarlo activado y seleccionar una cuenta
3. Click en **"Crear proyecto"**
4. Espera unos segundos mientras se crea el proyecto
5. Click en **"Continuar"**

---

## PARTE 2: Configurar App Android

### Paso 1: Agregar App Android
1. En la página principal del proyecto, click en el ícono de **Android** (robot verde)
2. O ve a **Configuración del proyecto** (ícono de engranaje) > **Configuración del proyecto** > **Tus apps**

### Paso 2: Registrar App
Necesitas el **Package Name** de tu app. Para encontrarlo:

**Windows (Command Prompt):**
```cmd
cd C:\LaFantasiaDelGambling\frontend\android\app
findstr "applicationId" build.gradle
```

**Resultado esperado:**
```
applicationId "com.tunombre.lafantasiadelgambling"
```

1. Copia el `applicationId` (ejemplo: `com.tunombre.lafantasiadelgambling`)
2. Pégalo en el campo **"Nombre del paquete de Android"**
3. **Nombre de la app (opcional)**: LaFantasiaDelGambling
4. **Certificado de firma SHA-1 (opcional)**: Déjalo vacío por ahora
5. Click en **"Registrar app"**

### Paso 3: Descargar google-services.json
1. Click en **"Descargar google-services.json"**
2. Guarda el archivo descargado
3. **IMPORTANTE**: Mueve este archivo a:
   ```
   C:\LaFantasiaDelGambling\frontend\android\app\google-services.json
   ```

### Paso 4: Agregar SDK de Firebase
Firebase te mostrará código para agregar. Ya lo haremos manualmente:

1. Click en **"Siguiente"**
2. Click en **"Siguiente"** de nuevo
3. Click en **"Ir a la consola"**

---

## PARTE 3: Configurar App iOS (Si aplica)

### Paso 1: Agregar App iOS
1. En la consola de Firebase, click en el ícono de **iOS** (manzana)

### Paso 2: Registrar App
Necesitas el **Bundle ID**. Si tienes Xcode:

1. Abre: `C:\LaFantasiaDelGambling\frontend\ios\tuapp.xcworkspace` en Xcode
2. Selecciona el proyecto en el navegador
3. En la pestaña **General**, busca **Bundle Identifier**

O busca en el archivo Info.plist:
```bash
cd C:\LaFantasiaDelGambling\frontend\ios\tuapp
type Info.plist | findstr "CFBundleIdentifier"
```

1. Copia el Bundle ID (ejemplo: `com.tunombre.lafantasiadelgambling`)
2. Pégalo en el campo **"ID del paquete de iOS"**
3. Click en **"Registrar app"**

### Paso 3: Descargar GoogleService-Info.plist
1. Click en **"Descargar GoogleService-Info.plist"**
2. Guarda el archivo
3. **IMPORTANTE**: Arrastra este archivo a Xcode en la raíz de tu proyecto
4. Asegúrate de marcar **"Copy items if needed"**

---

## PARTE 4: Habilitar Firebase Cloud Messaging (FCM)

### Paso 1: Ir a Cloud Messaging
1. En la consola de Firebase, menú lateral izquierdo
2. Click en **"Messaging"** o busca **"Cloud Messaging"**
3. Verás que ya está habilitado automáticamente

### Paso 2: Obtener Server Key (Para backend)
1. Ve a **Configuración del proyecto** (ícono de engranaje arriba)
2. Pestaña **"Cloud Messaging"**
3. Busca **"Server key"** (debajo de Cloud Messaging API)
4. **IMPORTANTE**: Copia esta clave, la necesitarás después

---

## PARTE 5: Configurar Service Account (Para Backend)

### Paso 1: Ir a Service Accounts
1. En Firebase Console, click en el ícono de **engranaje** (arriba izquierda)
2. Click en **"Configuración del proyecto"** / **"Project settings"**
3. Ve a la pestaña **"Cuentas de servicio"** / **"Service accounts"**

### Paso 2: Generar Nueva Clave Privada
1. Scroll hacia abajo hasta ver **"SDK Admin de Firebase"**
2. Selecciona **Node.js** como lenguaje
3. Click en **"Generar nueva clave privada"**
4. Aparecerá un popup de confirmación, click en **"Generar clave"**
5. Se descargará un archivo JSON (ejemplo: `lafantasiadelgambling-firebase-adminsdk-abc123.json`)

### Paso 3: Guardar el Archivo
1. **IMPORTANTE**: Renombra el archivo a `firebase-service-account.json`
2. Muévelo a: `C:\LaFantasiaDelGambling\backend\firebase-service-account.json`
3. **NUNCA** subas este archivo a Git (ya está en .gitignore)

---

## PARTE 6: Configurar Variables de Entorno (Backend)

### Opción A: Usar el archivo JSON directamente (MÁS FÁCIL)

El archivo `firebase-service-account.json` ya contiene toda la información necesaria.
El código del backend lo detectará automáticamente.

**No necesitas hacer nada más para desarrollo local.**

### Opción B: Usar Variables de Entorno (Para producción)

Abre el archivo JSON que descargaste y verás algo así:
```json
{
  "type": "service_account",
  "project_id": "lafantasiadelgambling-abc123",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-abc123@lafantasiadelgambling.iam.gserviceaccount.com",
  ...
}
```

Crea o edita el archivo `C:\LaFantasiaDelGambling\backend\.env`:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=lafantasiadelgambling-abc123
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@lafantasiadelgambling.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANTE**: 
- La `FIREBASE_PRIVATE_KEY` debe estar entre comillas dobles
- Mantén los `\n` para los saltos de línea
- Copia todo el contenido del campo `private_key` del JSON

---

## PARTE 7: Configurar Archivos del Proyecto Android

### Paso 1: Verificar google-services.json
1. Asegúrate de que el archivo está en:
   ```
   C:\LaFantasiaDelGambling\frontend\android\app\google-services.json
   ```

### Paso 2: Editar android/build.gradle
Abre: `C:\LaFantasiaDelGambling\frontend\android\build.gradle`

Busca la sección `buildscript` > `dependencies` y agrega:
```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        // ... otras configuraciones
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("com.google.gms:google-services:4.4.0")  // ← AÑADIR ESTA LÍNEA
    }
}
```

### Paso 3: Editar android/app/build.gradle
Abre: `C:\LaFantasiaDelGambling\frontend\android\app\build.gradle`

**Al final del archivo**, después de todo, añade:
```gradle
apply plugin: 'com.google.gms.google-services'
```

### Paso 4: Editar AndroidManifest.xml
Abre: `C:\LaFantasiaDelGambling\frontend\android\app\src\main\AndroidManifest.xml`

Dentro de `<manifest>` pero antes de `<application>`, añade:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
```

Dentro de `<application>`, añade:
```xml
<service
    android:name="com.notifee.core.ForegroundService"
    android:foregroundServiceType="dataSync" />
```

---

## PARTE 8: Verificar Instalación

### Backend
```cmd
cd C:\LaFantasiaDelGambling\backend
npm run dev
```

Busca en los logs:
```
✅ Firebase Admin SDK inicializado
```

Si ves esto, ¡Firebase está configurado correctamente en el backend!

### Frontend
```cmd
cd C:\LaFantasiaDelGambling\frontend
npx react-native run-android
```

Abre la app y busca en los logs:
```
✅ Permisos de notificaciones otorgados
📱 FCM Token: ...
```

---

## 🎯 RESUMEN DE ARCHIVOS

Después de completar todos los pasos, deberías tener:

### Frontend:
- ✅ `frontend/android/app/google-services.json`
- ✅ `frontend/ios/GoogleService-Info.plist` (si tienes iOS)
- ✅ `frontend/android/build.gradle` (modificado)
- ✅ `frontend/android/app/build.gradle` (modificado)
- ✅ `frontend/android/app/src/main/AndroidManifest.xml` (modificado)

### Backend:
- ✅ `backend/firebase-service-account.json`
- ✅ `backend/.env` (con variables de Firebase)

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### "Cannot find module firebase-admin"
```cmd
cd backend
npm install firebase-admin
```

### "Cannot find module @react-native-firebase"
```cmd
cd frontend
npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
```

### "Google Services plugin not found"
Verifica que agregaste la línea en `android/build.gradle`:
```gradle
classpath("com.google.gms:google-services:4.4.0")
```

### "Firebase not configured"
Verifica que el archivo `firebase-service-account.json` esté en la carpeta `backend/`

---

## 📞 SIGUIENTE PASO

Una vez completada la configuración:

1. Ejecuta la migración de base de datos:
```cmd
cd backend
npx prisma migrate dev --name add_device_tokens
npx prisma generate
```

2. Reinicia el backend:
```cmd
npm run dev
```

3. Reinicia la app móvil:
```cmd
cd frontend
npx react-native run-android
```

4. Prueba enviando una notificación de prueba (ver NOTIFICACIONES_GUIA_COMPLETA.md)

¡Listo! 🎉
