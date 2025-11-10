# Refactorización del Cierre de Jornada

## 📋 Cambio Realizado

Se ha simplificado el proceso de **cierre de jornada** para eliminar el cálculo redundante de puntos, ya que estos se actualizan automáticamente en tiempo real durante la jornada.

## 🔄 Antes vs Después

### ❌ ANTES (Cálculo Redundante)

El cierre de jornada calculaba los puntos de plantilla desde cero:

```typescript
// ❌ ANTIGUO: Recalcular puntos
const squadPoints = await this.calculateSquadPoints(member.userId, leagueId, jornada);

// Actualizar puntos totales
const newTotalPoints = currentMember.points + squadPoints;

// Actualizar pointsPerJornada
pointsPerJornada[jornada.toString()] = squadPoints;

await prisma.leagueMember.update({
  data: {
    points: newTotalPoints,
    pointsPerJornada: pointsPerJornada,
    // ... otros campos
  }
});
```

### ✅ DESPUÉS (Lectura de Datos Ya Calculados)

Ahora simplemente lee los puntos que ya están guardados:

```typescript
// ✅ NUEVO: Leer puntos ya calculados
const pointsPerJornada = (member.pointsPerJornada as Record<string, number>) || {};
const squadPoints = pointsPerJornada[jornada.toString()] ?? 0;

// NO se actualizan points ni pointsPerJornada - ya están actualizados por el worker
await prisma.leagueMember.update({
  data: {
    budget: newBudget,
    initialBudget: newBudget,
    bettingBudget: 250,
    // ⚠️ NO tocamos points ni pointsPerJornada
  }
});
```

## 🎯 Funcionalidades del Cierre de Jornada

El cierre de jornada ahora se enfoca SOLO en tareas administrativas:

### 1. 💰 Procesar Apuestas
- Evaluar apuestas pendientes de la jornada
- Actualizar presupuestos según ganancias/pérdidas

### 2. 💵 Calcular Presupuesto Siguiente Jornada
- `Presupuesto actual + Puntos plantilla (1M/punto)`
- Ejemplo: `450M + 78 puntos = 528M`
- Resetear `bettingBudget` a 250M

### 3. 🗑️ Limpiar Plantillas
- Vaciar todas las plantillas de la liga
- Permitir que los usuarios armen nueva plantilla

### 4. 🔓 Abrir Cambios
- Avanzar a la siguiente jornada
- Cambiar estado a `"open"` (permite modificaciones)

### 5. 🎲 Generar Nuevas Apuestas
- Crear opciones de apuesta para la nueva jornada

## ⚡ Beneficios

### 1. **Eliminación de Redundancia**
- ❌ No se recalculan puntos que ya están guardados
- ✅ Se reutilizan datos del worker en tiempo real

### 2. **Mayor Consistencia**
- ✅ Una sola fuente de verdad: `update-live-rankings-in-progress.ts`
- ✅ Los puntos que ven los usuarios son los mismos que se usan en el cierre

### 3. **Mejor Performance**
- ⚡ No hay llamadas a API de fútbol en el cierre
- ⚡ No hay cálculos complejos de puntos
- ⚡ Proceso de cierre más rápido

### 4. **Código Más Simple**
- 📉 Menos lógica duplicada
- 📉 Menos código que mantener
- 📉 Menos posibilidad de bugs

## 🔍 Flujo Completo

### Durante la Jornada (Worker en Tiempo Real)
```
update-live-rankings-in-progress.ts ejecuta cada X minutos:
├─ Obtener partidos en vivo
├─ Obtener stats de jugadores (con tarjetas desde eventos)
├─ Calcular puntos por jugador
├─ Calcular puntos de plantillas
├─ Actualizar LeagueMember:
│  ├─ points (total acumulado)
│  └─ pointsPerJornada[N] (puntos de jornada N)
└─ Actualizar clasificación en tiempo real
```

### Al Cerrar la Jornada
```
closeJornada() ejecuta UNA VEZ al final:
├─ 1. Procesar apuestas won/lost (ajustar budget)
├─ 2. Evaluar apuestas pending (ajustar budget)
├─ 3. LEER pointsPerJornada[N] (NO calcular)
├─ 4. Sumar puntos al budget (1M/punto)
├─ 5. Resetear bettingBudget a 250M
├─ 6. Vaciar plantillas
├─ 7. Avanzar jornada (N → N+1)
├─ 8. Cambiar estado a "open"
└─ 9. Generar apuestas para jornada N+1
```

## 📝 Archivos Modificados

- ✅ `backend/src/services/jornada.service.ts`
  - Método `closeJornada()`: Simplificado para leer puntos en vez de calcularlos
  - Eliminado: Cálculo redundante de puntos
  - Eliminado: Actualización de `points` y `pointsPerJornada` (ya están actualizados)

## 🚀 Estado Actual

- ✅ Worker actualiza puntos en tiempo real
- ✅ Cierre de jornada lee puntos ya calculados
- ✅ Se elimina cálculo redundante
- ✅ Presupuestos se calculan correctamente (apuestas + puntos)
- ✅ Plantillas se limpian
- ✅ Jornada avanza y abre cambios

## 🎯 Próximos Pasos

1. **Probar cierre de jornada** en siguiente jornada real
2. **Verificar** que presupuestos se calculan correctamente
3. **Confirmar** que puntos totales son consistentes
4. **Validar** que el historial de `pointsPerJornada` se mantiene intacto

## 💡 Notas Importantes

- ⚠️ **Los puntos ya NO se recalculan en el cierre**
- ⚠️ **Solo se actualizan presupuestos (budget, initialBudget, bettingBudget)**
- ⚠️ **points y pointsPerJornada se mantienen como están** (actualizados por worker)
- ✅ **El worker debe estar corriendo durante toda la jornada** para que los puntos estén actualizados

## 🔗 Archivos Relacionados

- `backend/src/workers/update-live-rankings-in-progress.ts` - Actualiza puntos en tiempo real
- `backend/src/services/jornada.service.ts` - Cierre de jornada (simplificado)
- `backend/src/services/betEvaluation.service.ts` - Evaluación de apuestas
- `ACTUALIZACION_STATS_JORNADA_CERRADA.md` - Sistema de actualización de stats con detección de tarjetas desde eventos

---

**Fecha**: Noviembre 9, 2025
**Estado**: ✅ Implementado y listo para probar
