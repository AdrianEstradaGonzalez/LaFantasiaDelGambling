# Solución: Error Unauthorized en AdminPanel

## Problema
El `JornadaService` estaba usando la clave incorrecta para obtener el token (`'token'` en lugar de `'accessToken'`).

## Solución Aplicada
✅ Actualizado `JornadaService.ts` para usar `'accessToken'` en todos los métodos
✅ Agregado log de debug para verificar si el token existe

## Pasos para aplicar el fix:

### 1. Reiniciar la app de React Native
```bash
# En el terminal de frontend, detén y reinicia
Ctrl + C
npx react-native run-android --port 8081 --active-arch-only
```

O desde la app:
- Presiona `Ctrl + M` (emulador) o sacude el dispositivo
- Selecciona "Reload"

### 2. Si sigue dando Unauthorized:

El problema puede ser que tienes un token guardado con clave antigua. 

**Solución A: Logout y Login de nuevo**
1. Cierra sesión en la app
2. Vuelve a iniciar sesión
3. Esto guardará el token con la clave correcta `'accessToken'`

**Solución B: Limpiar AsyncStorage manualmente**

Desde React Native Debugger o Chrome DevTools:
```javascript
import EncryptedStorage from 'react-native-encrypted-storage';

// Limpiar todo (perderás la sesión)
await EncryptedStorage.clear();

// O solo el token antiguo
await EncryptedStorage.removeItem('token');
```

**Solución C: Reinstalar la app**
```bash
# Desinstalar
adb uninstall com.frontend

# Reinstalar
npx react-native run-android --port 8081 --active-arch-only
```

### 3. Verificar que funciona:

Cuando ejecutes el cambio de jornada, deberías ver en los logs:
```
🔑 JornadaService.resetAllLeagues - Token encontrado: true
```

Si ves `Token encontrado: false`, significa que no estás logueado o el token no está guardado correctamente.

## Archivos modificados:
- `frontend/services/JornadaService.ts` - Todos los métodos ahora usan `'accessToken'`
- Backend ya estaba bien configurado

## Notas adicionales:
- El backend espera el header: `Authorization: Bearer <token>`
- El token se guarda con la clave `'accessToken'` en EncryptedStorage
- Todos los demás servicios (BetService, SquadService, etc.) ya usaban la clave correcta
