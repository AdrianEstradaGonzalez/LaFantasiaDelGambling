# Sistema de Cálculo de Puntos en Tiempo Real

## 📋 Resumen

Este sistema calcula los puntos de los jugadores de TODAS las ligas durante la jornada cerrada (cuando los partidos están en curso). El cálculo se realiza **una sola vez por jugador**, optimizando las llamadas a la API de API-Football.

## 🏗️ Arquitectura

### Backend

1. **Script**: `backend/scripts/calculate-all-points.ts`
   - Script standalone que puede ejecutarse manualmente
   - Comando: `npm run calculate-points`

2. **Servicio**: `backend/src/services/pointsCalculation.service.ts`
   - Servicio reutilizable con la lógica de cálculo
   - Usado tanto por el script como por el endpoint admin

3. **Endpoint Admin**: `POST /admin/calculate-all-points`
   - Permite ejecutar el cálculo desde el frontend (solo admins)
   - Usa el servicio `PointsCalculationService`

4. **Lectura de datos**: `LeagueService.calculateRealTimePoints()`
   - Ya NO calcula nada
   - Solo **LEE** los datos ya calculados de `player_stats`
   - Usado por Clasificación y Mi Plantilla

### Frontend

- **Clasificación** (`Clasificacion.tsx`): 
  - Llama a `LigaService.calculateRealTimePoints()`
  - Muestra los puntos ya calculados

- **Mi Plantilla** (`MiPlantilla.tsx`):
  - Llama a `LigaService.calculateRealTimePoints()`
  - Muestra los puntos individuales de cada jugador
  - Ya NO calcula puntos individualmente

## 🔄 Flujo de Trabajo

### 1. Cálculo de Puntos (Backend)

```
Admin ejecuta → POST /admin/calculate-all-points
                    ↓
            PointsCalculationService.calculateAllPoints()
                    ↓
    ┌───────────────┴───────────────┐
    │  Para cada liga cerrada:      │
    │  1. Obtener plantillas         │
    │  2. Recopilar jugadores únicos │
    │  3. Calcular cada jugador 1 vez│
    │  4. Guardar en player_stats    │
    └───────────────┬───────────────┘
                    ↓
          Datos guardados en BD
```

### 2. Lectura de Puntos (Frontend)

```
Usuario entra a Clasificación/Mi Plantilla
                ↓
    Liga tiene jornada cerrada?
                ↓
    Sí → LigaService.calculateRealTimePoints()
                ↓
    LeagueService.calculateRealTimePoints()
    (SOLO LEE de player_stats)
                ↓
    Muestra puntos al usuario
```

## 🚀 Uso

### Opción 1: Script Manual

```bash
cd backend
npm run calculate-points
```

### Opción 2: Endpoint Admin (Recomendado)

```bash
POST http://localhost:3000/admin/calculate-all-points
Headers:
  Authorization: Bearer <admin-token>
```

### Opción 3: Automatización (Futuro)

Configurar un **cron job** para ejecutar el cálculo cada X minutos durante las jornadas:

```bash
# Ejemplo: Cada 10 minutos los fines de semana
*/10 * * * 0,6 cd /path/to/backend && npm run calculate-points
```

## 📊 Optimización

### Evita Duplicados

Si un jugador está en **múltiples plantillas**:
- ❌ Antes: Se calculaba N veces (una por plantilla)
- ✅ Ahora: Se calcula **1 sola vez** y se reutiliza

### Ejemplo

```
Liga A:
  - Usuario1 tiene a Lamine Yamal
  - Usuario2 tiene a Lamine Yamal
  - Usuario3 tiene a Lamine Yamal

Resultado:
  ✅ Lamine Yamal se calcula 1 vez
  ✅ Los 3 usuarios obtienen los mismos puntos
```

## 🔧 Configuración

### Variables de Entorno

Asegúrate de tener configurada la API key de API-Football:

```env
API_FOOTBALL_KEY=tu_api_key
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
```

## 📝 Logs

El script muestra logs detallados:

```
🚀 [PointsCalculationService] Iniciando cálculo de puntos para todas las ligas...

📊 [PointsCalculationService] Encontradas 3 ligas

🏆 [PointsCalculationService] Procesando liga: "Liga de amigos" (ID: abc123)
📅 [PointsCalculationService] Jornada actual: 15 (estado: closed)
👥 [PointsCalculationService] Encontradas 8 plantillas en esta liga
⚡ [PointsCalculationService] Total de jugadores únicos a calcular: 24

   🔄 Calculando jugador ID 154 (usado por: Juan, Pedro, María)...
   ✅ Puntos calculados para jugador ID 154
   ...

📈 [PointsCalculationService] Resumen liga "Liga de amigos":
   ✅ Calculados: 24
   ❌ Errores: 0

🎉 [PointsCalculationService] ¡Cálculo de puntos completado para todas las ligas!
📊 Resumen global:
   🏆 Ligas procesadas: 2/3
   👤 Jugadores únicos: 48
   ✅ Calculados: 48
   ❌ Errores: 0
```

## ⚠️ Consideraciones

1. **Solo jornadas cerradas**: El script solo procesa ligas con `jornadaStatus = 'closed'`
2. **11 jugadores**: Solo calcula plantillas completas (11 jugadores)
3. **Jugadores faltantes**: Si un jugador no está en BD, se carga automáticamente desde la API
4. **Errores silenciosos**: Si un jugador falla, continúa con los demás

## 🔒 Seguridad

- El endpoint `/admin/calculate-all-points` requiere:
  - ✅ Token JWT válido
  - ✅ Usuario con rol `isAdmin = true`

## 📚 Archivos Relacionados

### Backend
- `backend/scripts/calculate-all-points.ts` - Script ejecutable
- `backend/src/services/pointsCalculation.service.ts` - Servicio de cálculo
- `backend/src/services/league.service.ts` - Lectura de datos calculados
- `backend/src/controllers/admin.controller.ts` - Endpoint admin
- `backend/src/routes/admin.routes.ts` - Ruta admin

### Frontend
- `frontend/pages/liga/Clasificacion.tsx` - Vista de clasificación
- `frontend/pages/plantilla/MiPlantilla.tsx` - Vista de plantilla
- `frontend/services/LigaService.ts` - Servicio de liga
- `frontend/services/PlayerStatsService.ts` - Servicio de estadísticas

## 🎯 Próximos Pasos

1. **Automatización**: Configurar cron job para ejecutar cada 10-15 minutos
2. **Caché**: Implementar caché de resultados para reducir consultas a BD
3. **Notificaciones**: Avisar a los usuarios cuando se actualicen los puntos
4. **Dashboard Admin**: Interfaz para monitorear el estado del cálculo
