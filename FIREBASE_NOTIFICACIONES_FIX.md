# 🔥 Configuración Urgente de Firebase para Notificaciones

## ❌ PROBLEMA ACTUAL
Las notificaciones NO funcionan porque **Firebase Admin SDK no está configurado** en el backend.

## ✅ SOLUCIÓN RÁPIDA (5 minutos)

### 1️⃣ Obtener Credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Click en ⚙️ **Project Settings** (arriba izquierda)
4. Pestaña **Service Accounts**
5. Click en **Generate New Private Key**
6. Descarga el archivo JSON

### 2️⃣ Configurar Backend

Abre `backend/.env` y agrega estas líneas al final:

```env
# ─── Firebase Notifications ─────────────────────────────────
FIREBASE_PROJECT_ID=tu-project-id-aqui
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANTE:**
- Copia los valores del archivo JSON que descargaste
- La `FIREBASE_PRIVATE_KEY` debe estar entre comillas dobles
- Los saltos de línea `\n` son importantes, NO los quites

### 3️⃣ Reiniciar Backend

```bash
cd backend
npm run dev
```

Deberías ver en la consola:
```
✅ Firebase Admin SDK inicializado
```

---

## 📱 Frontend ya está configurado

El frontend ya tiene:
- ✅ `@react-native-firebase/app`
- ✅ `@react-native-firebase/messaging`
- ✅ `@notifee/react-native`
- ✅ `google-services.json` en Android
- ✅ Sistema de tokens funcionando

---

## 🧪 Probar que Funciona

### Opción 1: Abrir una Jornada
1. Inicia sesión como admin
2. Ve a "Abrir Jornada"
3. Todos los usuarios recibirán notificación

### Opción 2: API Manual
```bash
POST http://localhost:3000/api/notifications/test
Content-Type: application/json
Authorization: Bearer TU_TOKEN

{
  "title": "Prueba",
  "body": "Esto es una prueba de notificación"
}
```

---

## 🔍 Verificar Estado Actual

En los logs del backend verás:

**❌ Sin configurar:**
```
⚠️ Firebase no configurado. Variables de entorno faltantes.
⚠️ Firebase no inicializado. No se puede enviar notificación.
```

**✅ Configurado correctamente:**
```
✅ Firebase Admin SDK inicializado
✅ Notificación enviada exitosamente
```

---

## 📋 Checklist

- [ ] Descargar archivo JSON de Firebase Console
- [ ] Copiar valores a `.env` del backend
- [ ] Reiniciar backend (`npm run dev`)
- [ ] Ver mensaje "✅ Firebase Admin SDK inicializado"
- [ ] Probar abriendo una jornada
- [ ] Verificar que llegan las notificaciones al móvil

---

## 🆘 Si sigue sin funcionar

1. **Verifica que el usuario tenga token registrado:**
   - En la app, ve a Perfil y verifica que aparezca el token FCM

2. **Revisa los logs del backend:**
   ```bash
   cd backend
   npm run dev
   ```
   Busca mensajes de error de Firebase

3. **Verifica permisos en el móvil:**
   - Android: Configuración > Apps > LaFantasia > Notificaciones (activadas)
   - iOS: Ajustes > Notificaciones > LaFantasia (activadas)

---

## 🔐 Valores del archivo JSON de Firebase

El archivo que descargaste tiene esta estructura:
```json
{
  "type": "service_account",
  "project_id": "tu-project-id",           ← FIREBASE_PROJECT_ID
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",  ← FIREBASE_PRIVATE_KEY
  "client_email": "firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com",  ← FIREBASE_CLIENT_EMAIL
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

Copia **exactamente** esos 3 valores a tu `.env`.
