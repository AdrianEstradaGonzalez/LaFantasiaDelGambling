# ✅ Checklist de Configuración Firebase

Marca cada paso conforme lo completes:

## 🌐 Firebase Console

- [ ] 1. Ir a https://console.firebase.google.com/
- [ ] 2. Crear nuevo proyecto "LaFantasiaDelGambling"
- [ ] 3. Agregar app Android
- [ ] 4. Descargar `google-services.json`
- [ ] 5. Copiar `google-services.json` a `frontend/android/app/`
- [ ] 6. Ir a Configuración > Service Accounts
- [ ] 7. Generar nueva clave privada
- [ ] 8. Renombrar archivo a `firebase-service-account.json`
- [ ] 9. Copiar `firebase-service-account.json` a `backend/`

## 📱 Configuración Android

- [ ] 10. Editar `frontend/android/build.gradle`
      - Agregar: `classpath("com.google.gms:google-services:4.4.0")`
- [ ] 11. Editar `frontend/android/app/build.gradle`
      - Agregar al final: `apply plugin: 'com.google.gms.google-services'`
- [ ] 12. Editar `frontend/android/app/src/main/AndroidManifest.xml`
      - Agregar permisos de notificaciones
      - Agregar servicio de Notifee

## 🔧 Backend

- [ ] 13. Instalar dependencia:
      ```
      cd backend
      npm install firebase-admin
      ```
- [ ] 14. Crear migración:
      ```
      npx prisma migrate dev --name add_device_tokens
      ```
- [ ] 15. Generar cliente Prisma:
      ```
      npx prisma generate
      ```
- [ ] 16. Agregar rutas de notificaciones en app.ts

## 📦 Frontend

- [ ] 17. Instalar dependencias:
      ```
      cd frontend
      npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
      ```
- [ ] 18. Rebuild Android:
      ```
      cd android
      ./gradlew clean
      cd ..
      npx react-native run-android
      ```

## 🧪 Verificación

- [ ] 19. Backend arranca sin errores (ver: "✅ Firebase Admin SDK inicializado")
- [ ] 20. Frontend arranca sin errores
- [ ] 21. Ver en logs del móvil: "✅ Permisos de notificaciones otorgados"
- [ ] 22. Ver en logs del móvil: "📱 FCM Token: ..."

## 🎯 Prueba Final

- [ ] 23. Enviar notificación de prueba desde backend
- [ ] 24. Verificar que llega al móvil

---

## 📍 Ubicación de Archivos Importantes

```
C:\LaFantasiaDelGambling\
├── backend/
│   ├── firebase-service-account.json  ← IMPORTANTE
│   └── .env  ← Variables de entorno (opcional)
│
└── frontend/
    └── android/
        ├── build.gradle  ← Modificar
        └── app/
            ├── build.gradle  ← Modificar
            ├── google-services.json  ← IMPORTANTE
            └── src/main/AndroidManifest.xml  ← Modificar
```

---

## 🆘 Si algo falla

1. Lee el error completo
2. Verifica que todos los archivos están en su lugar
3. Limpia y reconstruye:
   ```
   cd frontend/android
   ./gradlew clean
   cd ../..
   npx react-native run-android
   ```
4. Consulta `FIREBASE_CONFIGURACION_PASO_A_PASO.md` para detalles
