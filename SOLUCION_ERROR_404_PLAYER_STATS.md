# 🔧 SOLUCIÓN: Error 404 en Player Stats Routes

## 📋 Problema Identificado

Error al acceder a detalles de jugadores:
```
Route POST:/player-stats/47353/multiple-jornadas not found
Route GET:/player-stats/47353/jornada/9 not found
```

## 🎯 Causa Raíz

El frontend estaba configurado para usar el backend en **producción** (`https://lafantasiadelgambling.onrender.com`), pero las rutas de estadísticas de jugadores (`/player-stats/*`) **NO estaban desplegadas en producción**.

### Situación:
- ✅ Rutas definidas correctamente en el código local del backend
- ✅ Backend local funcionando correctamente en `http://localhost:3000`
- ❌ Backend en producción (Render.com) **SIN las nuevas rutas**
- ❌ Frontend apuntando a producción

## ✅ Solución Aplicada

### 1. Cambio de configuración en `frontend/utils/apiConfig.ts`

**ANTES:**
```typescript
export const ApiConfig = {
  BASE_URL: BASE_PRODUCTION, // Apuntaba a producción
};
```

**DESPUÉS:**
```typescript
export const ApiConfig = {
  BASE_URL: BASE_LOCAL, // ✨ Ahora apunta a localhost para desarrollo
};
```

### 2. Backend corriendo localmente

El backend está ejecutándose en:
- `http://127.0.0.1:3000`
- `http://10.0.2.2:3000` (accesible desde emulador Android)

### 3. Logs de depuración agregados

Se agregaron logs en:
- `PlayerStatsService.ts` - Para rastrear peticiones HTTP
- `PlayerDetail.tsx` - Para rastrear el flujo de carga de datos
- `authDebug.ts` (nuevo) - Para verificar estado de autenticación

## 🚀 Próximos Pasos

### Para Desarrollo Local
✅ Ya está configurado - el frontend usa `http://10.0.2.2:3000`

### Para Desplegar a Producción

1. **Hacer commit y push de los cambios del backend:**
   ```bash
   cd backend
   git add .
   git commit -m "feat: Agregar rutas de estadísticas de jugadores (/player-stats)"
   git push origin main
   ```

2. **Actualizar el servidor en Render.com:**
   - Ir a https://render.com
   - Seleccionar el servicio del backend
   - Hacer click en "Manual Deploy" o esperar al auto-deploy
   - Verificar que el deploy incluya los archivos:
     - `backend/src/routes/playerStats.routes.ts`
     - `backend/src/controllers/playerStats.controller.ts`
     - `backend/src/services/playerStats.service.ts`

3. **Verificar que las rutas funcionen en producción:**
   ```bash
   # Test con curl (reemplaza TOKEN con tu token real)
   curl -H "Authorization: Bearer TOKEN" \
     https://lafantasiadelgambling.onrender.com/player-stats/47353/jornada/9
   ```

4. **Cambiar el frontend a producción:**
   ```typescript
   // frontend/utils/apiConfig.ts
   export const ApiConfig = {
     BASE_URL: BASE_PRODUCTION,
   };
   ```

## 🧪 Testing Local

Para verificar que todo funciona:

1. **Backend corriendo:** ✅ Ya está en `http://localhost:3000`
2. **Frontend configurado para local:** ✅ Ya está configurado
3. **Probar la app:**
   - Iniciar sesión
   - Navegar a cualquier jugador
   - Los detalles deberían cargar correctamente

## 📝 Rutas Agregadas

```typescript
// GET - Estadísticas de una jornada
GET /player-stats/:playerId/jornada/:jornada
Ejemplo: GET /player-stats/47353/jornada/9

// POST - Estadísticas de múltiples jornadas
POST /player-stats/:playerId/multiple-jornadas
Body: { jornadas: [1, 2, 3], season?: 2025, refresh?: false }

// POST - Actualizar todas las estadísticas (admin)
POST /player-stats/update-jornada
Body: { jornada: 9 }
```

## 🔍 Cómo Verificar en Producción

Una vez desplegado en Render.com, verifica:

```bash
# 1. Health check
curl https://lafantasiadelgambling.onrender.com/health

# 2. Login (obtener token)
curl -X POST https://lafantasiadelgambling.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tupassword"}'

# 3. Probar ruta de stats (con el token obtenido)
curl https://lafantasiadelgambling.onrender.com/player-stats/47353/jornada/9 \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

Si recibes respuesta exitosa (no 404), entonces las rutas están disponibles en producción.

## 📦 Archivos Modificados

### Backend (necesitan desplegarse a producción)
- ✅ `backend/src/routes/playerStats.routes.ts`
- ✅ `backend/src/controllers/playerStats.controller.ts`
- ✅ `backend/src/services/playerStats.service.ts`
- ✅ `backend/src/app.ts` (registro de rutas)

### Frontend (actualizados en local)
- ✅ `frontend/utils/apiConfig.ts` (cambio a LOCAL)
- ✅ `frontend/services/PlayerStatsService.ts` (logs agregados)
- ✅ `frontend/pages/players/PlayerDetail.tsx` (logs y validación auth)
- ✅ `frontend/utils/authDebug.ts` (nuevo)

## 🎯 Resumen

**Estado actual:**
- ✅ Todo funcionando en **LOCAL** (desarrollo)
- ❌ Pendiente desplegar a **PRODUCCIÓN**

**Para usar en producción:**
1. Deploy del backend a Render.com
2. Cambiar `apiConfig.ts` a `BASE_PRODUCTION`
3. Rebuild de la app móvil

---

**Fecha:** 20 de octubre de 2025  
**Problema:** 404 en rutas de estadísticas de jugadores  
**Solución:** Backend local + actualización pendiente en producción
