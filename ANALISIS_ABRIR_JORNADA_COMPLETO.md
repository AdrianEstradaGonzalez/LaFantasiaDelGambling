# 🔓 ANÁLISIS COMPLETO: ¿Qué Ocurre al Presionar "ABRIR JORNADA"?

## ⚠️ IMPORTANTE: Confusión de Nombres

El botón dice **"Abrir Cambios"** pero internamente llama a **`closeAllJornadas()`**

Esta confusión viene de que:
- **"Abrir Cambios"** = Cerrar la jornada y permitir modificaciones para la siguiente
- **"Cerrar Jornada"** en el código = Finalizar jornada actual y abrir la siguiente

## 📱 FLUJO COMPLETO PASO A PASO

### 1️⃣ FRONTEND: Usuario Presiona el Botón

**Archivo**: `frontend/pages/admin/AdminPanel.tsx`  
**Línea**: 555

```tsx
<TouchableOpacity onPress={handleAbrirJornada}>
  Abrir Cambios (Jornada X)
</TouchableOpacity>
```

**Estado inicial del botón**:
- Solo visible si `jornadaStatus === 'closed'` (jornada bloqueada)
- Deshabilitado si `jornadaStatus === 'open'` (ya procesada)

---

### 2️⃣ FRONTEND: Confirmación del Usuario

**Archivo**: `frontend/pages/admin/AdminPanel.tsx`  
**Líneas**: 154-215

Se muestra un **Alert de confirmación** con toda la información:

```
🔓 Abrir Cambios

¿Estás seguro de que quieres abrir los cambios para TODAS las ligas?

Esto ejecutará el siguiente proceso:

📊 EVALUACIÓN Y CÁLCULOS:
• Evaluará todas las apuestas con resultados reales
• Calculará puntos de plantillas
• Actualizará presupuestos (500M base + puntos + apuestas)
• Actualizará clasificación total

🗑️ LIMPIEZA:
• Vaciará todas las plantillas
• Eliminará opciones de apuestas antiguas

⏭️ AVANCE:
• Incrementará jornada en +1
• Desbloqueará modificaciones para nueva jornada

⚠️ Este proceso puede tardar varios minutos.
```

**Opciones**:
- ❌ **Cancelar** → No hace nada
- ✅ **Abrir Cambios** → Ejecuta el proceso

---

### 3️⃣ FRONTEND: Llamada al Servicio

**Archivo**: `frontend/pages/admin/AdminPanel.tsx`  
**Línea**: 187

```typescript
const result = await JornadaService.closeAllJornadas();
```

**Estado visual**:
- Muestra loading spinner: `"Abriendo Cambios (Jornada X)..."`
- Deshabilita el botón para evitar clics múltiples

---

### 4️⃣ FRONTEND: Servicio HTTP

**Archivo**: `frontend/services/JornadaService.ts`  
**Líneas**: 246-288

```typescript
static async closeAllJornadas() {
  const token = await EncryptedStorage.getItem('accessToken');
  
  const response = await axios.post(
    `${API_URL}/jornada/close-all`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 180000, // 3 minutos
    }
  );
  
  return response.data;
}
```

**Request HTTP**:
- **Método**: POST
- **URL**: `http://localhost:5000/api/jornada/close-all`
- **Headers**: Authorization token
- **Body**: {} (vacío)
- **Timeout**: 180 segundos (3 minutos)

---

### 5️⃣ BACKEND: Ruta HTTP

**Archivo**: `backend/src/routes/jornada.routes.ts`  
**Líneas**: 70-76

```typescript
fastify.post(
  '/close-all',
  {
    preHandler: [fastify.auth], // ✅ Requiere autenticación
  },
  JornadaController.closeAllJornadas
);
```

**Middleware**:
- Verifica token de autenticación
- Si no hay token → 401 Unauthorized
- Si token válido → Continúa

---

### 6️⃣ BACKEND: Controlador

**Archivo**: `backend/src/controllers/jornada.controller.ts`  
**Líneas**: 212-228

```typescript
static async closeAllJornadas(request, reply) {
  try {
    const result = await JornadaService.closeAllJornadas();
    return reply.status(200).send(result);
  } catch (error) {
    console.error('Error en closeAllJornadas:', error);
    return reply.status(500).send({ 
      error: error.message || 'Error al cerrar jornadas' 
    });
  }
}
```

---

### 7️⃣ BACKEND: Servicio Principal

**Archivo**: `backend/src/services/jornada.service.ts`  
**Líneas**: 1161-1242

```typescript
static async closeAllJornadas() {
  console.log('\n🌍 CERRANDO JORNADA PARA TODAS LAS LIGAS...\n');
  
  // Obtener TODAS las ligas
  const leagues = await prisma.league.findMany();
  
  for (const league of leagues) {
    console.log(`🏆 Procesando liga: ${league.name}`);
    
    // Llamar a closeJornada para cada liga
    const result = await this.closeJornada(league.id);
  }
}
```

**Itera sobre TODAS las ligas** y ejecuta `closeJornada()` para cada una.

---

## 🔄 PROCESO DE `closeJornada()` (POR CADA LIGA)

**Archivo**: `backend/src/services/jornada.service.ts`  
**Método**: `closeJornada(leagueId)`  
**Líneas**: 895-1045

---

### 📊 PASO 1: Evaluar Apuestas

**Línea**: 920

```typescript
const evaluations = await this.evaluateJornadaBets(jornada, leagueId);
```

**Proceso**:
1. Obtiene todas las apuestas con `status: 'pending'` de la jornada actual
2. Para cada apuesta:
   - Consulta la API Football para obtener el resultado del partido
   - Verifica si el partido terminó (`status: 'FT'`, `'AET'`, `'PEN'`)
   - Evalúa la apuesta según el tipo:
     - **Ganador local**: `goalsHome > goalsAway`
     - **Ganador visitante**: `goalsAway > goalsHome`
     - **Empate**: `goalsHome === goalsAway`
     - **Más de X goles**: `totalGoals > threshold`
     - **Menos de X goles**: `totalGoals < threshold`
     - **Más de X corners**: `totalCorners > threshold`
     - **Menos de X corners**: `totalCorners < threshold`
     - **Ambos marcan**: `goalsHome > 0 && goalsAway > 0`
     - **Más de X tarjetas**: `totalCards > threshold`
   - Si ganó:
     ```typescript
     profit = amount × odd
     status = 'won'
     ```
   - Si perdió:
     ```typescript
     profit = -amount
     status = 'lost'
     ```
3. Actualiza cada apuesta en BD con `status` y `profit`

**Ejemplo**:
```
Apuesta 1: 10M × 1.8 = ganó → profit: +18M, status: 'won'
Apuesta 2: 15M × 2.0 = perdió → profit: -15M, status: 'lost'
Apuesta 3: 5M × 1.5 = ganó → profit: +7.5M, status: 'won'
```

**Console**:
```
📊 1. Evaluando apuestas de jornada 5...
✅ 23 apuestas evaluadas
```

---

### 💰 PASO 2: Calcular Balances de Apuestas

**Línea**: 925

```typescript
const balances = await this.calculateUserBalances(leagueId, evaluations);
```

**Proceso**:
1. Agrupa las apuestas evaluadas por usuario
2. Para cada usuario, calcula:
   ```typescript
   {
     userId: "abc123",
     totalProfit: 10.5,  // +18 - 15 + 7.5 = +10.5M
     wonBets: 2,
     lostBets: 1,
     squadPoints: 0  // Todavía no calculado
   }
   ```

**Console**:
```
💰 2. Calculando balances de apuestas...
✅ Balances calculados para 8 usuarios
```

---

### ⚽ PASO 3: Calcular Puntos de Plantilla

**Líneas**: 930-951

```typescript
for (const member of allMembers) {
  const squadPoints = await this.calculateSquadPoints(
    member.userId, 
    leagueId, 
    jornada
  );
  
  userBalance.squadPoints = squadPoints;
}
```

**Proceso detallado** (método `calculateSquadPoints`):

#### 3.1. Obtener Plantilla
```typescript
const squad = await prisma.squad.findUnique({
  where: { userId_leagueId: { userId, leagueId } },
  include: { players: true }
});
```

#### 3.2. Validar Número de Jugadores
```typescript
if (squad.players.length < 11) {
  return 0; // ❌ Plantilla inválida
}
```

#### 3.3. Por Cada Jugador (11 iteraciones):

**A) Obtener equipo del jugador**
```typescript
// Primero intenta desde BD local
const localPlayer = await prisma.player.findUnique({ 
  where: { id: playerId } 
});
playerTeamId = localPlayer.teamId;

// Si no está en BD, consulta API
const playerInfo = await api.get('/players', {
  params: { id: playerId, season: 2025, league: 140 }
});
```

**B) Obtener partidos de la jornada**
```typescript
const fixtures = await api.get('/fixtures', {
  params: {
    league: 140,
    season: 2025,
    round: `Regular Season - ${jornada}`
  }
});
```

**C) Buscar el partido del equipo**
```typescript
const teamFixture = fixtures.find(f => 
  f.teams.home.id === playerTeamId || 
  f.teams.away.id === playerTeamId
);
```

**D) Obtener estadísticas del jugador**
```typescript
const statsResponse = await api.get('/fixtures/players', {
  params: { fixture: teamFixture.fixture.id }
});

// Buscar el jugador en las estadísticas
const playerStats = teamsData.find(team =>
  team.players.find(p => p.player.id === playerId)
);
```

**E) Calcular puntos**
```typescript
const points = calculatePlayerPointsService(
  playerStats, 
  mapSquadRole(squadPlayer.role)
);
```

**Reglas de puntos** (`shared/pointsCalculator.ts`):
```typescript
// Ejemplo para un defensa:
- Jugar 60+ minutos: +1 punto
- Gol: +6 puntos
- Asistencia: +3 puntos
- Portería a cero: +4 puntos
- Tarjeta amarilla: -1 punto
- Tarjeta roja: -3 puntos
- Gol en contra: -2 puntos
- ...
```

#### 3.4. Sumar Puntos Totales
```typescript
totalPoints += playerPoints;
```

**Ejemplo completo**:
```
Portero (90 min, 5 paradas, 0 goles):  +8 puntos
Defensa 1 (90 min, portería a cero):   +5 puntos
Defensa 2 (90 min, portería a cero):   +5 puntos
Defensa 3 (45 min):                    +0 puntos
Defensa 4 (90 min, 1 gol):             +11 puntos
Centrocampista 1 (90 min, 1 asist):    +4 puntos
Centrocampista 2 (90 min):             +1 punto
Centrocampista 3 (70 min, amarilla):   +0 puntos
Centrocampista 4 (60 min):             +1 punto
Delantero 1 (90 min, 2 goles):         +10 puntos
Delantero 2 (30 min):                  +0 puntos
---------------------------------------------------
TOTAL:                                  45 puntos
```

**Console**:
```
⚽ 3. Calculando puntos de plantilla...
  📋 Plantilla encontrada con 11 jugadores
  ✅ Plantilla válida. Calculando puntos...
  
    🔍 ===== PROCESANDO JUGADOR =====
       Nombre: Courtois
       ID: 629
       Rol: POR
       ⏱️ Minutos: 90
       ⚽ PUNTOS: 8
       💰 Total acumulado: 8
       ====================================
  
  ... (repite para los 11 jugadores)
  
  📊 TOTAL PUNTOS PLANTILLA: 45
✅ Puntos de plantilla calculados
```

---

### 💵 PASO 4: Actualizar Presupuestos y Puntos

**Líneas**: 954-989

```typescript
for (const [userId, balance] of balances) {
  const member = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId } }
  });
  
  // ✅ FÓRMULA DEL NUEVO PRESUPUESTO
  const budgetFromBets = balance.totalProfit;      // Ej: +10.5M
  const budgetFromSquad = balance.squadPoints;     // Ej: 45M
  const newBudget = 500 + budgetFromSquad + budgetFromBets;
  // 500 + 45 + 10.5 = 555.5M → 555M (truncado)
  
  // ✅ ACTUALIZAR PUNTOS TOTALES (ACUMULADO)
  const newTotalPoints = member.points + balance.squadPoints;
  // 120 + 45 = 165 puntos
  
  await prisma.leagueMember.update({
    where: { leagueId_userId: { leagueId, userId } },
    data: {
      budget: newBudget,           // ✅ NUEVO: 555M
      bettingBudget: 250,          // ✅ RESETEA: 250M
      points: newTotalPoints,      // ✅ ACUMULA: 165
      // initialBudget: 500        // ❌ NO CAMBIA
    }
  });
}
```

**Ejemplo de actualización**:
```
Usuario: Juan Pérez

ANTES:
  budget: 480M
  bettingBudget: 120M (lo que quedó)
  points: 120
  initialBudget: 500M

CÁLCULOS:
  Base: 500M
  Apuestas: 2W/1L = +10.5M
  Plantilla: 45 puntos = +45M
  Nuevo presupuesto: 500 + 45 + 10.5 = 555.5M → 555M

DESPUÉS:
  budget: 555M          ← ACTUALIZADO
  bettingBudget: 250M   ← RESETEADO
  points: 165           ← ACUMULADO (120 + 45)
  initialBudget: 500M   ← SIN CAMBIOS
```

**Console**:
```
💵 4. Actualizando presupuestos...
  👤 Usuario Juan Pérez:
     Presupuesto anterior: 480M
     Base: 500M
     Apuestas: 2W/1L = +10.5M
     Plantilla: 45 puntos = +45M
     Nuevo presupuesto: 555M
     Puntos totales: 120 → 165
✅ 8 miembros actualizados
```

---

### 🗑️ PASO 5: Vaciar Plantillas

**Líneas**: 992-1005

```typescript
const allSquads = await prisma.squad.findMany({
  where: { leagueId }
});

for (const squad of allSquads) {
  await prisma.squadPlayer.deleteMany({
    where: { squadId: squad.id }
  });
}
```

**Proceso**:
1. Obtiene todas las plantillas de la liga
2. Para cada plantilla, elimina TODOS los `SquadPlayer` (los 11 jugadores)
3. La plantilla (tabla `Squad`) sigue existiendo, pero vacía

**Resultado**:
```
Antes: 
  Squad ID abc123 → 11 jugadores
  Squad ID def456 → 11 jugadores
  Squad ID ghi789 → 11 jugadores

Después:
  Squad ID abc123 → 0 jugadores
  Squad ID def456 → 0 jugadores
  Squad ID ghi789 → 0 jugadores
```

**Console**:
```
🗑️  5. Vaciando plantillas...
✅ 8 plantillas vaciadas
```

---

### 🗑️ PASO 6: Eliminar Opciones de Apuesta

**Líneas**: 1007-1013

```typescript
await prisma.bet_option.deleteMany({
  where: {
    leagueId,
    jornada  // Jornada actual (la que acabamos de cerrar)
  }
});
```

**Proceso**:
- Elimina TODAS las opciones de apuesta creadas para esta jornada
- Ejemplo: Si había 50 opciones de apuesta creadas para la jornada 5, se eliminan las 50

**Console**:
```
🗑️  6. Eliminando opciones de apuestas antiguas...
✅ 50 opciones de apuestas eliminadas
```

---

### 🗑️ PASO 7: Eliminar Apuestas Evaluadas

**Líneas**: 1015-1021

```typescript
await prisma.bet.deleteMany({
  where: {
    leagueId,
    jornada,
    status: { in: ['won', 'lost'] }
  }
});
```

**Proceso**:
- Elimina todas las apuestas que ya fueron evaluadas (`won` o `lost`)
- Las apuestas pendientes (si las hubiera) NO se eliminan
- Ya no necesitamos este historial porque los resultados ya se aplicaron al presupuesto

**Console**:
```
🗑️  7. Eliminando apuestas evaluadas...
✅ 23 apuestas eliminadas
```

---

### ⏭️ PASO 8: Avanzar Jornada

**Líneas**: 1023-1030

```typescript
const nextJornada = jornada + 1;

await prisma.league.update({
  where: { id: leagueId },
  data: {
    currentJornada: nextJornada,  // 5 → 6
    jornadaStatus: 'open'         // 'closed' → 'open'
  }
});
```

**Proceso**:
1. Incrementa el número de jornada en +1
2. Cambia el estado a `'open'` (permite modificaciones)

**Ejemplo**:
```
ANTES:
  currentJornada: 5
  jornadaStatus: 'closed'  ← Bloqueado (no se puede modificar plantilla ni apostar)

DESPUÉS:
  currentJornada: 6
  jornadaStatus: 'open'    ← Desbloqueado (se puede modificar plantilla y apostar)
```

**Console**:
```
⏭️  8. Avanzando jornada...
✅ Liga avanzada a jornada 6 con estado "open"

🎉 JORNADA 5 CERRADA EXITOSAMENTE

📊 Resumen:
   - 23 apuestas evaluadas
   - 8 miembros actualizados
   - 8 plantillas vaciadas
   - 50 opciones de apuestas eliminadas
   - Jornada actual: 6
```

---

## 🔄 RESUMEN GLOBAL (Todas las Ligas)

Después de procesar **TODAS** las ligas, el backend devuelve:

```json
{
  "success": true,
  "message": "Jornada cerrada para 3 ligas",
  "leaguesProcessed": 3,
  "totalEvaluations": 67,
  "totalUpdatedMembers": 24,
  "totalClearedSquads": 24,
  "leagues": [
    {
      "id": "liga1",
      "name": "Liga Amigos",
      "oldJornada": 5,
      "newJornada": 6,
      "evaluations": 23,
      "updatedMembers": 8,
      "clearedSquads": 8
    },
    {
      "id": "liga2",
      "name": "Liga Trabajo",
      "oldJornada": 5,
      "newJornada": 6,
      "evaluations": 30,
      "updatedMembers": 10,
      "clearedSquads": 10
    },
    {
      "id": "liga3",
      "name": "Liga Familia",
      "oldJornada": 5,
      "newJornada": 6,
      "evaluations": 14,
      "updatedMembers": 6,
      "clearedSquads": 6
    }
  ]
}
```

**Console global**:
```
=============================================================
🌍 CERRANDO JORNADA PARA TODAS LAS LIGAS...
=============================================================

============================================================
🏆 Procesando liga: Liga Amigos
============================================================
...
✅ Liga "Liga Amigos" procesada exitosamente

============================================================
🏆 Procesando liga: Liga Trabajo
============================================================
...
✅ Liga "Liga Trabajo" procesada exitosamente

============================================================
🏆 Procesando liga: Liga Familia
============================================================
...
✅ Liga "Familia" procesada exitosamente

============================================================
🎉 PROCESO COMPLETADO
============================================================

📊 Resumen Global:
   - Ligas procesadas: 3/3
   - Total apuestas evaluadas: 67
   - Total miembros actualizados: 24
   - Total plantillas vaciadas: 24
```

---

## 📱 FRONTEND: Respuesta al Usuario

**Archivo**: `frontend/pages/admin/AdminPanel.tsx`  
**Líneas**: 193-215

El frontend recibe la respuesta y muestra:

```
✅ Cambios Abiertos

El proceso ha finalizado correctamente.

📊 RESUMEN GLOBAL:
• Ligas procesadas: 3
• Apuestas evaluadas: 67
• Miembros actualizados: 24
• Plantillas vaciadas: 24

✅ PERMITIDO:
• Modificar plantillas
• Realizar apuestas

📈 NUEVA JORNADA:
• Jornada activa: 6
• Estado: Abierto para cambios
```

**Cambio de estado**:
```typescript
setJornadaStatus('open');  // Actualiza el UI
```

**Efecto visual**:
- El botón "Abrir Cambios" se deshabilita
- Muestra: "Cambios ya permitidos (J6)"

---

## ⏱️ Tiempo de Ejecución Estimado

- **1 liga con 8 usuarios**: ~30-45 segundos
- **3 ligas con 24 usuarios**: ~1-2 minutos
- **10 ligas con 80 usuarios**: ~5-8 minutos

**Factores que afectan el tiempo**:
- Número de ligas
- Número de usuarios por liga
- Número de apuestas por jornada
- Rate limits de la API Football (delay de 150ms entre consultas)
- Velocidad de conexión a internet

---

## 📊 Resumen de Cambios en Base de Datos

### Tabla `League`
```sql
UPDATE league
SET currentJornada = currentJornada + 1,
    jornadaStatus = 'open'
WHERE id IN (todas las ligas)
```

### Tabla `LeagueMember`
```sql
UPDATE league_member
SET budget = 500 + squadPoints + betProfit,
    bettingBudget = 250,
    points = points + squadPoints
WHERE leagueId IN (todas las ligas)
```

### Tabla `SquadPlayer`
```sql
DELETE FROM squad_player
WHERE squadId IN (todos los squads de todas las ligas)
```

### Tabla `bet_option`
```sql
DELETE FROM bet_option
WHERE leagueId IN (todas las ligas)
  AND jornada = jornadaAnterior
```

### Tabla `Bet`
```sql
-- Primero actualiza
UPDATE bet
SET status = 'won' OR 'lost',
    profit = calculado
WHERE jornada = jornadaAnterior
  AND status = 'pending'

-- Luego elimina
DELETE FROM bet
WHERE jornada = jornadaAnterior
  AND status IN ('won', 'lost')
```

---

## 🎯 Conclusión

Cuando presionas **"Abrir Jornada"** (que internamente es `closeAllJornadas`):

1. ✅ **Evalúa TODAS las apuestas** con la API Football
2. ✅ **Calcula puntos de TODAS las plantillas** (11 jugadores × N usuarios × M ligas)
3. ✅ **Actualiza presupuestos**: `500 + puntos + apuestas`
4. ✅ **Actualiza puntos totales**: acumula los puntos de la jornada
5. ✅ **Vacía TODAS las plantillas** (para empezar de nuevo)
6. ✅ **Elimina opciones de apuestas antiguas**
7. ✅ **Elimina apuestas ya evaluadas**
8. ✅ **Avanza la jornada en +1** para todas las ligas
9. ✅ **Cambia el estado a 'open'** (permite modificaciones)

**Tiempo total**: 1-8 minutos dependiendo del número de ligas y usuarios

---

**Fecha**: 2025-01-20  
**Archivos analizados**:
- `frontend/pages/admin/AdminPanel.tsx`
- `frontend/services/JornadaService.ts`
- `backend/src/routes/jornada.routes.ts`
- `backend/src/controllers/jornada.controller.ts`
- `backend/src/services/jornada.service.ts`
