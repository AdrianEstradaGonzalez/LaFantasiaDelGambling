# 📊 SINCRONIZACIÓN DE PUNTOS J12 Y SISTEMA DE BACKUP PRE-CIERRE

## ✅ Problema Resuelto

### Situación Inicial
- **Frontend**: Mostraba puntos correctos de J12 calculados en tiempo real desde `playerStats`
- **BD**: `pointsPerJornada["12"]` tenía valores incorrectos (0 o desactualizados)
- **Riesgo**: Al cerrar la jornada sin sincronizar, se perdían los puntos correctos

### Solución Implementada
Creado script `sync-j12-points-from-realtime.ts` que:
1. Lee las plantillas de cada usuario
2. Calcula puntos usando el **mismo algoritmo** que `getAllClassifications`
3. Actualiza `pointsPerJornada["12"]` en BD
4. Recalcula `points` (total) como suma de todas las jornadas

## 🔧 Scripts Creados

### 1. `sync-j12-points-from-realtime.ts`
**Propósito**: Sincronizar puntos de J12 desde cálculo en tiempo real

**Algoritmo** (replica `league.service.ts > getAllClassifications`):
```typescript
// 1. Obtener plantilla del usuario
const squad = await prisma.squad.findUnique({
  where: { userId_leagueId: { userId, leagueId } },
  include: { players: true }
});

// 2. Si no tiene plantilla o < 11 jugadores → 0 puntos
if (!squad || squad.players.length < 11) return 0;

// 3. Obtener stats de jugadores para J12
const playerStats = await prisma.playerStats.findMany({
  where: {
    playerId: { in: playerIds },
    jornada: 12,
    season: 2025
  }
});

// 4. Sumar puntos (capitán × 2)
let sumPoints = 0;
playerStats.forEach(stats => {
  const points = stats.totalPoints || 0;
  if (stats.playerId === captainId) {
    sumPoints += points * 2; // Capitán dobla puntos
  } else {
    sumPoints += points;
  }
});

// 5. Actualizar pointsPerJornada["12"] y recalcular total
```

**Uso**:
```bash
npm run sync-j12-points
```

**Resultado**:
```
📊 Encontradas 12 ligas en J12 cerrada
✅ 27 usuarios actualizados
   - F.C.Estrada (CBO): J12 88 pts (correcto)
   - Charro (VARILLAZO): J12 0 → 64 pts
   - marcos (CBO): J12 0 → 68 pts
   ...
```

### 2. `verify-fc-estrada-points.ts`
**Propósito**: Verificar datos de FC Estrada antes y después de sincronizar

**Uso**:
```bash
npx tsx scripts/verify-fc-estrada-points.ts
```

**Output**:
```
✅ Usuario encontrado: F.C.Estrada (cmh0pf4vj0000139xm3nnazgn)
✅ Liga encontrada: CBO (cmhe4097k00518kc4tsms6h5g)
   Jornada actual: 12
   Estado: closed

📊 DATOS ACTUALES EN BASE DE DATOS:
=====================================
Total points: 190
Budget: 352
Betting budget: 250

Puntos por jornada:
  J11: 102
  J12: 88
  Total acumulado: 190

📋 VERIFICACIÓN:
================
✓ J11 = 102: ✅ OK
✓ J12 = 88: ✅ OK
✓ Total = 190: ✅ OK
```

## 💾 Backups Creados

### Backup 1: `prisma-backup-2025-11-09T23-51-24.json`
- **Fecha**: 09/11/2025 23:51
- **Estado**: Después de corregir FC Estrada manualmente
- **Contenido**: FC Estrada con J11=102, J12=88, Total=190

### Backup 2 (FINAL): `prisma-backup-2025-11-10T00-54-06.json` ✅
- **Fecha**: 10/11/2025 00:54
- **Estado**: Después de sincronizar TODOS los usuarios
- **Contenido**: 
  - 48 LeagueMembers con puntos J12 correctos
  - 27 usuarios actualizados desde tiempo real
  - Verificado: FC Estrada CBO (J11=102, J12=88, Total=190)

## 🔄 Flujo Completo de Cierre

### ANTES del Cierre (Preparación)
```bash
# 1. Sincronizar puntos J12 desde tiempo real
npm run sync-j12-points

# 2. Verificar datos (ejemplo FC Estrada)
npx tsx scripts/verify-fc-estrada-points.ts

# 3. Crear backup de seguridad
npm run backup-db
```

### DURANTE el Cierre (automático en `closeJornada`)
1. ✅ Leer `pointsPerJornada[12]` (ya sincronizado)
2. ✅ Evaluar apuestas
3. ✅ Actualizar presupuestos (+88M por 88 pts)
4. ✅ Vaciar plantillas
5. ✅ Avanzar a J13
6. ✅ Generar nuevas apuestas

### DESPUÉS del Cierre
- Usuarios pueden modificar plantillas para J13
- Los puntos de J12 quedan guardados en `pointsPerJornada["12"]`
- El total se mantiene correcto (suma J1-J12)

## 📝 Detalles Técnicos

### Estructura de `pointsPerJornada`
```json
{
  "pointsPerJornada": {
    "1": 0,
    "2": 0,
    ...
    "11": 102,
    "12": 88,  // ← Sincronizado desde tiempo real
    "13": 0,
    ...
    "38": 0
  },
  "points": 190  // ← Suma de todas las jornadas
}
```

### Cálculo en Tiempo Real (Frontend)
**Archivo**: `backend/src/services/league.service.ts`
**Función**: `getAllClassifications()`
**Condición**: Solo cuando `jornadaStatus === 'closed'`

```typescript
// Líneas 256-358
if (jornadaStatus === 'closed' && currentJornada >= 1) {
  // Calcular puntos en tiempo real para cada miembro
  const realTimePoints = await Promise.all(members.map(async (member) => {
    // 1. Obtener plantilla
    // 2. Obtener playerStats para jornada actual
    // 3. Sumar puntos (capitán × 2)
    // 4. Validar >= 11 jugadores
    return { userId, points };
  }));
  
  // Actualizar clasificación de jornada actual
  realTimePoints.forEach(({ userId, points }) => {
    classifications[currentJornada][memberIndex].points = points;
  });
  
  // Actualizar Total = histórico + actual en vivo
  classifications.Total[totalIndex].points = totalPoints;
}
```

## ⚠️ Advertencias Importantes

### 1. Siempre Sincronizar Antes de Cerrar
```bash
# ❌ INCORRECTO: Cerrar sin sincronizar
POST /jornadas/close-all

# ✅ CORRECTO: Sincronizar primero
npm run sync-j12-points  # Actualiza pointsPerJornada["12"]
npm run backup-db          # Backup de seguridad
POST /jornadas/close-all   # Cierre seguro
```

### 2. Verificar Estado de Liga
El script `sync-j12-points` **solo procesa ligas con**:
- `currentJornada: 12`
- `jornadaStatus: 'closed'` (jornada en progreso)

### 3. Plantillas Incompletas
Si un usuario tiene < 11 jugadores, sus puntos J12 = 0:
```
⚠️  Hugo: Sin plantilla, J12 = 0 pts
```

### 4. Backup Automático
Siempre ejecutar `npm run backup-db` después de sincronizar:
- Permite restaurar si hay problemas
- Guarda estado verificado de pointsPerJornada
- Incluye todas las tablas (bets, squads, etc.)

## 🎯 Casos de Uso

### Caso 1: Cierre Normal de Jornada
```bash
# Usuario admin en frontend presiona "Cerrar Jornada"
# Backend debe ejecutar automáticamente:

1. npm run sync-j12-points  # Sincronizar puntos
2. npm run backup-db          # Backup seguro
3. JornadaService.closeAllJornadas()  # Cierre
```

### Caso 2: Corrección Manual
```bash
# Si detectas puntos incorrectos:
npm run sync-j12-points
npm run backup-db

# Verificar usuario específico:
npx tsx scripts/verify-fc-estrada-points.ts
```

### Caso 3: Restauración desde Backup
```bash
# Si algo sale mal después del cierre:
npm run restore-backup -- --file=prisma-backup-2025-11-10T00-54-06.json
```

## 📊 Resumen Ejecutivo

| Aspecto | Estado | Detalles |
|---------|--------|----------|
| **Script Sincronización** | ✅ Creado | `sync-j12-points-from-realtime.ts` |
| **Algoritmo** | ✅ Validado | Replica `getAllClassifications` |
| **Backup Final** | ✅ Creado | `prisma-backup-2025-11-10T00-54-06.json` |
| **FC Estrada CBO** | ✅ Verificado | J11=102, J12=88, Total=190 |
| **Usuarios Actualizados** | ✅ 27/48 | Liga CBO: 13/17 actualizados |
| **Integración Cierre** | ⏳ Pendiente | Agregar sincronización al inicio |

## 🚀 Siguiente Paso

Modificar `jornada.service.ts > closeJornada()` para que el **PRIMER PASO** sea:

```typescript
// PASO 0: Sincronizar puntos de la jornada actual desde tiempo real
console.log(`🔄 0. Sincronizando puntos de J${jornada} desde tiempo real...`);
await this.syncCurrentJornadaPoints(leagueId, jornada);
```

Este método replicará la lógica de `sync-j12-points-from-realtime.ts` pero integrado en el servicio.

---

**Documentado por**: GitHub Copilot  
**Fecha**: 10/11/2025 01:00  
**Archivos Relacionados**:
- `backend/scripts/sync-j12-points-from-realtime.ts`
- `backend/scripts/verify-fc-estrada-points.ts`
- `backend/src/services/league.service.ts` (líneas 256-358)
- `backend/backups/prisma-backup-2025-11-10T00-54-06.json`
