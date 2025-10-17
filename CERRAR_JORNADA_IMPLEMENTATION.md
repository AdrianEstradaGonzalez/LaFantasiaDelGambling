# 🔒 Implementación de Cerrar Jornada

## ✅ COMPLETADO

### 🎯 Funcionalidad Implementada

La función **`closeJornada(leagueId)`** ahora ejecuta el proceso completo de cierre de jornada:

---

## 📋 Proceso Paso a Paso

### 1. **Evaluar Apuestas** 🎲
- Obtiene todas las apuestas de la jornada actual
- Llama a la API de Football para obtener resultados de partidos
- Evalúa cada apuesta según su tipo:
  - **Goles totales**: Más/Menos de X goles
  - **Goles exactos**: Exactamente X goles
  - **Córners**: Más/Menos de X córners
  - **Tarjetas**: Más/Menos de X tarjetas
  - **Resultado**: Victoria local/empate/visitante
  - **Ambos marcan**: Sí/No
  - **Par/Impar**: Goles pares/impares
  - Y más tipos...
- Actualiza estado de cada apuesta: `"won"` o `"lost"`

### 2. **Calcular Balances de Apuestas** 💰
Para cada usuario:
- **Apuesta ganada**: `+ (amount × odd)`
- **Apuesta perdida**: `- amount`
- **Suma total**: Resultado neto de todas las apuestas

### 3. **Calcular Puntos de Plantilla** ⚽
Para cada usuario:
- Obtiene su `Squad` (plantilla) para la liga
- Para cada `SquadPlayer`:
  - Llama a la API de Football para estadísticas del jugador en la jornada
  - Calcula puntos según sistema DreamLeague:
    
    **Sistema de Puntuación:**
    - **Base**: 1-2 puntos por minutos jugados
    - **Goles**: 4-10 puntos según posición (POR=10, DEL=4)
    - **Asistencias**: +3 puntos
    - **Portería a cero**: +5 puntos (POR), +4 (DEF), +1 (MID)
    - **Tarjetas**: -1 amarilla, -3 roja
    - **Penaltis**: +3 anotado, -2 fallado, +5 parado (POR)
    - **Pases clave**: +1 por pase (MID/DEL)
    - **Tiros a puerta**: +1 por tiro
    - **Duelos/tackles**: Puntos variables según posición
    - **Capitán**: Puntos × 2

  - Si es capitán (`isCaptain = true`): puntos × 2
- **Suma total**: Puntos de todos los jugadores

### 4. **Actualizar LeagueMember** 📊

Para cada miembro de la liga:

```typescript
// Cálculo del nuevo presupuesto
budget = 500 (base fija)
       + puntos_plantilla_jornada 
       + resultado_apuestas

// Actualizar puntos totales acumulados
points += puntos_plantilla_jornada

// Resetear presupuesto de apuestas
bettingBudget = 250 (siempre)

// initialBudget NO SE TOCA
initialBudget = 500 (siempre)
```

**Ejemplo:**
```
Usuario: Juan
Presupuesto anterior: 480M
Base: 500M
Apuestas: 2W/1L = +15M
Plantilla: 45 puntos = +45M
Nuevo presupuesto: 500 + 45 + 15 = 560M
Puntos totales: 120 + 45 = 165 puntos
```

### 5. **Vaciar Plantillas** 🗑️
- Elimina TODOS los registros de `SquadPlayer` de todas las plantillas de la liga
- Los usuarios deberán crear nueva plantilla para la siguiente jornada

### 6. **Limpiar Apuestas** 🗑️
- Elimina todas las `bet_option` de la jornada actual (opciones viejas)
- Elimina todas las `Bet` con status `"won"` o `"lost"` (ya procesadas)
- Las apuestas pendientes se mantienen

### 7. **Avanzar Jornada** ⏭️
```typescript
currentJornada += 1
jornadaStatus = "open"
```

---

## 🚀 Endpoints Disponibles

### 1. Cerrar una liga específica
```typescript
POST /jornada/close/:leagueId
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Jornada 9 cerrada exitosamente. Nueva jornada: 10",
  "leagueName": "Mi Liga",
  "jornada": 10,
  "evaluations": [
    { "betId": "...", "won": true, "profit": 15 },
    { "betId": "...", "won": false, "profit": -10 }
  ],
  "updatedMembers": 8,
  "clearedSquads": 8,
  "deletedBetOptions": 50
}
```

### 2. Cerrar TODAS las ligas
```typescript
POST /jornada/close-all
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Jornada cerrada para 5 ligas",
  "leaguesProcessed": 5,
  "totalEvaluations": 87,
  "totalUpdatedMembers": 42,
  "totalClearedSquads": 42,
  "leagues": [
    {
      "id": "...",
      "name": "Liga 1",
      "oldJornada": 9,
      "newJornada": 10,
      "evaluations": 20,
      "updatedMembers": 10,
      "clearedSquads": 10
    },
    // ...
  ]
}
```

---

## 🔍 Logs Detallados

El proceso genera logs detallados en consola:

```
🔒 CERRANDO JORNADA 9 para liga "Mi Liga" (clh9s...)

📊 1. Evaluando apuestas de jornada 9...
  ✅ Apuesta ID abc123 → GANADA (Real Madrid ganó)
  ❌ Apuesta ID def456 → PERDIDA (No hubo más de 2.5 goles)
✅ 25 apuestas evaluadas

💰 2. Calculando balances de apuestas...
✅ Balances calculados para 8 usuarios

⚽ 3. Calculando puntos de plantilla...
  👤 Juan:
      📅 Encontrados 10 partidos en jornada 9
      ⚽ Courtois: 8 puntos
      ⚽ Carvajal: 6 puntos
      ⚽ Benzema (C): 14 puntos (×2 = 28)
      📊 TOTAL PUNTOS PLANTILLA: 42
✅ Puntos de plantilla calculados

💵 4. Actualizando presupuestos...
  👤 Usuario Juan:
     Presupuesto anterior: 480M
     Base: 500M
     Apuestas: 2W/1L = +15M
     Plantilla: 42 puntos = +42M
     Nuevo presupuesto: 557M
     Puntos totales: 120 → 162
✅ 8 miembros actualizados

🗑️  5. Vaciando plantillas...
✅ 8 plantillas vaciadas

🗑️  6. Eliminando opciones de apuestas antiguas...
✅ 50 opciones de apuestas eliminadas

🗑️  7. Eliminando apuestas evaluadas...
✅ 25 apuestas eliminadas

⏭️  8. Avanzando jornada...
✅ Liga avanzada a jornada 10 con estado "open"

🎉 JORNADA 9 CERRADA EXITOSAMENTE

📊 Resumen:
   - 25 apuestas evaluadas
   - 8 miembros actualizados
   - 8 plantillas vaciadas
   - 50 opciones de apuestas eliminadas
   - Jornada actual: 10
```

---

## ⚠️ Consideraciones Importantes

### Rate Limiting de API
- La API de Football tiene límites de peticiones
- El código incluye pausas (`setTimeout`) entre requests
- Si hay muchos jugadores, el proceso puede tardar varios minutos

### Errores en Evaluación
- Si un partido no ha terminado, no se evalúa la apuesta
- Si falla obtener estadísticas de un jugador, se asignan 0 puntos
- El proceso continúa aunque haya errores individuales

### Estado de Jornada
- Después de cerrar: `jornadaStatus = "open"`
- Esto permite:
  - ✅ Hacer cambios en alineación
  - ✅ Fichar/vender jugadores
  - ✅ Crear nueva plantilla
- El frontend debe generar nuevas opciones de apuestas para la nueva jornada

### Presupuesto Base
- `initialBudget` SIEMPRE es 500M (nunca cambia)
- `budget` se recalcula cada jornada: 500 + puntos + apuestas
- `bettingBudget` SIEMPRE se resetea a 250M

---

## 🧪 Testing

Para probar el cierre de jornada:

1. **Crear apuestas de prueba**:
   - Varios usuarios hacen apuestas en la jornada actual
   - Asegúrate de que los partidos hayan terminado

2. **Crear plantillas**:
   - Los usuarios tienen jugadores en sus plantillas
   - Asegúrate de que los jugadores hayan jugado en la jornada

3. **Ejecutar cierre**:
   ```bash
   POST /jornada/close/:leagueId
   ```

4. **Verificar**:
   - ✅ Apuestas tienen status `won`/`lost`
   - ✅ `LeagueMember.points` incrementados
   - ✅ `LeagueMember.budget` recalculado
   - ✅ `bettingBudget` = 250
   - ✅ `SquadPlayer` vacíos
   - ✅ `bet_option` eliminadas de jornada anterior
   - ✅ `currentJornada` incrementada
   - ✅ `jornadaStatus` = "open"

---

## 📁 Archivos Modificados

### Backend
- ✅ `backend/src/services/jornada.service.ts` - Modificado `closeJornada()` y `closeAllJornadas()`

### Funciones Existentes Reutilizadas
- ✅ `calculatePlayerPoints()` - Sistema de puntuación
- ✅ `calculateSquadPoints()` - Suma puntos de plantilla
- ✅ `evaluateBet()` - Evalúa apuesta individual
- ✅ `evaluateJornadaBets()` - Evalúa todas las apuestas
- ✅ `calculateUserBalances()` - Calcula balances de apuestas

---

## 🎯 Estado: LISTO PARA PRODUCCIÓN ✅

Todo el sistema de cierre de jornada está completamente implementado y listo para usar.
