# 📊 ANÁLISIS COMPLETO: Flujo de Cierre de Jornada

## ❓ Pregunta del Usuario

> Se cogen las puntuaciones que hayan hecho los jugadores de cada plantilla de cada jugador para cada liga, estas se suman al total de los puntos del jugador para la liga a la que pertenece, además se suma en millones dicha cantidad al initialBudget de la base de datos además de posteriormente sumar o restar a ese mismo initialBudget lo que salga de las apuestas, esto ocurre, ¿sí o no?

## ✅ RESPUESTA: **NO, NO OCURRE ASÍ**

### 🔴 Lo que el usuario CREE que pasa:

1. ❌ Los puntos de la plantilla se suman al `initialBudget`
2. ❌ El resultado de las apuestas se suma/resta al `initialBudget`
3. ❌ El `initialBudget` cambia cada jornada

### ✅ Lo que REALMENTE pasa:

1. ✅ Los puntos de la plantilla se suman al campo `points` (puntos totales acumulados)
2. ✅ Los puntos de la plantilla se suman al campo `budget` (NO al `initialBudget`)
3. ✅ El resultado de las apuestas se suma/resta al campo `budget` (NO al `initialBudget`)
4. ✅ El `initialBudget` **NUNCA cambia**, siempre es 500M

## 📋 Campos en la Base de Datos

```prisma
model LeagueMember {
  points        Int @default(0)     // Puntos totales acumulados (suma de todas las jornadas)
  budget        Int @default(500)   // Presupuesto actual para fichar (se resetea cada jornada)
  initialBudget Int @default(500)   // Presupuesto base FIJO (NUNCA cambia)
  bettingBudget Int @default(250)   // Presupuesto para apuestas (se resetea a 250 cada jornada)
}
```

## 🔄 Flujo REAL del Cierre de Jornada

### Ubicación: `backend/src/services/jornada.service.ts` - Método `closeJornada()`

### Paso 1: Evaluar Apuestas
```typescript
// Línea 920
const evaluations = await this.evaluateJornadaBets(jornada, leagueId);
```
- Consulta API Football para obtener resultados de partidos
- Evalúa cada apuesta: `won: true/false`
- Calcula profit:
  - Si ganó: `profit = amount × odd` (ej: 10M × 1.8 = 18M)
  - Si perdió: `profit = -amount` (ej: -10M)

### Paso 2: Calcular Balances de Apuestas
```typescript
// Línea 925
const balances = await this.calculateUserBalances(leagueId, evaluations);
```
Resultado por usuario:
```typescript
{
  userId: "123",
  totalProfit: 15,     // Suma de todos los profits (+18M - 10M + 7M = +15M)
  wonBets: 2,          // Apuestas ganadas
  lostBets: 1,         // Apuestas perdidas
  squadPoints: 0       // Todavía no calculado
}
```

### Paso 3: Calcular Puntos de Plantilla
```typescript
// Líneas 930-951
for (const member of allMembers) {
  const squadPoints = await this.calculateSquadPoints(member.userId, leagueId, jornada);
  
  const userBalance = balances.get(member.userId)!;
  userBalance.squadPoints = squadPoints;  // ✅ ASIGNAR PUNTOS
}
```

**Reglas de cálculo de puntos:**
- Si la plantilla tiene menos de 11 jugadores: **0 puntos**
- Por cada jugador, se consultan sus estadísticas de la API Football
- Se calculan puntos según `pointsCalculator.ts` (goles, asistencias, minutos, etc.)
- Se suman los puntos de los 11 jugadores

Ejemplo:
```
Jugador 1 (Portero):    8 puntos
Jugador 2 (Defensa):    6 puntos
Jugador 3 (Defensa):    5 puntos
...
Jugador 11 (Delantero): 12 puntos
-----------------------------------
TOTAL:                  85 puntos
```

### Paso 4: Actualizar Presupuestos y Puntos ⭐ **CLAVE**
```typescript
// Líneas 954-989
for (const [userId, balance] of balances) {
  const member = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId } }
  });

  if (member) {
    // ✅ FÓRMULA DEL PRESUPUESTO
    const budgetFromBets = balance.totalProfit;      // Ej: +15M
    const budgetFromSquad = balance.squadPoints;     // Ej: 85 puntos = 85M
    const newBudget = 500 + budgetFromSquad + budgetFromBets;  // 500 + 85 + 15 = 600M
    
    // ✅ FÓRMULA DE PUNTOS TOTALES
    const newTotalPoints = member.points + balance.squadPoints;  // 120 + 85 = 205
    
    // ✅ ACTUALIZACIÓN EN BASE DE DATOS
    await prisma.leagueMember.update({
      where: { leagueId_userId: { leagueId, userId } },
      data: {
        budget: newBudget,           // ✅ SE ACTUALIZA
        bettingBudget: 250,          // ✅ SE RESETEA A 250
        points: newTotalPoints,      // ✅ SE ACTUALIZA (ACUMULA)
        // initialBudget: 500        // ❌ NO SE TOCA (comentado en código)
      },
    });
  }
}
```

### Paso 5: Vaciar Plantillas
```typescript
// Líneas 992-1005
await prisma.squadPlayer.deleteMany({
  where: { squadId: squad.id }
});
```

### Paso 6: Eliminar Opciones de Apuestas
```typescript
// Líneas 1007-1013
await prisma.bet_option.deleteMany({
  where: { leagueId, jornada }
});
```

### Paso 7: Eliminar Apuestas Evaluadas
```typescript
// Líneas 1015-1021
await prisma.bet.deleteMany({
  where: {
    leagueId,
    jornada,
    status: { in: ['won', 'lost'] }
  }
});
```

### Paso 8: Avanzar Jornada
```typescript
// Líneas 1023-1030
await prisma.league.update({
  where: { id: leagueId },
  data: {
    currentJornada: nextJornada,  // jornada + 1
    jornadaStatus: 'open'
  }
});
```

## 📊 Ejemplo Completo

### Estado Inicial (Jornada 3)
```json
{
  "userId": "user123",
  "points": 120,
  "budget": 480,
  "initialBudget": 500,
  "bettingBudget": 250
}
```

### Plantilla en Jornada 3
```
11 jugadores → 85 puntos totales
```

### Apuestas en Jornada 3
```
Apuesta 1: 10M × 1.8 = ganó → +18M
Apuesta 2: 10M × 2.0 = perdió → -10M
Apuesta 3: 7M × 1.5 = ganó → +10.5M
-----------------------------------
Total profit: +18.5M
```

### Cálculo del Nuevo Presupuesto
```typescript
budgetFromBets = 18.5M
budgetFromSquad = 85M (1M por punto)
newBudget = 500 + 85 + 18.5 = 603.5M → 603M (truncado)
```

### Cálculo de Nuevos Puntos Totales
```typescript
newTotalPoints = 120 + 85 = 205 puntos
```

### Estado Final (Después de Cerrar Jornada 3)
```json
{
  "userId": "user123",
  "points": 205,           // ✅ ACUMULADO (120 + 85)
  "budget": 603,           // ✅ CALCULADO (500 + 85 + 18.5)
  "initialBudget": 500,    // ❌ SIN CAMBIOS
  "bettingBudget": 250     // ✅ RESETEADO
}
```

## 🎯 Conclusiones

### ✅ Lo que SÍ ocurre:

1. **Los puntos de plantilla se suman al campo `points`** (acumulado total)
2. **Los puntos de plantilla se convierten a millones** (1 punto = 1M)
3. **Los puntos de plantilla se suman al `budget`** (junto con la base de 500M)
4. **El resultado de apuestas se suma/resta al `budget`** (no al `initialBudget`)
5. **El `bettingBudget` se resetea a 250M** cada jornada

### ❌ Lo que NO ocurre:

1. **El `initialBudget` NO cambia nunca** (siempre es 500M)
2. **Los puntos de plantilla NO se suman al `initialBudget`**
3. **Las apuestas NO afectan al `initialBudget`**

## 📐 Fórmulas Oficiales

### Budget (Presupuesto para fichar)
```
budget = 500M (base) + squadPoints (en millones) + betProfit (en millones)
```

### Points (Puntos totales acumulados)
```
points = points_anteriores + squadPoints_jornada_actual
```

### Betting Budget (Presupuesto para apuestas)
```
bettingBudget = 250M (siempre se resetea)
```

### Initial Budget (Base fija)
```
initialBudget = 500M (NUNCA cambia)
```

## 🔍 Código Relevante

**Archivo**: `backend/src/services/jornada.service.ts`

**Líneas clave**:
- **962-965**: Cálculo del nuevo presupuesto
- **967-968**: Cálculo de puntos totales
- **970-977**: Actualización en BD (NO toca `initialBudget`)
- **978-986**: Log del proceso

**Extracto del código**:
```typescript
// Calcular nuevo presupuesto: 500 (base) + puntos plantilla + resultado apuestas
const budgetFromBets = balance.totalProfit;
const budgetFromSquad = balance.squadPoints; // 1M por punto
const newBudget = 500 + budgetFromSquad + budgetFromBets;

// Actualizar puntos totales
const newTotalPoints = member.points + balance.squadPoints;

await prisma.leagueMember.update({
  where: { leagueId_userId: { leagueId, userId } },
  data: {
    budget: newBudget,
    bettingBudget: 250, // Siempre resetear a 250
    points: newTotalPoints,
    // initialBudget NO se toca, siempre es 500
  },
});
```

## 🚨 Importante

El campo `initialBudget` existe en la base de datos pero **NUNCA** se modifica. Su propósito es mantener un registro del presupuesto inicial con el que comenzó el usuario (siempre 500M), pero no se usa en los cálculos de cierre de jornada.

El presupuesto que realmente importa y cambia es `budget`, que se recalcula cada jornada con la fórmula:
```
500M (base fija) + puntos_plantilla (en millones) + resultado_apuestas (en millones)
```

---

**Fecha de análisis**: 2025-01-20  
**Archivos analizados**:
- `backend/src/services/jornada.service.ts` (líneas 895-1045)
- `backend/prisma/schema.prisma` (líneas 53-66)
