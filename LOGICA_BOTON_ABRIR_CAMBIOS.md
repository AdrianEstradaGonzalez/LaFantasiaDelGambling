# Lógica Completa: Botón "Abrir Cambios"

## 🎯 Resumen Ejecutivo

Cuando el admin presiona el botón **"Abrir Cambios"**, se ejecuta el proceso más complejo del sistema:

**Nombre del proceso:** `closeAllJornadas()`
**Duración estimada:** 2-3 minutos (dependiendo del número de ligas/usuarios)
**Propósito:** Cerrar la jornada actual, evaluar todo, y preparar la siguiente jornada

---

## 🔄 Flujo Completo de Ejecución

### Frontend (AdminPanel.tsx)

```
Usuario presiona "Abrir Cambios"
         ↓
CustomAlert de confirmación
         ↓
Usuario confirma
         ↓
setIsOpeningJornada(true)  ← Muestra loading
         ↓
JornadaService.closeAllJornadas()  ← Llama al backend
         ↓
Espera respuesta (timeout: 3 minutos)
         ↓
setJornadaStatus('open')  ← Actualiza estado local
         ↓
CustomAlert de éxito con estadísticas
         ↓
setIsOpeningJornada(false)  ← Oculta loading
```

---

## 🌐 Backend: closeAllJornadas()

### Paso 1: Obtener Todas las Ligas

```typescript
const leagues = await prisma.league.findMany();
// Ej: [
//   { id: 'liga1', name: 'Oviedo Fantasy', currentJornada: 8 },
//   { id: 'liga2', name: 'Madrid League', currentJornada: 8 }
// ]
```

### Paso 2: Procesar Cada Liga (Bucle)

Para cada liga, llama a `closeJornada(leagueId)`:

```typescript
for (const league of leagues) {
  console.log(`🏆 Procesando liga: ${league.name}`);
  
  const result = await this.closeJornada(league.id);
  
  // Acumula estadísticas
  totalEvaluations += result.evaluations.length;
  totalUpdatedMembers += result.updatedMembers;
  totalClearedSquads += result.clearedSquads;
}
```

---

## 📋 Proceso por Liga: closeJornada()

### **Paso 1: Evaluar Apuestas** ⚽

```typescript
console.log(`📊 1. Evaluando apuestas de jornada ${jornada}...`);
const evaluations = await this.evaluateJornadaBets(jornada, leagueId);
```

**¿Qué hace?**
- Busca todas las apuestas con `status: 'pending'` de la jornada actual
- Para cada apuesta:
  - Llama a API-Football para obtener estadísticas reales del partido
  - Compara con el tipo de apuesta:
    - ✅ "Goles totales": Compara goles reales vs predicción
    - ✅ "Córners": Compara córners reales vs predicción
    - ✅ "Tarjetas": Compara tarjetas reales vs predicción
    - ✅ "Ambos marcan": Verifica si ambos equipos marcaron
    - ✅ "Par/Impar": Verifica si total de goles es par o impar
    - ✅ "Resultado": Compara resultado final vs predicción
  - Actualiza status a `'won'` o `'lost'`
  - Actualiza `potentialWin` si ganó

**Resultado:**
```typescript
[
  { betId: 'bet1', userId: 'user1', result: 'won', profit: 15 },
  { betId: 'bet2', userId: 'user2', result: 'lost', profit: -10 },
  // ...
]
```

---

### **Paso 2: Calcular Balances de Apuestas** 💰

```typescript
console.log(`💰 2. Calculando balances de apuestas...`);
const balances = await this.calculateUserBalances(leagueId, evaluations);
```

**¿Qué hace?**
- Agrupa evaluaciones por usuario
- Calcula para cada usuario:
  - `totalProfit`: Suma de ganancias - pérdidas
  - `wonBets`: Cantidad de apuestas ganadas
  - `lostBets`: Cantidad de apuestas perdidas

**Resultado:**
```typescript
Map {
  'user1' => { userId: 'user1', totalProfit: 25, wonBets: 3, lostBets: 1 },
  'user2' => { userId: 'user2', totalProfit: -15, wonBets: 1, lostBets: 2 }
}
```

---

### **Paso 3: Calcular Puntos de Plantilla** 🎯

```typescript
console.log(`⚽ 3. Calculando puntos de plantilla...`);
for (const member of allMembers) {
  const squadPoints = await this.calculateSquadPoints(member.userId, leagueId, jornada);
  userBalance.squadPoints = squadPoints;
}
```

**¿Qué hace?**
- Obtiene la plantilla de cada usuario (11 jugadores)
- Para cada jugador:
  - Consulta sus estadísticas reales en la jornada
  - Aplica sistema de puntuación:
    ```
    Puntos Base:
    - Portero: 5 pts si jugó
    - Defensa: 5 pts si jugó
    - Centrocampista: 5 pts si jugó
    - Delantero: 5 pts si jugó
    
    Bonificaciones:
    - Gol: +5 pts
    - Asistencia: +3 pts
    - Tarjeta amarilla: -1 pt
    - Tarjeta roja: -3 pts
    - Portería a cero (porteros/defensas): +5 pts
    - MVP del partido: +3 pts
    ```
- Suma puntos de todos los jugadores

**Resultado:**
```typescript
{
  userId: 'user1',
  squadPoints: 78,  // Suma de puntos de su plantilla
  totalProfit: 25,
  wonBets: 3,
  lostBets: 1
}
```

---

### **Paso 4: Actualizar Presupuestos** 💵

```typescript
console.log(`💵 4. Actualizando presupuestos...`);
for (const [userId, balance] of balances) {
  const budgetFromBets = balance.totalProfit;
  const budgetFromSquad = balance.squadPoints; // 1M por punto
  const newBudget = 500 + budgetFromSquad + budgetFromBets;
  const newTotalPoints = member.points + balance.squadPoints;
  
  await prisma.leagueMember.update({
    where: { leagueId_userId: { leagueId, userId } },
    data: {
      budget: newBudget,
      bettingBudget: 250, // Siempre 250M para apuestas
      points: newTotalPoints,
    },
  });
}
```

**¿Qué hace?**
Calcula el nuevo presupuesto con la fórmula:

```
Nuevo Presupuesto = 500M (base) + Puntos Plantilla + Resultado Apuestas

Ejemplo Usuario 1:
- Base: 500M
- Puntos plantilla: 78 pts = +78M
- Apuestas: +25M (ganó 3, perdió 1)
- TOTAL: 500 + 78 + 25 = 603M

Ejemplo Usuario 2:
- Base: 500M
- Puntos plantilla: 45 pts = +45M
- Apuestas: -15M (ganó 1, perdió 2)
- TOTAL: 500 + 45 - 15 = 530M
```

**También actualiza:**
- `bettingBudget`: Siempre resetea a 250M
- `points`: Acumula puntos de plantilla (ranking total)

**Log de consola:**
```
👤 Usuario Rubén:
   Presupuesto anterior: 580M
   Base: 500M
   Apuestas: 3W/1L = +25M
   Plantilla: 78 puntos = +78M
   Nuevo presupuesto: 603M
   Puntos totales: 320 → 398
```

---

### **Paso 5: Vaciar Plantillas** 🗑️

```typescript
console.log(`🗑️  5. Vaciando plantillas...`);
const allSquads = await prisma.squad.findMany({ where: { leagueId } });

for (const squad of allSquads) {
  await prisma.squadPlayer.deleteMany({ where: { squadId: squad.id } });
  clearedSquads++;
}
```

**¿Qué hace?**
- Elimina TODOS los jugadores de TODAS las plantillas
- Los usuarios empiezan con plantilla vacía en la nueva jornada
- NO elimina los registros `squad`, solo los `squadPlayer`

**Resultado:**
```
✅ 25 plantillas vaciadas
```

---

### **Paso 6: Eliminar Opciones de Apuestas** 🗑️

```typescript
console.log(`🗑️  6. Eliminando opciones de apuestas antiguas...`);
const deletedBetOptions = await prisma.bet_option.deleteMany({
  where: { leagueId, jornada }
});
```

**¿Qué hace?**
- Elimina TODAS las opciones de apuestas (`bet_option`) de la jornada actual
- Estas opciones ya no son necesarias
- Las nuevas opciones se generarán cuando se cree la nueva jornada

**Resultado:**
```
✅ 120 opciones de apuestas eliminadas
```

---

### **Paso 7: Eliminar Apuestas Evaluadas** 🗑️

```typescript
console.log(`🗑️  7. Eliminando apuestas evaluadas...`);
const deletedBets = await prisma.bet.deleteMany({
  where: {
    leagueId,
    jornada,
    status: { in: ['won', 'lost'] }
  }
});
```

**¿Qué hace?**
- Elimina apuestas con status `'won'` o `'lost'`
- Mantiene apuestas `'pending'` (si las hay)
- Los puntos ya fueron contabilizados en el presupuesto

**Resultado:**
```
✅ 85 apuestas eliminadas
```

---

### **Paso 8: Actualizar Estadísticas de Jugadores** 📊

```typescript
console.log(`📊 8. Actualizando estadísticas finales de jugadores...`);
const { PlayerStatsService } = await import('./playerStats.service.js');
const updateResult = await PlayerStatsService.updateAllPlayersStatsForJornada(jornada);
```

**¿Qué hace?**
- Llama a PlayerStatsService para actualizar estadísticas REALES de TODOS los jugadores de La Liga
- Consulta API-Football para obtener:
  - Goles marcados
  - Asistencias
  - Tarjetas
  - Minutos jugados
  - Rating del partido
- Actualiza tabla `player_stats` en la BD
- Si falla, continúa con el proceso (no crítico)

**Resultado:**
```
✅ Estadísticas actualizadas: 450 éxitos, 5 errores
```

---

### **Paso 9: Avanzar Jornada y Cambiar Estado** ⏭️

```typescript
console.log(`⏭️  9. Avanzando jornada...`);
const nextJornada = jornada + 1;
await prisma.league.update({
  where: { id: leagueId },
  data: {
    currentJornada: nextJornada,
    jornadaStatus: 'open',
  },
});
```

**¿Qué hace?**
- Incrementa `currentJornada`: 8 → 9
- Cambia `jornadaStatus` a `'open'` (permite modificaciones)
- Los usuarios ya pueden:
  - ✅ Crear nueva plantilla
  - ✅ Hacer fichajes
  - ✅ Realizar apuestas

**Resultado:**
```
✅ Liga avanzada a jornada 9 con estado "open"
```

---

## 📊 Respuesta Final al Frontend

Después de procesar todas las ligas, el backend retorna:

```typescript
{
  success: true,
  message: "Jornada cerrada para 5 ligas",
  leaguesProcessed: 5,
  totalEvaluations: 425,
  totalUpdatedMembers: 125,
  totalClearedSquads: 125,
  leagues: [
    {
      id: "liga1",
      name: "Oviedo Fantasy",
      oldJornada: 8,
      newJornada: 9,
      evaluations: 85,
      updatedMembers: 25,
      clearedSquads: 25
    },
    // ... otras ligas
  ]
}
```

---

## 🎨 Alert de Éxito (Frontend)

```
┌────────────────────────────────────────┐
│  ✅ Cambios Abiertos                   │
│                                        │
│  El proceso ha finalizado correctamente│
│                                        │
│  📊 RESUMEN GLOBAL:                    │
│  • Ligas procesadas: 5                 │
│  • Apuestas evaluadas: 425             │
│  • Miembros actualizados: 125          │
│  • Plantillas vaciadas: 125            │
│                                        │
│  ✅ PERMITIDO:                         │
│  • Modificar plantillas                │
│  • Hacer fichajes y ventas             │
│  • Realizar apuestas                   │
│                                        │
│  🎮 Los usuarios ya pueden prepararse  │
│     para la próxima jornada.           │
│                                        │
│  [ OK ]                                │
└────────────────────────────────────────┘
```

---

## ⏱️ Duración Estimada por Paso

| Paso | Operación | Tiempo Estimado |
|------|-----------|-----------------|
| 1 | Evaluar apuestas | 30-60 segundos |
| 2 | Calcular balances | 5 segundos |
| 3 | Calcular puntos plantilla | 20-40 segundos |
| 4 | Actualizar presupuestos | 10 segundos |
| 5 | Vaciar plantillas | 5 segundos |
| 6 | Eliminar bet_options | 2 segundos |
| 7 | Eliminar bets | 2 segundos |
| 8 | Actualizar stats jugadores | 60-90 segundos |
| 9 | Avanzar jornada | 1 segundo |
| **TOTAL** | **Una liga** | **2-3 minutos** |
| **TOTAL** | **5 ligas** | **10-15 minutos** |

⚠️ **Por eso el timeout es de 3 minutos (180 segundos)**

---

## 🔍 Ejemplo Completo: Liga "Oviedo Fantasy"

### Estado Inicial (Jornada 8, CLOSED)

```
Liga: Oviedo Fantasy
Jornada: 8
Status: CLOSED (cambios bloqueados)

Usuarios:
- Rubén: budget=580M, points=320, plantilla=11 jugadores, 3 apuestas pending
- Ana: budget=550M, points=290, plantilla=11 jugadores, 2 apuestas pending
```

### Admin presiona "Abrir Cambios"

**Procesamiento:**

```
🏆 Procesando liga: Oviedo Fantasy

📊 1. Evaluando 5 apuestas...
   - Rubén, apuesta #1: "Más de 2.5 goles" → WON (+18M)
   - Rubén, apuesta #2: "Ambos marcan" → WON (+12M)
   - Rubén, apuesta #3: "Córners >9.5" → LOST (-10M)
   - Ana, apuesta #1: "Resultado Local" → LOST (-15M)
   - Ana, apuesta #2: "Par/Impar" → WON (+10M)
✅ 5 apuestas evaluadas

💰 2. Calculando balances...
   - Rubén: +20M (2W/1L)
   - Ana: -5M (1W/1L)
✅ Balances calculados

⚽ 3. Calculando puntos de plantilla...
   - Rubén: 78 puntos
   - Ana: 65 puntos
✅ Puntos calculados

💵 4. Actualizando presupuestos...
   👤 Rubén:
      Anterior: 580M
      Base: 500M + Plantilla: 78M + Apuestas: 20M
      Nuevo: 598M
      Puntos: 320 → 398
   
   👤 Ana:
      Anterior: 550M
      Base: 500M + Plantilla: 65M + Apuestas: -5M
      Nuevo: 560M
      Puntos: 290 → 355
✅ 2 miembros actualizados

🗑️  5. Vaciando plantillas...
✅ 2 plantillas vaciadas

🗑️  6. Eliminando opciones de apuestas...
✅ 24 opciones eliminadas

🗑️  7. Eliminando apuestas evaluadas...
✅ 5 apuestas eliminadas

📊 8. Actualizando stats de jugadores...
✅ 450 jugadores actualizados

⏭️  9. Avanzando jornada...
✅ Liga avanzada a jornada 9 (OPEN)

🎉 JORNADA 8 CERRADA EXITOSAMENTE
```

### Estado Final (Jornada 9, OPEN)

```
Liga: Oviedo Fantasy
Jornada: 9
Status: OPEN (cambios permitidos)

Usuarios:
- Rubén: budget=598M, points=398, plantilla=VACÍA, 0 apuestas
- Ana: budget=560M, points=355, plantilla=VACÍA, 0 apuestas

Acciones disponibles:
✅ Crear plantilla nueva
✅ Hacer fichajes
✅ Realizar apuestas (cuando se generen opciones)
```

---

## 🚨 Manejo de Errores

### Si una Liga Falla

```typescript
try {
  const result = await this.closeJornada(league.id);
  // Proceso exitoso
} catch (error) {
  console.error(`❌ Error procesando liga "${league.name}":`, error);
  // Continúa con la siguiente liga (NO detiene el proceso completo)
}
```

**Comportamiento:**
- ✅ Sigue procesando las demás ligas
- ❌ La liga con error NO avanza de jornada
- 📊 Se reporta en el resumen final

### Si el Frontend Timeout

```typescript
{
  headers: { ... },
  timeout: 180000, // 3 minutos
}
```

**Si pasan 3 minutos sin respuesta:**
- Frontend muestra error
- Backend SIGUE ejecutándose
- Puedes verificar en la BD si se completó

---

## ✅ Validaciones y Seguridad

1. **Requiere autenticación:** Token JWT de admin
2. **Solo admin puede ejecutar:** Rol verificado en backend
3. **Timeout largo:** 3 minutos para evitar timeouts prematuros
4. **Transaccional por liga:** Si una liga falla, otras continúan
5. **Logs detallados:** Consola muestra cada paso

---

## 🎯 Resumen de Cambios en BD

| Tabla | Operación | Descripción |
|-------|-----------|-------------|
| `bet` | UPDATE | Status: pending → won/lost |
| `bet` | DELETE | Elimina bets won/lost |
| `bet_option` | DELETE | Elimina opciones de jornada actual |
| `leagueMember` | UPDATE | budget, bettingBudget, points |
| `squadPlayer` | DELETE | Vacía todas las plantillas |
| `player_stats` | UPDATE | Actualiza stats reales de jugadores |
| `league` | UPDATE | currentJornada +1, jornadaStatus='open' |

---

**Última Actualización:** 20 de octubre de 2025
**Archivo Analizado:** AdminPanel.tsx + jornada.service.ts
**Complejidad:** ⚠️⚠️⚠️ ALTA (Proceso crítico del sistema)
