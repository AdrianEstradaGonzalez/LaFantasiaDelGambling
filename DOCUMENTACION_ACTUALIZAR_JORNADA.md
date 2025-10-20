# Documentación Completa: Proceso "Abrir Cambios" (Actualizar Jornada)

## 🎯 Resumen Ejecutivo

**Botón:** "Abrir Cambios" en AdminPanel
**Función Backend:** `closeAllJornadas()` → `closeJornada()` por cada liga
**Duración:** 2-3 minutos por liga
**Propósito:** Cerrar jornada actual, evaluar apuestas, calcular puntos, actualizar presupuestos y avanzar a siguiente jornada

---

## 🔄 Flujo Completo de Ejecución

```
Admin presiona "Abrir Cambios"
         ↓
[FRONTEND] Muestra confirmación
         ↓
[FRONTEND] setIsOpeningJornada(true)
         ↓
[BACKEND] JornadaService.closeAllJornadas()
         ↓
[BACKEND] Para cada liga → closeJornada(leagueId)
         ↓
[BACKEND] 8 pasos de procesamiento
         ↓
[FRONTEND] Recibe resultado con estadísticas
         ↓
[FRONTEND] setJornadaStatus('open')
         ↓
[FRONTEND] Muestra alert de éxito
```

---

## 📋 PASO A PASO DETALLADO

### **PASO 1: Evaluar Apuestas de la Jornada** 📊

**Código:** `evaluateJornadaBets(jornada, leagueId)`

**¿Qué hace?**

1. Busca TODAS las apuestas con `status: 'pending'` de la liga
2. Para cada apuesta:
   - Llama a API-Football para obtener estadísticas reales del partido
   - Verifica que el partido haya terminado (status: FT, AET, PEN)
   - Compara predicción vs resultado real según tipo de apuesta
   - Calcula ganancia/pérdida
   - Actualiza status a `'won'` o `'lost'`

**Tipos de apuesta evaluados:**

| Tipo | Evaluación |
|------|------------|
| **Goles totales** | Compara total de goles reales vs "Más/Menos X goles" |
| **Córners** | Compara total de córners reales vs "Más/Menos X córners" |
| **Tarjetas** | Compara total de tarjetas reales vs "Más/Menos X tarjetas" |
| **Ambos marcan** | Verifica si ambos equipos marcaron goles |
| **Par/Impar** | Verifica si el total de goles es par o impar |
| **Resultado** | Compara resultado final vs predicción (Local/Empate/Visitante) |

**Cálculo de ganancia:**

```typescript
if (apuesta_ganada) {
  profit = amount × odd
  // Ejemplo: 10M × 1.8 = +18M (lo que se gana)
} else {
  profit = -amount
  // Ejemplo: -10M (lo que se pierde)
}
```

**Actualización en BD:**

```sql
UPDATE bet 
SET status = 'won' -- o 'lost'
WHERE id = betId;
```

**Resultado:**

```typescript
[
  { betId: 'bet1', won: true, profit: 18 },   // Ganó 18M (10M × 1.8)
  { betId: 'bet2', won: true, profit: 27 },   // Ganó 27M (15M × 1.8)
  { betId: 'bet3', won: false, profit: -10 }, // Perdió 10M
  { betId: 'bet4', won: false, profit: -15 }, // Perdió 15M
]
```

**Log de consola:**

```
📊 1. Evaluando apuestas de jornada 8...
  ✅ Apuesta bet1: Goles totales - Más de 2.5 goles (10M × 1.8) = +18M
  ✅ Apuesta bet2: Ambos marcan - Sí (15M × 1.8) = +27M
  ❌ Apuesta bet3: Córners - Más de 9.5 (10M × 2.0) = -10M
  ❌ Apuesta bet4: Resultado - Local (15M × 2.5) = -15M
✅ 4 apuestas evaluadas
```

---

### **PASO 2: Calcular Balances de Apuestas por Usuario** 💰

**Código:** `calculateUserBalances(leagueId, evaluations)`

**¿Qué hace?**

1. Agrupa las evaluaciones por usuario
2. Para cada usuario calcula:
   - **totalProfit:** Suma de todas las ganancias/pérdidas
   - **wonBets:** Cantidad de apuestas ganadas
   - **lostBets:** Cantidad de apuestas perdidas

**Ejemplo:**

```typescript
Usuario: Rubén (userId: 'user1')
- Apuesta #1: +18M (ganada: 10M × 1.8)
- Apuesta #2: +27M (ganada: 15M × 1.8)
- Apuesta #3: -10M (perdida)

Balance:
  totalProfit: 18 + 27 - 10 = +35M
  wonBets: 2
  lostBets: 1
```

**Resultado:**

```typescript
Map {
  'user1' => { 
    userId: 'user1', 
    totalProfit: 35,    // +35M en total
    wonBets: 2,         // Ganó 2
    lostBets: 1,        // Perdió 1
    squadPoints: 0      // Se calcula en siguiente paso
  },
  'user2' => { 
    userId: 'user2', 
    totalProfit: -5,    // -5M en total
    wonBets: 1,         // Ganó 1
    lostBets: 2,        // Perdió 2
    squadPoints: 0 
  }
}
```

**Log de consola:**

```
💰 2. Calculando balances de apuestas...
✅ Balances calculados para 2 usuarios
```

---

### **PASO 3: Calcular Puntos de Plantilla** ⚽

**Código:** `calculateSquadPoints(userId, leagueId, jornada)`

**¿Qué hace?**

1. Obtiene la plantilla del usuario (11 jugadores)
2. Para cada jugador:
   - Busca sus estadísticas reales en la tabla `player_stats` para esa jornada
   - Si no las encuentra en BD, las calcula desde la API
   - Aplica el sistema de puntuación
3. Suma los puntos de todos los jugadores

**Sistema de Puntuación:**

```typescript
PUNTOS BASE (por jugar):
- Portero: 5 puntos
- Defensa: 5 puntos
- Centrocampista: 5 puntos
- Delantero: 5 puntos

BONIFICACIONES:
+ Gol: +5 puntos
+ Asistencia: +3 puntos
+ Portería a cero (Portero/Defensa): +5 puntos
+ MVP del partido: +3 puntos

PENALIZACIONES:
- Tarjeta amarilla: -1 punto
- Tarjeta roja: -3 puntos
```

**Ejemplo de Plantilla:**

```
PLANTILLA DE RUBÉN (Jornada 8):

PORTERO:
- Courtois (Real Madrid): 5 base + 5 portería cero + 3 MVP = 13 pts

DEFENSAS:
- Hermoso (Atlético): 5 base + 5 portería cero = 10 pts
- Gayá (Valencia): 5 base - 1 amarilla = 4 pts
- Blind (Girona): 5 base = 5 pts
- Mingueza (Celta): 5 base + 1 gol + 3 asistencia = 9 pts

CENTROCAMPISTAS:
- De Jong (Barcelona): 5 base + 1 gol = 6 pts
- Kroos (Real Madrid): 5 base + 2 asistencias = 11 pts
- Parejo (Villarreal): 5 base + 1 asistencia = 8 pts

DELANTEROS:
- Lewandowski (Barcelona): 5 base + 2 goles = 15 pts
- Morata (Atlético): 5 base + 1 gol + 1 asistencia = 9 pts
- Gerard Moreno (Villarreal): 5 base = 5 pts

TOTAL: 95 puntos
```

**Actualización del balance:**

```typescript
userBalance.squadPoints = 95; // Puntos calculados
```

**Resultado:**

```typescript
Map {
  'user1' => { 
    userId: 'user1', 
    totalProfit: 35,
    wonBets: 2,
    lostBets: 1,
    squadPoints: 95  // ← ACTUALIZADO
  },
  'user2' => { 
    userId: 'user2', 
    totalProfit: -5,
    wonBets: 1,
    lostBets: 2,
    squadPoints: 78  // ← ACTUALIZADO
  }
}
```

**Log de consola:**

```
⚽ 3. Calculando puntos de plantilla...
✅ Puntos de plantilla calculados
```

---

### **PASO 4: Actualizar Presupuestos y Puntos Totales** 💵

**Código:** `prisma.leagueMember.update(...)`

**¿Qué hace?**

Para cada usuario de la liga:

1. Calcula nuevo presupuesto con la fórmula:
   ```
   Nuevo Presupuesto = 500M + Puntos Plantilla + Resultado Apuestas
   ```

2. Actualiza puntos totales (acumulado de todas las jornadas):
   ```
   Puntos Totales = Puntos Anteriores + Puntos de esta Jornada
   ```

3. Resetea presupuesto de apuestas a 250M

4. Actualiza en la tabla `leagueMember`

**Ejemplo Completo: Usuario Rubén**

```typescript
ANTES DEL CIERRE:
- budget: 580M
- points: 320 pts
- bettingBudget: 85M (ya gastó 165M de 250M en apuestas)

CÁLCULOS:
Base: 500M
Puntos plantilla: 95 pts × 1M = +95M
Resultado apuestas: +35M (18M + 27M - 10M)

Nuevo presupuesto = 500 + 95 + 35 = 630M
Nuevos puntos = 320 + 95 = 415 pts
Betting budget = 250M (reseteo)

DESPUÉS DEL CIERRE:
- budget: 630M ← ACTUALIZADO
- points: 415 pts ← ACTUALIZADO
- bettingBudget: 250M ← RESETEADO
```

**Ejemplo Completo: Usuario Ana**

```typescript
ANTES DEL CIERRE:
- budget: 550M
- points: 290 pts
- bettingBudget: 120M

CÁLCULOS:
Base: 500M
Puntos plantilla: 78 pts × 1M = +78M
Resultado apuestas: -5M (1 ganada, 2 perdidas)

Nuevo presupuesto = 500 + 78 - 5 = 573M
Nuevos puntos = 290 + 78 = 368 pts
Betting budget = 250M (reseteo)

DESPUÉS DEL CIERRE:
- budget: 573M ← ACTUALIZADO
- points: 368 pts ← ACTUALIZADO
- bettingBudget: 250M ← RESETEADO
```

**Actualización en BD:**

```sql
UPDATE leagueMember 
SET 
  budget = 630,           -- Nuevo presupuesto
  points = 415,           -- Puntos acumulados
  bettingBudget = 250     -- Siempre 250M para nueva jornada
WHERE leagueId = 'liga1' AND userId = 'user1';
```

**Log de consola:**

```
💵 4. Actualizando presupuestos...
  👤 Usuario Rubén:
     Presupuesto anterior: 580M
     Base: 500M
     Apuestas: 2W/1L = +35M
     Plantilla: 95 puntos = +95M
     Nuevo presupuesto: 630M
     Puntos totales: 320 → 415

  👤 Usuario Ana:
     Presupuesto anterior: 550M
     Base: 500M
     Apuestas: 1W/1L = -5M
     Plantilla: 78 puntos = +78M
     Nuevo presupuesto: 573M
     Puntos totales: 290 → 368
✅ 2 miembros actualizados
```

---

### **PASO 5: Vaciar Todas las Plantillas** 🗑️

**Código:** `prisma.squadPlayer.deleteMany(...)`

**¿Qué hace?**

1. Busca TODAS las plantillas (`squad`) de la liga
2. Para cada plantilla:
   - Elimina TODOS los jugadores (`squadPlayer`)
   - Mantiene el registro de la plantilla vacía
3. Los usuarios empezarán con plantilla vacía en la nueva jornada

**Ejemplo:**

```typescript
ANTES:
Squad de Rubén: 11 jugadores (Courtois, Hermoso, Gayá, ...)
Squad de Ana: 11 jugadores (Ter Stegen, Araújo, ...)

DESPUÉS:
Squad de Rubén: 0 jugadores (vacía)
Squad de Ana: 0 jugadores (vacía)
```

**Operación en BD:**

```sql
-- Para cada squad
DELETE FROM squadPlayer 
WHERE squadId = 'squad1';

DELETE FROM squadPlayer 
WHERE squadId = 'squad2';
```

**Log de consola:**

```
🗑️  5. Vaciando plantillas...
✅ 2 plantillas vaciadas
```

---

### **PASO 6: Eliminar Opciones de Apuestas Antiguas** 🗑️

**Código:** `prisma.bet_option.deleteMany(...)`

**¿Qué hace?**

Elimina TODAS las opciones de apuestas (`bet_option`) de la jornada que acaba de cerrarse.

**Razón:** Las opciones de apuestas solo son válidas para una jornada específica. Una vez cerrada, ya no se necesitan.

**Ejemplo:**

```typescript
ANTES (Jornada 8):
- bet_option #1: Oviedo vs Español - Goles totales
- bet_option #2: Oviedo vs Español - Córners
- bet_option #3: Barcelona vs Madrid - Goles totales
... (120 opciones en total)

DESPUÉS:
- (Todas eliminadas)
```

**Operación en BD:**

```sql
DELETE FROM bet_option 
WHERE leagueId = 'liga1' 
  AND jornada = 8;
```

**Resultado:** Se eliminan ~120 registros

**Log de consola:**

```
🗑️  6. Eliminando opciones de apuestas antiguas...
✅ 120 opciones de apuestas eliminadas
```

---

### **PASO 7: Eliminar Apuestas Evaluadas** 🗑️

**Código:** `prisma.bet.deleteMany(...)`

**¿Qué hace?**

Elimina TODAS las apuestas que ya fueron evaluadas (status: `'won'` o `'lost'`).

**Razón:** Las ganancias/pérdidas ya fueron contabilizadas en el presupuesto del usuario. No se necesitan los registros.

**Mantiene:** Apuestas con status `'pending'` (si las hay)

**Ejemplo:**

```typescript
ANTES (Jornada 8):
- bet #1: Rubén - "Más de 2.5 goles" (status: won)
- bet #2: Rubén - "Ambos marcan" (status: won)
- bet #3: Rubén - "Córners >9.5" (status: lost)
- bet #4: Ana - "Resultado Local" (status: lost)
- bet #5: Ana - "Par/Impar" (status: won)

DESPUÉS:
- (Todas eliminadas porque todas están evaluadas)
```

**Operación en BD:**

```sql
DELETE FROM bet 
WHERE leagueId = 'liga1' 
  AND jornada = 8 
  AND status IN ('won', 'lost');
```

**Resultado:** Se eliminan 5 apuestas evaluadas

**Log de consola:**

```
🗑️  7. Eliminando apuestas evaluadas...
✅ 5 apuestas eliminadas
```

---

### **PASO 8: Avanzar Jornada y Cambiar Estado** ⏭️

**Código:** `prisma.league.update(...)`

**¿Qué hace?**

1. Incrementa el número de jornada en +1
2. Cambia el estado de `'closed'` a `'open'`
3. Los usuarios ya pueden hacer modificaciones

**Ejemplo:**

```typescript
ANTES:
- currentJornada: 8
- jornadaStatus: 'closed' (cambios bloqueados)

DESPUÉS:
- currentJornada: 9
- jornadaStatus: 'open' (cambios permitidos)
```

**Operación en BD:**

```sql
UPDATE league 
SET 
  currentJornada = 9,
  jornadaStatus = 'open'
WHERE id = 'liga1';
```

**Acciones ahora permitidas:**
- ✅ Crear nueva plantilla (11 jugadores)
- ✅ Hacer fichajes (comprar/vender jugadores)
- ✅ Realizar apuestas (cuando se generen opciones)

**Log de consola:**

```
⏭️  8. Avanzando jornada...
✅ Liga avanzada a jornada 9 con estado "open"

🎉 JORNADA 8 CERRADA EXITOSAMENTE

📊 Resumen:
   - 5 apuestas evaluadas
   - 2 miembros actualizados
   - 2 plantillas vaciadas
   - 120 opciones de apuestas eliminadas
   - Jornada actual: 9
```

---

## 🌐 Proceso Global: closeAllJornadas()

El método `closeAllJornadas()` ejecuta `closeJornada()` para **CADA liga** del sistema.

**Ejemplo con 3 ligas:**

```
🌍 CERRANDO JORNADA PARA TODAS LAS LIGAS...

============================================================
🏆 Procesando liga: Oviedo Fantasy
============================================================

[... 8 pasos para Oviedo Fantasy ...]

✅ Liga "Oviedo Fantasy" procesada exitosamente

============================================================
🏆 Procesando liga: Madrid League
============================================================

[... 8 pasos para Madrid League ...]

✅ Liga "Madrid League" procesada exitosamente

============================================================
🏆 Procesando liga: Barcelona Masters
============================================================

[... 8 pasos para Barcelona Masters ...]

✅ Liga "Barcelona Masters" procesada exitosamente

============================================================
🎉 PROCESO COMPLETADO
============================================================

📊 Resumen Global:
   - Ligas procesadas: 3/3
   - Total apuestas evaluadas: 15
   - Total miembros actualizados: 6
   - Total plantillas vaciadas: 6
```

---

## 📊 Resumen de Cambios en Base de Datos

| Tabla | Operación | Descripción | Cantidad |
|-------|-----------|-------------|----------|
| `bet` | UPDATE | Marca apuestas como won/lost | ~5 por liga |
| `bet` | DELETE | Elimina apuestas evaluadas | ~5 por liga |
| `bet_option` | DELETE | Elimina opciones de jornada | ~120 por liga |
| `leagueMember` | UPDATE | Actualiza budget, points, bettingBudget | Todos los miembros |
| `squadPlayer` | DELETE | Vacía plantillas | ~11 × miembros |
| `league` | UPDATE | Incrementa jornada, cambia status | 1 por liga |

---

## 🎯 Ejemplo Completo: Liga "Oviedo Fantasy"

### Estado Inicial

```
LIGA: Oviedo Fantasy
Jornada: 8
Status: CLOSED (cambios bloqueados)

USUARIOS:
┌─────────────────────────────────────────────────┐
│ Rubén                                           │
│ • Budget: 580M                                  │
│ • Points: 320 pts                               │
│ • Betting Budget: 85M                           │
│ • Plantilla: 11 jugadores                       │
│ • Apuestas: 3 pending                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Ana                                             │
│ • Budget: 550M                                  │
│ • Points: 290 pts                               │
│ • Betting Budget: 120M                          │
│ • Plantilla: 11 jugadores                       │
│ • Apuestas: 2 pending                           │
└─────────────────────────────────────────────────┘
```

### Procesamiento

```
🏆 Procesando liga: Oviedo Fantasy

📊 1. Evaluando apuestas de jornada 8...
   ✅ Rubén: "Más de 2.5 goles" (10M × 1.8) = +18M
   ✅ Rubén: "Ambos marcan" (15M × 1.8) = +27M
   ❌ Rubén: "Córners >9.5" (10M × 2.0) = -10M
   ❌ Ana: "Resultado Local" (15M × 2.5) = -15M
   ✅ Ana: "Par/Impar" (10M × 1.8) = +18M
✅ 5 apuestas evaluadas

💰 2. Calculando balances de apuestas...
   Rubén: +35M (2W/1L)
   Ana: +3M (1W/1L)
✅ Balances calculados para 2 usuarios

⚽ 3. Calculando puntos de plantilla...
   Rubén: 95 puntos
   Ana: 78 puntos
✅ Puntos de plantilla calculados

💵 4. Actualizando presupuestos...
   👤 Usuario Rubén:
      Presupuesto anterior: 580M
      Base: 500M
      Apuestas: 2W/1L = +35M
      Plantilla: 95 puntos = +95M
      Nuevo presupuesto: 630M
      Puntos totales: 320 → 415
   
   👤 Usuario Ana:
      Presupuesto anterior: 550M
      Base: 500M
      Apuestas: 1W/1L = +3M
      Plantilla: 78 puntos = +78M
      Nuevo presupuesto: 581M
      Puntos totales: 290 → 368
✅ 2 miembros actualizados

🗑️  5. Vaciando plantillas...
✅ 2 plantillas vaciadas

🗑️  6. Eliminando opciones de apuestas antiguas...
✅ 120 opciones de apuestas eliminadas

🗑️  7. Eliminando apuestas evaluadas...
✅ 5 apuestas eliminadas

⏭️  8. Avanzando jornada...
✅ Liga avanzada a jornada 9 con estado "open"

🎉 JORNADA 8 CERRADA EXITOSAMENTE
```

### Estado Final

```
LIGA: Oviedo Fantasy
Jornada: 9
Status: OPEN (cambios permitidos)

USUARIOS:
┌─────────────────────────────────────────────────┐
│ Rubén                                           │
│ • Budget: 630M (+50M)                           │
│ • Points: 415 pts (+95 pts)                     │
│ • Betting Budget: 250M (reseteado)              │
│ • Plantilla: VACÍA (0 jugadores)                │
│ • Apuestas: 0                                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Ana                                             │
│ • Budget: 581M (+31M)                           │
│ • Points: 368 pts (+78 pts)                     │
│ • Betting Budget: 250M (reseteado)              │
│ • Plantilla: VACÍA (0 jugadores)                │
│ • Apuestas: 0                                   │
└─────────────────────────────────────────────────┘

ACCIONES DISPONIBLES:
✅ Crear nueva plantilla
✅ Hacer fichajes
✅ Realizar apuestas (cuando admin genere opciones)
```

---

## ⏱️ Tiempos de Ejecución

| Paso | Duración Estimada |
|------|-------------------|
| 1. Evaluar apuestas | 30-60 segundos |
| 2. Calcular balances | 5 segundos |
| 3. Calcular puntos plantilla | 20-40 segundos |
| 4. Actualizar presupuestos | 10 segundos |
| 5. Vaciar plantillas | 5 segundos |
| 6. Eliminar bet_options | 2 segundos |
| 7. Eliminar bets | 2 segundos |
| 8. Avanzar jornada | 1 segundo |
| **TOTAL por liga** | **~2-3 minutos** |
| **TOTAL (5 ligas)** | **~10-15 minutos** |

---

## 📱 Respuesta al Frontend

```json
{
  "success": true,
  "message": "Jornada cerrada para 3 ligas",
  "leaguesProcessed": 3,
  "totalEvaluations": 15,
  "totalUpdatedMembers": 6,
  "totalClearedSquads": 6,
  "leagues": [
    {
      "id": "liga1",
      "name": "Oviedo Fantasy",
      "oldJornada": 8,
      "newJornada": 9,
      "evaluations": 5,
      "updatedMembers": 2,
      "clearedSquads": 2
    },
    {
      "id": "liga2",
      "name": "Madrid League",
      "oldJornada": 8,
      "newJornada": 9,
      "evaluations": 7,
      "updatedMembers": 3,
      "clearedSquads": 3
    },
    {
      "id": "liga3",
      "name": "Barcelona Masters",
      "oldJornada": 8,
      "newJornada": 9,
      "evaluations": 3,
      "updatedMembers": 1,
      "clearedSquads": 1
    }
  ]
}
```

---

## 🎨 Alert en Frontend

```
┌─────────────────────────────────────────────┐
│  ✅ Cambios Abiertos                        │
│                                             │
│  El proceso ha finalizado correctamente.    │
│                                             │
│  📊 RESUMEN GLOBAL:                         │
│  • Ligas procesadas: 3                      │
│  • Apuestas evaluadas: 15                   │
│  • Miembros actualizados: 6                 │
│  • Plantillas vaciadas: 6                   │
│                                             │
│  ✅ PERMITIDO:                              │
│  • Modificar plantillas                     │
│  • Hacer fichajes y ventas                  │
│  • Realizar apuestas                        │
│                                             │
│  🎮 Los usuarios ya pueden prepararse para  │
│     la próxima jornada.                     │
│                                             │
│  [ OK ]                                     │
└─────────────────────────────────────────────┘
```

---

## ✅ Resumen Final

El proceso "Abrir Cambios" hace lo siguiente:

1. ✅ Evalúa todas las apuestas con API-Football
2. ✅ Calcula ganancias/pérdidas por usuario
3. ✅ Calcula puntos de cada plantilla
4. ✅ Actualiza presupuestos: `500M + Puntos + Apuestas`
5. ✅ Acumula puntos totales para ranking
6. ✅ Resetea betting budget a 250M
7. ✅ Vacía todas las plantillas
8. ✅ Elimina opciones de apuestas antiguas
9. ✅ Elimina apuestas evaluadas
10. ✅ Avanza jornada y permite cambios

**Fórmula de Presupuesto:**
```
Nuevo Presupuesto = 500M + (Puntos Plantilla × 1M) + Resultado Apuestas
```

**Fórmula de Puntos:**
```
Puntos Totales = Puntos Anteriores + Puntos de esta Jornada
```

---

**Última Actualización:** 20 de octubre de 2025
**Archivo:** backend/src/services/jornada.service.ts
**Método Principal:** `closeAllJornadas()` → `closeJornada()`
