# Sistema de Evaluación Global de Apuestas

## 📋 Resumen

Se ha implementado un sistema completo para **evaluar TODAS las apuestas pendientes de TODAS las ligas** del sistema, además del endpoint existente para evaluar solo una liga específica.

## ✅ Implementación Completada

### Backend

#### 1. **Servicio: `betEvaluation.service.ts`**

Se agregó el método `evaluateAllPendingBets()` que:

- ✅ Obtiene todas las ligas que tienen apuestas pendientes
- ✅ Evalúa cada liga secuencialmente (con delay de 1s entre ligas)
- ✅ Recopila estadísticas globales:
  - Total evaluadas
  - Total ganadas
  - Total perdidas
  - Total errores
  - Detalle por cada liga
- ✅ Retorna un resumen completo con métricas globales y por liga

**Exports del servicio:**
```typescript
export const BetEvaluationService = {
  evaluatePendingBets,      // Evaluar una liga específica
  evaluateAllPendingBets,   // Evaluar TODAS las ligas (NUEVO)
};
```

#### 2. **Controller: `admin.controller.ts`**

Se agregó el método `evaluateAllBets()`:

```typescript
async evaluateAllBets(req: any, res: any) {
  // Llama a BetEvaluationService.evaluateAllPendingBets()
  // Retorna resumen global con todas las métricas
}
```

#### 3. **Routes: `admin.routes.ts`**

Se agregó la nueva ruta:

```typescript
app.post("/evaluate-all-bets", { preHandler: adminAuth }, adminController.evaluateAllBets.bind(adminController));
```

**Endpoints disponibles:**
- `POST /api/admin/leagues/:leagueId/evaluate-bets` - Evaluar una liga específica
- `POST /api/admin/evaluate-all-bets` - **Evaluar TODAS las ligas (NUEVO)**

### Frontend

#### 1. **Service: `BetService.ts`**

Se agregó el método `evaluateAllBets()`:

```typescript
static async evaluateAllBets(): Promise<{
  success: boolean;
  totalEvaluated: number;
  totalWon: number;
  totalLost: number;
  totalErrors: number;
  leagues: Array<{
    leagueId: string;
    leagueName: string;
    evaluated: number;
    won: number;
    lost: number;
    errors: string[];
  }>;
  errors: string[];
  message: string;
}>
```

#### 2. **UI: `AdminPanel.tsx`**

Se agregó:

1. **Nuevo handler:** `handleEvaluarTodasLasApuestas()`
   - Muestra diálogo de confirmación con advertencia de tiempo
   - Llama a `BetService.evaluateAllBets()`
   - Muestra resumen global con detalle por liga

2. **Nuevo botón:** "🌍 Evaluar TODAS las Apuestas"
   - Ubicado después del botón de evaluación individual
   - Usa el mismo estado `isEvaluatingBets` para loading
   - Descripción: "Evalúa TODAS las apuestas pendientes de TODAS las ligas del sistema. Puede tardar varios segundos."

### Scripts de Testing

#### `backend/scripts/test-evaluate-all.ts`

Script para probar la evaluación global desde la terminal:

```bash
npx tsx scripts/test-evaluate-all.ts
```

Muestra:
- Logs detallados de cada liga
- Resumen global al final
- Lista de errores si los hay

## 🔄 Flujo de Trabajo

### Evaluación Individual (liga específica)
```
Usuario → Botón "🎯 Evaluar Apuestas" 
       → handleEvaluarApuestas() 
       → BetService.evaluateBets(leagueId)
       → POST /api/admin/leagues/:leagueId/evaluate-bets
       → BetEvaluationService.evaluatePendingBets(leagueId)
       → Resultados de UNA liga
```

### Evaluación Global (TODAS las ligas) ⭐ NUEVO
```
Usuario → Botón "🌍 Evaluar TODAS las Apuestas" 
       → handleEvaluarTodasLasApuestas() 
       → BetService.evaluateAllBets()
       → POST /api/admin/evaluate-all-bets
       → BetEvaluationService.evaluateAllPendingBets()
       → Itera sobre todas las ligas con apuestas pendientes
       → Llama a evaluatePendingBets() para cada liga
       → Delay de 1s entre ligas (protección API)
       → Resultados globales + detalle por liga
```

## 📊 Estructura de Respuesta Global

```typescript
{
  success: true,
  totalEvaluated: 15,        // Total en todas las ligas
  totalWon: 8,               // Total ganadas
  totalLost: 7,              // Total perdidas
  totalErrors: 1,            // Total errores
  leagues: [                 // Detalle por liga
    {
      leagueId: "cmg...",
      leagueName: "Liga Premium 2025",
      evaluated: 10,
      won: 6,
      lost: 4,
      errors: []
    },
    {
      leagueId: "cmh...",
      leagueName: "Liga Amigos",
      evaluated: 5,
      won: 2,
      lost: 3,
      errors: ["Error en partido 123456"]
    }
  ],
  errors: [                  // Lista completa de errores
    "Error evaluando liga X: ...",
    "Error en partido 123456: ..."
  ],
  message: "Evaluadas 15 apuestas en 2 ligas: 8 ganadas, 7 perdidas"
}
```

## 🎯 Características

### Protección API
- ✅ Delay de 500ms entre partidos (dentro de evaluatePendingBets)
- ✅ Delay de 1000ms entre ligas (en evaluateAllPendingBets)
- ✅ Manejo de errores individual por liga (una falla no detiene todo)

### Performance
- ✅ Solo busca ligas con apuestas pendientes (optimización DB)
- ✅ Evaluación secuencial para evitar saturar la API
- ✅ Logs detallados en consola para monitoreo

### UX
- ✅ Indicador de carga visual (ActivityIndicator)
- ✅ Botones deshabilitados durante evaluación
- ✅ Diálogos de confirmación informativos
- ✅ Resumen claro con métricas globales y por liga
- ✅ Advertencia de tiempo de espera

## 🧪 Testing

### Opción 1: Desde el Frontend
1. Abrir app como admin
2. Ir a "Panel de Administración"
3. Presionar "🌍 Evaluar TODAS las Apuestas"
4. Confirmar
5. Ver resultados en diálogo

### Opción 2: Desde el Backend (Script)
```bash
cd backend
npx tsx scripts/test-evaluate-all.ts
```

### Opción 3: API Directa (Postman/cURL)
```bash
curl -X POST http://localhost:3000/api/admin/evaluate-all-bets \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 📁 Archivos Modificados

### Backend
- ✅ `src/services/betEvaluation.service.ts` - Agregado `evaluateAllPendingBets()`
- ✅ `src/controllers/admin.controller.ts` - Agregado `evaluateAllBets()`
- ✅ `src/routes/admin.routes.ts` - Agregada ruta `/evaluate-all-bets`
- ✅ `scripts/test-evaluate-all.ts` - **NUEVO** Script de testing

### Frontend
- ✅ `services/BetService.ts` - Agregado `evaluateAllBets()`
- ✅ `pages/admin/AdminPanel.tsx` - Agregado handler y botón

## ✨ Mejoras Futuras Sugeridas

1. **Progreso en tiempo real**: WebSocket o polling para mostrar progreso liga por liga
2. **Evaluación en background**: Job queue (Bull/BullMQ) para no bloquear la UI
3. **Histórico de evaluaciones**: Guardar en DB cuándo se evaluaron apuestas
4. **Notificaciones**: Enviar email/push cuando termina la evaluación
5. **Filtros**: Permitir evaluar solo ligas específicas o por jornada
6. **Dry run**: Modo preview para ver qué se evaluaría sin guardar cambios

## 🔐 Seguridad

- ✅ Requiere token JWT válido
- ✅ Requiere rol de administrador (`isAdmin: true`)
- ✅ Validación de permisos en middleware `adminAuth`

---

**Estado:** ✅ Implementación completa y funcional
**Última actualización:** Octubre 2025
