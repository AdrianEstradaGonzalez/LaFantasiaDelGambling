# ✅ CONFIRMACIÓN: Cálculo de Puntos por Jornada

## 📌 Respuesta Directa

**SÍ, calcula SOLO los puntos de la ÚLTIMA jornada.**

## 🔍 Explicación Detallada

### 1. ¿Qué jornada se calcula?

Cuando se cierra la jornada (al presionar "Abrir Cambios"), el sistema:

```typescript
// Línea 916 - jornada.service.ts
const jornada = league.currentJornada;  // Ejemplo: jornada = 5

// Línea 936 - Se pasa esa jornada específica
const squadPoints = await this.calculateSquadPoints(member.userId, leagueId, jornada);
```

**Ejemplo**: Si la liga está en **jornada 5**, calcula puntos de la **jornada 5**.

---

### 2. ¿Qué hace el método `calculateSquadPoints`?

**Línea 398-399**:
```typescript
// Buscar la última jornada con estadísticas disponibles
const jornada = await this.findLastCompletedJornada(jornadaObjetivo);
console.log(`Calculando puntos para jornadaObjetivo=${jornadaObjetivo}, jornadaUsada=${jornada}`);
```

**Parámetros**:
- `jornadaObjetivo`: La jornada que se quiere cerrar (ej: jornada 5)
- `jornada`: La jornada que realmente se usa para calcular (normalmente la misma)

---

### 3. ¿Qué hace `findLastCompletedJornada`?

**Línea 329-393**:

Este método busca **hacia atrás** desde la jornada objetivo hasta encontrar una jornada con partidos terminados:

```typescript
public static async findLastCompletedJornada(targetJornada: number): Promise<number> {
  // Intentar desde la jornada objetivo hacia atrás (5, 4, 3, 2, 1...)
  for (let j = targetJornada; j >= 1; j--) {
    // Obtener partidos de la jornada j
    const fixtures = await api.get('/fixtures', {
      params: {
        league: 140,
        round: `Regular Season - ${j}`
      }
    });
    
    // Verificar si hay partidos terminados
    const hasFinishedMatches = fixtures.some(f => 
      ['FT', 'AET', 'PEN'].includes(f.fixture.status.short)
    );
    
    if (hasFinishedMatches) {
      console.log(`✅ Jornada ${j} tiene partidos terminados. Usando esta jornada.`);
      return j;  // ✅ Devuelve la jornada encontrada
    }
  }
  
  // Si no encuentra ninguna, usa la objetivo
  return targetJornada;
}
```

**Propósito**: 
- Asegurar que se calculan puntos de una jornada **con partidos ya jugados**
- Si la jornada objetivo (ej: 5) aún no tiene partidos terminados, usa la jornada anterior (ej: 4)

---

### 4. ¿Cómo calcula los puntos de cada jugador?

**Líneas 506-530**:

Una vez determinada la jornada a usar, el sistema:

```typescript
// Obtiene partidos de SOLO esa jornada específica
const fixturesResponse = await axios.get('/fixtures', {
  params: {
    league: 140,
    season: 2025,
    round: `Regular Season - ${jornada}`  // ✅ Solo jornada 5
  }
});
```

**Para cada jugador**:
1. Busca el partido de su equipo en **esa jornada específica**
2. Obtiene sus estadísticas de **ese partido único**
3. Calcula puntos basados en **ese partido**

**Ejemplo**:
```
Jornada 5 - Barcelona vs Real Madrid

Lewandowski:
  ✅ Partido de jornada 5: Barcelona vs Real Madrid
  📊 Estadísticas de ese partido:
     - 90 minutos
     - 2 goles
     - 1 asistencia
  💰 Puntos: 15 (solo de este partido)
```

**NO suma** puntos de jornadas anteriores:
```
❌ NO hace esto:
Lewandowski:
  Jornada 1: 8 puntos
  Jornada 2: 12 puntos
  Jornada 3: 6 puntos
  Jornada 4: 10 puntos
  Jornada 5: 15 puntos
  Total: 51 puntos ← NO

✅ SÍ hace esto:
Lewandowski:
  Jornada 5: 15 puntos ← SOLO ESTA
```

---

### 5. ¿Qué pasa con los puntos acumulados?

Los puntos **totales** del usuario se acumulan en la tabla `LeagueMember`:

**Línea 967-968**:
```typescript
// Actualizar puntos totales (ACUMULADO)
const newTotalPoints = member.points + balance.squadPoints;
//                     ^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^
//                     Puntos previos   Puntos jornada actual
```

**Ejemplo**:
```
ANTES de cerrar jornada 5:
  member.points = 120  (suma de jornadas 1+2+3+4)

DESPUÉS de cerrar jornada 5:
  squadPoints = 45     (puntos SOLO de jornada 5)
  newTotalPoints = 120 + 45 = 165
  
  member.points = 165  ← ACTUALIZADO
```

---

## 📊 Flujo Completo con Ejemplo

### Situación: Cerrando Jornada 5

```
1. Liga actual:
   currentJornada = 5

2. Se llama:
   calculateSquadPoints(userId, leagueId, 5)
                                           ↑
                                    jornada objetivo

3. findLastCompletedJornada(5):
   - ¿Jornada 5 tiene partidos terminados? ✅ SÍ
   - Devuelve: 5

4. Para cada jugador de la plantilla:
   - Busca fixtures de jornada 5 ← SOLO JORNADA 5
   - Busca el partido de su equipo en jornada 5
   - Obtiene estadísticas de ese partido
   - Calcula puntos de ese partido

5. Suma los puntos de los 11 jugadores:
   Jugador 1: 8 puntos (jornada 5)
   Jugador 2: 6 puntos (jornada 5)
   ...
   Jugador 11: 5 puntos (jornada 5)
   --------------------------------
   Total: 45 puntos ← SOLO DE JORNADA 5

6. Actualiza puntos totales:
   Puntos anteriores: 120 (jornadas 1-4)
   Puntos jornada 5: 45
   Nuevo total: 165
```

---

## 🎯 Casos Especiales

### Caso 1: Jornada objetivo sin partidos terminados

```
Situación: Es lunes y la jornada 5 aún no ha terminado

findLastCompletedJornada(5):
  - ¿Jornada 5 tiene partidos terminados? ❌ NO
  - ¿Jornada 4 tiene partidos terminados? ✅ SÍ
  - Devuelve: 4 ← USA JORNADA ANTERIOR

Resultado:
  - Calcula puntos de jornada 4 (la última completada)
  - Al usuario se le suman los puntos de jornada 4
  - Cuando la jornada 5 termine, se pueden recalcular
```

### Caso 2: Primera jornada

```
Situación: Cerrando jornada 1

calculateSquadPoints(userId, leagueId, 1):
  - Busca fixtures de jornada 1 únicamente
  - Calcula puntos SOLO de jornada 1
  - member.points = 0 + 45 = 45 (primer acumulado)
```

### Caso 3: Jugador no jugó en esa jornada

```
Situación: Jugador lesionado en jornada 5

Proceso:
  - Busca partido de jornada 5 ✅
  - Busca estadísticas del jugador en ese partido ❌ No encontrado
  - Puntos del jugador: 0
  
Plantilla:
  10 jugadores con puntos
  1 jugador sin puntos (0)
  Total: suma de los 10
```

---

## ✅ Confirmación Final

### ¿Calcula solo la última jornada?
**SÍ** ✅

### ¿Suma todas las jornadas anteriores?
**NO** ❌ - Solo calcula la jornada actual/última completada

### ¿Dónde se acumulan los puntos?
En `LeagueMember.points`:
```typescript
points = points_anteriores + puntos_jornada_actual
```

### ¿Los puntos de jornadas pasadas se pierden?
**NO** - Se mantienen acumulados en `LeagueMember.points`

---

## 📝 Resumen

| Concepto | Valor | Descripción |
|----------|-------|-------------|
| **Jornada calculada** | 1 jornada | Solo la jornada actual (o última completada) |
| **Puntos por jugador** | De 1 partido | Del partido de esa jornada específica |
| **Puntos de plantilla** | Suma de 11 jugadores | Solo de esa jornada |
| **Puntos totales** | Acumulado | Suma de todas las jornadas procesadas |
| **Storage en BD** | `LeagueMember.points` | Se acumula jornada tras jornada |

---

## 🔍 Código Clave

```typescript
// 1. Se define la jornada a calcular
const jornada = league.currentJornada;  // Ej: 5

// 2. Se busca la última jornada con partidos terminados
const jornadaUsada = await findLastCompletedJornada(jornada);  // Ej: 5

// 3. Se obtienen fixtures SOLO de esa jornada
const fixtures = await api.get('/fixtures', {
  params: { round: `Regular Season - ${jornadaUsada}` }  // ✅ Solo jornada 5
});

// 4. Se calculan puntos SOLO de esa jornada
const squadPoints = calculatePoints(stats_jornada_5);  // ✅ Solo jornada 5

// 5. Se ACUMULAN los puntos totales
const newTotalPoints = member.points + squadPoints;
//                     ^^^^^^^^^^^^^^   ^^^^^^^^^^^
//                     Jornadas 1-4     Jornada 5
```

---

**Fecha**: 2025-01-20  
**Archivo analizado**: `backend/src/services/jornada.service.ts`  
**Métodos clave**:
- `closeJornada()` - Línea 895
- `calculateSquadPoints()` - Línea 395
- `findLastCompletedJornada()` - Línea 329
