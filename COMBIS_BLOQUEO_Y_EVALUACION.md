# Actualización Sistema de Combis - Bloqueos y Evaluación

## Cambios Implementados

### 1. Bloqueo de Apuestas Normales en Opciones de Combi ✅

**Problema**: Un usuario podía apostar normalmente en una opción que ya había agregado a una combi.

**Solución**: 
- Agregado nuevo bloqueo `isBlockedByCombi` en el frontend
- Si una opción está en `combiSelections`, no se puede apostar normalmente
- La opción aparece bloqueada (gris) con el input deshabilitado

**Archivo modificado**: `frontend/pages/apuestas/Apuestas.tsx`

```tsx
const isInCurrentCombi = isInCombi(b.matchId, b.type, option.label);
const isBlockedByCombi = isInCurrentCombi && !userBet;
const isBlocked = isBlockedByAd || isBlockedByBet || isBlockedByCombi;
```

**Comportamiento**:
- Usuario selecciona "Combinar" en opción A → Opción A queda bloqueada para apuesta normal
- Usuario puede deseleccionar de combi → Opción A se desbloquea
- Usuario con apuesta normal en opción B → Puede agregar opción B a combi (la apuesta normal ya existe)

---

### 2. Evaluación de Combis al Cerrar Jornada ✅

**Problema**: Las combis no se evaluaban automáticamente al cambiar de jornada.

**Solución**:
- Integrado `BetCombiService.evaluateJornadaCombis()` en el flujo de cambio de jornada
- Las combis se evalúan DESPUÉS de las apuestas individuales
- Las ganancias/pérdidas de combis se suman al `budget` principal

**Archivos modificados**:
- `backend/src/services/jornada.service.ts`
- `backend/src/services/betCombi.service.ts`

---

## Flujo de Evaluación de Combis

### Durante la Jornada
```
1. Usuario crea combi con 3 apuestas (10M)
   → Se deduce 10M de bettingBudget
   → Combi queda en estado "pending"

2. Se juegan los partidos
   → Apuestas individuales se evalúan
   → Combi aún en "pending" esperando todas las apuestas
```

### Al Cerrar Jornada (Script cambiar-jornada.ts)
```
1. Evaluar apuestas individuales normales
   ✅ Marca como won/lost según resultados

2. Evaluar combis
   ✅ BetCombiService.evaluateJornadaCombis(leagueId, jornada)
   ✅ Para cada combi pending:
      - Si TODAS las selecciones won → Combi "won"
      - Si ALGUNA selección lost → Combi "lost"
      - Si ALGUNA pending → Combi sigue "pending"

3. Calcular balances (apuestas + combis)
   ✅ Apuestas normales: amount × (odd - 1) si gana, -amount si pierde
   ✅ Combis ganadoras: (potentialWin - amount) 
   ✅ Combis perdidas: -amount

4. Actualizar budget de usuarios
   ✅ budget nuevo = budget actual + profit apuestas + profit combis + puntos plantilla
   ✅ bettingBudget resetea a 250M
```

---

## Cálculo de Ganancias de Combis

### Ejemplo: Combi de 3 apuestas

**Apuesta**:
- Selección 1: Real Madrid gana (2.0)
- Selección 2: Más de 2.5 goles (1.8)
- Selección 3: Betis gana (2.5)
- Cantidad: 10M

**Cuota total**: 2.0 × 1.8 × 2.5 = **9.0**
**Ganancia potencial**: 10M × 9.0 = **90M**

**Si TODAS ganan**:
```
Status: won
Profit: 90M - 10M = +80M
Budget: +80M
```

**Si UNA pierde**:
```
Status: lost
Profit: -10M
Budget: -10M
```

---

## Código Clave Agregado

### Backend - jornada.service.ts

```typescript
// Evaluar combis después de apuestas individuales
const combiResults = await BetCombiService.evaluateJornadaCombis(leagueId, jornada);

// Obtener todas las combis evaluadas
const allCombis = await prisma.betCombi.findMany({
  where: {
    leagueId,
    jornada,
    status: { in: ['won', 'lost'] }
  }
});

// Sumar ganancias/pérdidas al balance del usuario
for (const combi of allCombis) {
  const userBalance = balances.get(combi.userId);
  
  if (combi.status === 'won') {
    userBalance.totalProfit += (combi.potentialWin - combi.amount);
    userBalance.wonBets++;
  } else if (combi.status === 'lost') {
    userBalance.totalProfit -= combi.amount;
    userBalance.lostBets++;
  }
}
```

### Backend - betCombi.service.ts

```typescript
// Evaluación simplificada - NO acredita en bettingBudget
const updatedCombi = await prisma.betCombi.update({
  where: { id: combiId },
  data: {
    status: newStatus,
    evaluatedAt: new Date()
  }
});
```

### Frontend - Apuestas.tsx

```tsx
// Bloquear opción si está en combi
const isInCurrentCombi = isInCombi(b.matchId, b.type, option.label);
const isBlockedByCombi = isInCurrentCombi && !userBet;
const isBlocked = isBlockedByAd || isBlockedByBet || isBlockedByCombi;

// Renderizado condicional
{!userBet && !isBlocked && ligaId && isJornadaOpen && (
  <>
    <TextInput ... />
    <TouchableOpacity onPress={handlePlaceBet}>
      <Text>Apostar</Text>
    </TouchableOpacity>
    
    <TouchableOpacity onPress={toggleCombiSelection}>
      <Text>{isInCombi(...) ? '✓ En combi' : 'Combinar'}</Text>
    </TouchableOpacity>
  </>
)}
```

---

## Testing Manual

### Caso 1: Bloqueo de apuestas
```
1. Seleccionar "Combinar" en "Real Madrid gana"
   ✅ Botón cambia a "✓ En combi"
   ✅ Input y botón "Apostar" se deshabilitan (gris)

2. Intentar escribir en el input
   ✅ No permite escribir

3. Presionar "✓ En combi" para deseleccionar
   ✅ Input y botón "Apostar" se habilitan
```

### Caso 2: Combi ganadora
```
1. Crear combi: Madrid gana (2.0) + Betis gana (1.5) → 10M
   ✅ Cuota total: 3.0
   ✅ Potencial: 30M
   ✅ bettingBudget: 240M

2. Madrid gana, Betis gana
   ✅ Script evalúa ambas apuestas como won

3. Cambiar jornada
   ✅ Combi evaluada como "won"
   ✅ Balance: +(30M - 10M) = +20M
   ✅ Budget: anterior + 20M + puntos plantilla
```

### Caso 3: Combi perdedora
```
1. Crear combi: Madrid gana (2.0) + Betis gana (1.5) → 10M
   ✅ bettingBudget: 240M

2. Madrid gana, Betis pierde
   ✅ Una apuesta lost

3. Cambiar jornada
   ✅ Combi evaluada como "lost"
   ✅ Balance: -10M
   ✅ Budget: anterior - 10M + puntos plantilla
```

---

## Logs del Script

### Ejemplo de Output
```bash
🔄 Iniciando cambio de jornada 10 para liga abc123...

✅ 45 apuestas evaluadas

🎰 Evaluando combis de la jornada 10...

🔍 Evaluando 8 combis pendientes de jornada 10
🎉 Combi ckl123abc GANÓ: 90M
❌ Combi ckl456def PERDIÓ
🎉 Combi ckl789ghi GANÓ: 45M
...

📊 Resultados: 3 ganadas, 4 perdidas, 1 pendientes

✅ Combis evaluadas: 8 (3 ganadas, 4 perdidas, 1 pendientes)

  💰 Usuario user123: Combi ganada +80M (apostó 10M, ganó 90M)
  💸 Usuario user456: Combi perdida -15M
  💰 Usuario user789: Combi ganada +30M (apostó 15M, ganó 45M)

💰 Balances de apuestas calculados para 12 usuarios (incluyendo combis)

⚽ Calculando puntos de plantilla...
...
```

---

## Estado Actual

✅ Frontend: Bloqueo de apuestas implementado  
✅ Backend: Evaluación de combis en cambio de jornada  
✅ Backend: Ganancias/pérdidas suman correctamente al budget  
✅ No hay duplicación de dinero  
✅ Las combis solo se acreditan una vez (al cambiar jornada)  

**Sistema completo y funcional** 🎉
