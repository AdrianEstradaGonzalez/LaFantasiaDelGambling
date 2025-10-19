# ARQUITECTURA DEL SISTEMA DE ESTADÍSTICAS Y PUNTUACIÓN

## 🎯 Resumen

Este documento describe la nueva arquitectura **backend-first** del sistema de estadísticas y puntuación de jugadores en DreamLeague.

### Principios de diseño:
1. **Backend centraliza toda la lógica** - Cálculos de puntos y procesamiento de datos
2. **Frontend solo visualiza** - Consume datos ya procesados del backend
3. **Base de datos como única fuente de verdad** - Estadísticas reales almacenadas
4. **Configuración encapsulada** - Sistema de puntos en archivo centralizado

---

## 📊 Flujo de Datos

```
API-Football → Backend Service → Base de Datos → Backend API → Frontend
                    ↓
              Calcula puntos
              según config
```

### 1. **API Football** (Fuente externa)
- Proporciona estadísticas reales de partidos
- Endpoint: `/fixtures/players`

### 2. **Backend Service** (`playerStats.service.ts`)
- Consulta API Football
- Extrae estadísticas reales
- **Calcula puntos** usando `shared/pointsCalculator.ts`
- Almacena en BD (`player_stats` table)

### 3. **Base de Datos** (`PlayerStats` model)
- Almacena estadísticas reales de cada jugador por jornada
- Guarda puntos ya calculados (`totalPoints`)
- Caché en tabla `Player` (`lastJornadaPoints`, `lastJornadaNumber`)

### 4. **Backend API** (`playerStats.controller.ts`)
- Expone endpoints REST
- Retorna estadísticas + puntos calculados
- NO repite cálculos (ya están en BD)

### 5. **Frontend** (`PlayerStatsService.ts`)
- Consume datos del backend
- Formatea para UI
- **NO calcula puntos** - solo muestra

---

## 🗄️ Modelo de Base de Datos

### Tabla `player_stats`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `playerId` | Int | FK a `player` |
| `jornada` | Int | Número de jornada (1-38) |
| `season` | Int | Temporada (default: 2025) |
| `fixtureId` | Int | ID del partido en API |
| `teamId` | Int | ID del equipo |
| **`totalPoints`** | **Int** | **Puntos calculados (DreamLeague)** |
| `minutes` | Int? | Minutos jugados |
| `position` | String? | Posición en el partido |
| `rating` | String? | Valoración del jugador |
| `goals` | Int? | Goles marcados |
| `assists` | Int? | Asistencias |
| `conceded` | Int? | Goles encajados (portero) |
| `saves` | Int? | Paradas (portero) |
| `shotsOn` | Int? | Tiros a puerta |
| `passesKey` | Int? | Pases clave |
| `tacklesInterceptions` | Int? | Intercepciones |
| `duelsWon` | Int? | Duelos ganados |
| `dribblesSuccess` | Int? | Regates exitosos |
| `foulsDrawn` | Int? | Faltas recibidas |
| `yellowCards` | Int? | Tarjetas amarillas |
| `redCards` | Int? | Tarjetas rojas |
| ... | ... | Más estadísticas detalladas |

**Índices:**
- `@@unique([playerId, jornada, season])` - Una entrada por jugador/jornada/temporada
- `@@index([playerId, jornada])` - Consultas rápidas por jugador
- `@@index([jornada, season])` - Consultas rápidas por jornada

---

## 🔧 Backend Services

### `playerStats.service.ts`

#### Función principal: `getPlayerStatsForJornada()`
```typescript
async function getPlayerStatsForJornada(
  playerId: number,
  jornada: number,
  options?: { season?: number; forceRefresh?: boolean }
): Promise<PlayerStats>
```

**Flujo:**
1. Buscar en BD (si no es `forceRefresh`)
2. Si no existe → consultar API Football
3. Calcular puntos con `calculatePlayerPoints()` (shared)
4. Guardar en BD con `prisma.playerStats.upsert()`
5. Actualizar caché en tabla `Player`
6. Retornar estadísticas completas

#### Otras funciones:
- `getPlayerStatsForMultipleJornadas()` - Batch processing
- `updateAllPlayersStatsForJornada()` - Job automático post-jornada
- `extractStats()` - Normaliza datos de API

---

## 🌐 Backend API Endpoints

### 1. Obtener estadísticas de una jornada
```
GET /player-stats/:playerId/jornada/:jornada
```

**Query params:**
- `season` (opcional) - Default: 2025
- `refresh` (opcional) - Forzar recálculo

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cm5...",
    "playerId": 284,
    "jornada": 15,
    "season": 2025,
    "totalPoints": 8,
    "minutes": 90,
    "goals": 1,
    "assists": 1,
    "rating": "7.5",
    // ... más estadísticas
  }
}
```

### 2. Obtener múltiples jornadas
```
POST /player-stats/:playerId/multiple-jornadas
```

**Body:**
```json
{
  "jornadas": [13, 14, 15],
  "season": 2025,
  "refresh": false
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    { /* stats jornada 13 */ },
    { /* stats jornada 14 */ },
    { /* stats jornada 15 */ }
  ],
  "count": 3
}
```

### 3. Actualizar jornada completa (Admin)
```
POST /player-stats/update-jornada
```

**Body:**
```json
{
  "jornada": 15
}
```

**Response:**
```json
{
  "success": true,
  "message": "Estadísticas actualizadas para jornada 15",
  "data": {
    "jornada": 15,
    "totalPlayers": 500,
    "successCount": 495,
    "errorCount": 5
  }
}
```

---

## 📱 Frontend Service

### `PlayerStatsService.ts`

**Responsabilidades:**
- ✅ Hacer requests HTTP al backend
- ✅ Manejar autenticación (JWT token)
- ✅ Formatear datos para la UI
- ❌ **NO** calcular puntos
- ❌ **NO** procesar estadísticas de API

#### Métodos principales:

##### 1. `getPlayerJornadaStats()`
```typescript
async getPlayerJornadaStats(
  playerId: number,
  jornada: number,
  options?: { season?: number; refresh?: boolean }
): Promise<PlayerStats>
```

**Uso:**
```typescript
const stats = await PlayerStatsService.getPlayerJornadaStats(284, 15);
console.log(`Puntos: ${stats.totalPoints}`); // Ya calculados por backend
```

##### 2. `getPlayerMultipleJornadasStats()`
```typescript
async getPlayerMultipleJornadasStats(
  playerId: number,
  jornadas: number[],
  options?: { season?: number; refresh?: boolean }
): Promise<(PlayerStats | null)[]>
```

**Uso:**
```typescript
const stats = await PlayerStatsService.getPlayerMultipleJornadasStats(
  284,
  [13, 14, 15]
);

const totalPuntos = stats
  .filter(s => s !== null)
  .reduce((sum, s) => sum + s.totalPoints, 0);
```

##### 3. `formatStatsForDisplay()`
```typescript
formatStatsForDisplay(
  stats: PlayerStats,
  role: string
): Array<{ label: string; cantidad: number | string; puntos: string }>
```

**Uso:**
```typescript
const display = PlayerStatsService.formatStatsForDisplay(stats, 'Goalkeeper');

// Retorna:
// [
//   { label: 'Minutos jugados', cantidad: 90, puntos: '-' },
//   { label: 'Goles', cantidad: 1, puntos: '-' },
//   { label: 'Asistencias', cantidad: 2, puntos: '-' },
//   { label: 'Paradas', cantidad: 5, puntos: '-' },
//   ...
// ]
```

**Nota:** Los puntos individuales por estadística NO se muestran en el frontend. Solo se muestra el total calculado por el backend.

---

## ⚙️ Sistema de Puntuación

### Archivo de configuración: `shared/pointsConfig.ts`

Este archivo contiene **todas las reglas de puntuación**:

```typescript
// Ejemplo: Modificar puntos por asistencia
export const BASE_POINTS = {
  ASSIST: 3,  // Cambiar aquí para modificar en toda la app
  // ...
};

// Ejemplo: Modificar cada cuántos pases clave = 1 punto
export const MIDFIELDER_POINTS = {
  KEY_PASSES_PER_POINT: 2,  // Cambiar de 2 a 3, por ejemplo
  // ...
};
```

**Ubicación:** Solo en backend (`/backend/shared/pointsConfig.ts`)

**NO** existe copia en frontend - frontend nunca necesita acceder a esta configuración.

### Calculadora: `shared/pointsCalculator.ts`

Función principal:
```typescript
export function calculatePlayerPoints(
  stats: any,  // Estadísticas de API-Football
  role: Role   // 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'
): PointsResult {
  total: number;
  breakdown: PointsBreakdownEntry[];
}
```

**Ubicación:** Solo en backend

**Uso:** Invocada automáticamente por `playerStats.service.ts`

---

## 🔄 Flujo Completo de Actualización

### Escenario: Admin actualiza puntos de jornada 15

1. **Admin hace request:**
```typescript
POST /player-stats/update-jornada
{ "jornada": 15 }
```

2. **Backend itera todos los jugadores:**
```typescript
for (player of players) {
  // 1. Consultar API Football
  const fixtures = await fetchMatchdayFixtures(15);
  const playerStats = await fetchFixturePlayers(fixtureId);
  
  // 2. Calcular puntos
  const role = normalizeRole(player.position);
  const points = calculatePlayerPoints(playerStats, role);
  
  // 3. Guardar en BD
  await prisma.playerStats.upsert({
    where: { playerId_jornada_season: {...} },
    create: { totalPoints: points.total, ...stats },
  });
  
  // 4. Actualizar caché
  await prisma.player.update({
    where: { id: playerId },
    data: { lastJornadaPoints: points.total, lastJornadaNumber: 15 },
  });
}
```

3. **Frontend consulta:**
```typescript
const stats = await PlayerStatsService.getPlayerJornadaStats(284, 15);
// stats.totalPoints = 8 (ya calculado)
```

4. **UI muestra:**
```tsx
<Text>Puntos: {stats.totalPoints}</Text>
<Text>Minutos: {stats.minutes}</Text>
<Text>Goles: {stats.goals}</Text>
```

---

## 🚀 Jobs Automáticos (Futuro)

### Actualización post-jornada automática

**Implementación recomendada:**
```typescript
// backend/src/jobs/updateJornadaStats.job.ts
import cron from 'node-cron';
import { PlayerStatsService } from '../services/playerStats.service';

// Ejecutar todos los lunes a las 3am (después de jornada de fin de semana)
cron.schedule('0 3 * * 1', async () => {
  console.log('[JOB] Actualizando estadísticas de última jornada...');
  
  // Detectar última jornada
  const currentJornada = await getCurrentJornada();
  
  // Actualizar todos los jugadores
  await PlayerStatsService.updateAllPlayersStatsForJornada(currentJornada);
  
  console.log('[JOB] Actualización completada ✅');
});
```

---

## ✅ Beneficios de esta Arquitectura

### 1. **Consistencia total**
- Los puntos se calculan UNA sola vez (en backend)
- Frontend siempre muestra datos exactos de BD
- No hay riesgo de desincronización

### 2. **Performance**
- Frontend no hace cálculos pesados
- Estadísticas cached en BD
- Consultas rápidas por índices

### 3. **Mantenibilidad**
- Sistema de puntos en UN solo lugar
- Cambiar regla = editar `pointsConfig.ts`
- No código duplicado

### 4. **Auditoría**
- Todas las estadísticas históricas guardadas
- Posibilidad de recalcular puntos retroactivamente
- Trazabilidad completa

### 5. **Escalabilidad**
- Jobs automáticos en segundo plano
- Rate limiting centralizado
- Caché inteligente

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Mostrar estadísticas de un jugador en una jornada

**Frontend (PlayerDetail.tsx):**
```typescript
import { PlayerStatsService } from '../../services/PlayerStatsService';

// Obtener estadísticas
const stats = await PlayerStatsService.getPlayerJornadaStats(player.id, 15);

// Mostrar puntos (ya calculados)
<Text style={styles.points}>{stats.totalPoints} pts</Text>

// Formatear detalles
const display = PlayerStatsService.formatStatsForDisplay(stats, player.position);

{display.map(item => (
  <View key={item.label}>
    <Text>{item.label}: {item.cantidad}</Text>
  </View>
))}
```

### Ejemplo 2: Calcular puntos totales de últimas 3 jornadas

**Frontend:**
```typescript
const jornadas = [13, 14, 15];
const statsArray = await PlayerStatsService.getPlayerMultipleJornadasStats(
  player.id,
  jornadas
);

const totalPuntos = statsArray
  .filter(s => s !== null)
  .reduce((sum, s) => sum + s.totalPoints, 0);

console.log(`Total últimas 3 jornadas: ${totalPuntos} puntos`);
```

### Ejemplo 3: Admin actualiza puntos después de jornada

**Admin Panel:**
```typescript
const handleUpdateJornada = async () => {
  try {
    const result = await fetch(`${API_URL}/player-stats/update-jornada`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ jornada: 15 }),
    });

    const data = await result.json();
    console.log(`✅ ${data.data.successCount} jugadores actualizados`);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 🔍 Troubleshooting

### Problema: "Puntos no se actualizan"

**Solución:**
1. Verificar que el backend haya ejecutado el cálculo
2. Revisar tabla `player_stats` en BD:
```sql
SELECT * FROM player_stats WHERE "playerId" = 284 AND jornada = 15;
```
3. Si no existe, forzar refresh:
```typescript
const stats = await PlayerStatsService.getPlayerJornadaStats(
  284, 
  15, 
  { refresh: true }  // Forzar recálculo
);
```

### Problema: "Puntos diferentes entre frontend y backend"

**Solución:**
- Este problema NO puede ocurrir en la nueva arquitectura
- Frontend NUNCA calcula puntos
- Si ocurre, revisar que NO existan imports a `pointsCalculator` en frontend

### Problema: "API Football rate limit"

**Solución:**
1. Configurar delays en `.env`:
```
FOOTBALL_API_DELAY_MS=500
```
2. Usar endpoint batch para múltiples jornadas
3. Implementar sistema de cola con Bull/BullMQ

---

## 📚 Referencias

- **Prisma Schema:** `backend/prisma/schema.prisma`
- **Backend Service:** `backend/src/services/playerStats.service.ts`
- **Backend Controller:** `backend/src/controllers/playerStats.controller.ts`
- **Backend Routes:** `backend/src/routes/playerStats.routes.ts`
- **Frontend Service:** `frontend/services/PlayerStatsService.ts`
- **Points Config:** `backend/shared/pointsConfig.ts` (¡NO en frontend!)
- **Points Calculator:** `backend/shared/pointsCalculator.ts` (¡NO en frontend!)

---

## 🎨 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      API FOOTBALL                           │
│                   (Estadísticas reales)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND SERVICE                            │
│           playerStats.service.ts                            │
│                                                             │
│  1. Consulta API Football                                   │
│  2. Extrae estadísticas                                     │
│  3. Calcula puntos (pointsCalculator.ts)                    │
│  4. Guarda en BD                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS                            │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  player_stats                           │               │
│  │  ─────────────────────────────────────  │               │
│  │  id, playerId, jornada, season          │               │
│  │  totalPoints ✅ (calculado)             │               │
│  │  minutes, goals, assists, ...           │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  player                                 │               │
│  │  ─────────────────────────────────────  │               │
│  │  id, name, position, teamId             │               │
│  │  lastJornadaPoints (cache)              │               │
│  │  lastJornadaNumber (cache)              │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND API                               │
│          playerStats.controller.ts                          │
│                                                             │
│  GET /player-stats/:id/jornada/:jornada                     │
│  POST /player-stats/:id/multiple-jornadas                   │
│  POST /player-stats/update-jornada (admin)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND SERVICE                           │
│           PlayerStatsService.ts                             │
│                                                             │
│  ❌ NO calcula puntos                                       │
│  ✅ Solo consume API del backend                            │
│  ✅ Formatea para UI                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    REACT NATIVE UI                          │
│          PlayerDetail.tsx, MiPlantilla.tsx                  │
│                                                             │
│  Muestra:                                                   │
│  - Puntos totales (stats.totalPoints)                       │
│  - Estadísticas (stats.goals, stats.assists, ...)          │
│  - Rating (stats.rating)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Próximos Pasos

### Fase 1: Migración (COMPLETADA ✅)
- [x] Crear tabla `PlayerStats`
- [x] Implementar `playerStats.service.ts`
- [x] Crear endpoints REST
- [x] Crear `PlayerStatsService.ts` en frontend
- [x] Documentar arquitectura

### Fase 2: Actualización de UI
- [ ] Actualizar `PlayerDetail.tsx` para usar nuevo servicio
- [ ] Actualizar `MiPlantilla.tsx` para consumir backend
- [ ] Remover `pointsCalculator` de frontend
- [ ] Remover `pointsConfig` de frontend

### Fase 3: Jobs automáticos
- [ ] Implementar job de actualización post-jornada
- [ ] Sistema de notificaciones cuando stats estén listas
- [ ] Cron job para limpiar estadísticas antiguas

### Fase 4: Optimizaciones
- [ ] Implementar Redis cache
- [ ] Optimizar queries con Prisma
- [ ] Implementar pagination para consultas masivas
- [ ] Monitoring y alertas

---

**Fecha de creación:** 2025-01-20  
**Autor:** DreamLeague Dev Team  
**Versión:** 1.0
