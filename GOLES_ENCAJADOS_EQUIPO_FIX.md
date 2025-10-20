# 🛡️ FIX: Goles encajados del equipo para defensas

## 🎯 Problema identificado

Los defensas necesitan que se calcule la "portería a cero" basándose en los **goles encajados por el equipo** en ese partido, pero el código estaba usando los datos individuales del jugador (`stats.goals.conceded`), que no siempre están disponibles o son correctos para jugadores de campo.

## ✅ Solución implementada

### 1. **Extracción de goles del equipo desde el fixture**

En `backend/src/services/playerStats.service.ts`, después de obtener el `teamFixture`:

```typescript
// ✨ Extraer goles del equipo desde el fixture
const teamId = playerTeamIds[0];
const isHome = teamFixture.teams?.home?.id === teamId;
const teamGoalsConceded = isHome 
  ? Number(teamFixture.goals?.away ?? 0)  // Si juega en casa, goles del visitante
  : Number(teamFixture.goals?.home ?? 0); // Si juega fuera, goles del local
```

### 2. **Inyección de goles del equipo en las estadísticas**

Antes de calcular los puntos, se agregan los goles del equipo a las stats:

```typescript
// ✨ Agregar goles encajados del equipo a las stats para defensas/porteros
const statsWithTeamGoals = {
  ...playerStats,
  goals: {
    ...playerStats.goals,
    conceded: teamGoalsConceded, // Usar goles del equipo desde fixture
  },
};

const pointsResult = calculatePlayerPoints(statsWithTeamGoals, role);
```

### 3. **El calculador ya usa estos datos correctamente**

En `shared/pointsCalculator.ts`, los defensas ya tienen la lógica correcta:

```typescript
// Portería a cero (SOLO si jugó >60 min y el equipo no recibió goles)
const teamConceded = Number(goals.conceded ?? 0);
if (meetsCleanSheetMinutes && teamConceded === 0) {
  add('Portería a cero', 'Sí', DEFENDER_POINTS.CLEAN_SHEET);
}
```

## 🔍 Cómo funciona ahora

1. **Se obtiene el fixture del partido** donde jugó el jugador
2. **Se identifica si el equipo jugó como local o visitante**
3. **Se extraen los goles encajados** del resultado del partido:
   - Si jugó en casa → goles del equipo visitante
   - Si jugó fuera → goles del equipo local
4. **Se inyectan estos goles** en `goals.conceded` antes de calcular puntos
5. **El calculador usa estos datos** para determinar "portería a cero"

## 📊 Ejemplo práctico

**Partido: Real Madrid (local) 3 - 0 Barcelona (visitante)**

- **Defensa del Real Madrid:**
  - `teamGoalsConceded = 0` (goles del Barcelona)
  - Si jugó ≥60 min → **+5 puntos por portería a cero** ✅

- **Defensa del Barcelona:**
  - `teamGoalsConceded = 3` (goles del Real Madrid)
  - NO obtiene portería a cero ❌

## 🎯 Beneficios

1. ✅ **Datos correctos**: Usa el resultado oficial del partido
2. ✅ **Consistencia**: Todos los defensas del mismo equipo ven los mismos goles encajados
3. ✅ **Confiabilidad**: No depende de stats individuales que pueden estar incompletas
4. ✅ **Transparencia**: El usuario ve "Goles encajados: 0" con los puntos de portería a cero incluidos

## 🔄 Afectados por este cambio

- **Defensas**: Ahora calculan correctamente la portería a cero
- **Porteros**: También se benefician (aunque ellos ya tenían `goalkeeper.conceded`)
- **Medios/Delanteros**: No afectados (no usan esta estadística)

---

**Fecha de implementación:** 20 de octubre de 2025  
**Archivos modificados:**
- `backend/src/services/playerStats.service.ts` (extracción e inyección)
- Ya existía correctamente en `shared/pointsCalculator.ts`
