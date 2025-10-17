# Implementación de Opciones de Apuestas en Base de Datos

## ✅ COMPLETADO

### Problema Resuelto
Las opciones de apuestas se generaban aleatoriamente para cada jugador, lo que causaba que dentro de una misma liga, cada jugador viera apuestas diferentes. Esto era incorrecto ya que todos los jugadores de una liga deben ver las mismas opciones para poder apostar juntos.

### Solución Implementada

#### 1. Backend (✅ Completado)

**Servicio: `backend/src/services/betOption.service.ts`**
- `getBetOptions(leagueId, jornada)`: Recupera opciones de apuestas de la BD
- `saveBetOptions(leagueId, jornada, options[])`: Guarda opciones en la BD (elimina existentes primero)
- `hasOptions(leagueId, jornada)`: Verifica si existen opciones

**Controlador: `backend/src/controllers/betOption.controller.ts`**
- GET `/bet-options/:leagueId/:jornada`: Obtener opciones
- POST `/bet-options/:leagueId/:jornada`: Guardar opciones
- GET `/bet-options/:leagueId/:jornada/exists`: Verificar existencia

**Rutas: `backend/src/routes/betOption.routes.ts`**
- Registradas con autenticación JWT
- Integradas en `app.ts` con prefijo "/"

**Base de Datos: Tabla `bet_option`**
```prisma
model bet_option {
  id        String   @id
  leagueId  String
  jornada   Int
  matchId   Int
  homeTeam  String
  awayTeam  String
  betType   String
  betLabel  String
  odd       Float
  createdAt DateTime @default(now())

  @@index([leagueId, jornada])
}
```

#### 2. Frontend (✅ Completado)

**Servicio: `frontend/services/BetOptionService.ts`**
- Interfaz `BetOption` con todos los campos necesarios
- Métodos para interactuar con la API del backend
- Autenticación con Bearer token

**Modificación: `frontend/services/FutbolService.ts`**

Función `getApuestasProximaJornada` modificada con la siguiente lógica:

```typescript
1. Si hay ligaId:
   a. Verificar si existen opciones en BD para (ligaId, jornada)
   b. Si existen → Cargar desde BD y retornar
   c. Si NO existen → Generar opciones y guardar en BD
   
2. Si NO hay ligaId:
   - Usar caché local (EncryptedStorage) como antes
```

### Flujo de Uso

#### Primera vez que un jugador abre la pestaña de apuestas:
1. Frontend llama `getApuestasProximaJornada({ ligaId, ligaName })`
2. Backend verifica si hay opciones en BD → NO
3. Frontend genera opciones de apuestas (llama API de fútbol)
4. Frontend guarda opciones en BD vía `BetOptionService.saveBetOptions()`
5. Frontend muestra las opciones generadas

#### Siguientes jugadores de la misma liga:
1. Frontend llama `getApuestasProximaJornada({ ligaId, ligaName })`
2. Backend verifica si hay opciones en BD → SÍ
3. Backend recupera opciones vía `BetOptionService.getBetOptions()`
4. Frontend transforma y muestra las mismas opciones que el primer jugador

### Ventajas

✅ **Consistencia**: Todos los jugadores de una liga ven las mismas opciones
✅ **Diferenciación**: Cada liga tiene sus propias opciones diferentes
✅ **Persistencia**: Las opciones no cambian al recargar la app
✅ **Performance**: Reduce llamadas a la API de fútbol (solo el primer jugador genera)
✅ **Fallback**: Si falla la BD, usa caché local como respaldo

### Logs para Debugging

El sistema incluye logs detallados:
- 🔍 "Verificando opciones de apuestas en BD..."
- ✅ "Opciones encontradas en BD, recuperando..."
- ⚠️ "No hay opciones en BD, generando nuevas..."
- 💾 "Guardando X opciones en BD..."
- ❌ "Error consultando/guardando BD..."

### Testing

Para probar:
1. Crear una liga nueva
2. Primer jugador abre Apuestas → Genera y guarda en BD
3. Segundo jugador abre Apuestas → Carga desde BD
4. Verificar que ambos ven exactamente las mismas opciones
5. Crear segunda liga → Verificar que tiene opciones diferentes

### Archivos Modificados

**Backend:**
- ✅ `backend/src/services/betOption.service.ts` (NUEVO)
- ✅ `backend/src/controllers/betOption.controller.ts` (NUEVO)
- ✅ `backend/src/routes/betOption.routes.ts` (NUEVO)
- ✅ `backend/src/app.ts` (Registro de rutas)

**Frontend:**
- ✅ `frontend/services/BetOptionService.ts` (NUEVO)
- ✅ `frontend/services/FutbolService.ts` (Modificado)

### Estado: LISTO PARA PRODUCCIÓN ✅

Toda la implementación está completa y sin errores de compilación.
