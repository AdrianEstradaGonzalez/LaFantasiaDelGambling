# ⚽ ACTUALIZACIÓN: Reglas de Portería a Cero y Goles Encajados

## 📋 Cambios Implementados

### 1. **MEDIOCAMPISTAS (Midfielder)** 🔄

#### ❌ **Eliminado:**
- Puntos por portería a cero (+1)
- Penalización por goles encajados (-1 cada 2 goles)

#### ✅ **Resultado:**
Los mediocampistas ahora **NO reciben ni pierden puntos** relacionados con la defensa del equipo.

---

### 2. **PORTEROS (Goalkeeper)** ✅

#### ✅ **Sin cambios - Ya funciona correctamente:**

**Fuente de datos:** `stats.goalkeeper.conceded` (goles encajados por el portero específicamente)

```typescript
const conceded = Number(stats.goalkeeper?.conceded ?? goals.conceded ?? 0);
```

**Puntos:**
- **Portería a cero:** +5 puntos (si jugó ≥60 min y `conceded === 0`)
- **Goles encajados:** -2 puntos por cada gol encajado

**Ejemplo:**
- Portero jugó 90 minutos, no encajó goles → +5 puntos
- Portero jugó 90 minutos, encajó 2 goles → -4 puntos
- Portero jugó 50 minutos → No aplica portería a cero

---

### 3. **DEFENSAS (Defender)** 🔄

#### ❌ **Eliminado:**
- Penalización por goles encajados (-1 por gol)

#### ✅ **Modificado:**
**Portería a cero:** Ahora usa los goles del **EQUIPO COMPLETO** (no del portero)

```typescript
// Usa goals.conceded (goles del equipo en TODO el partido)
const teamConceded = Number(goals.conceded ?? 0);
if (meetsCleanSheetMinutes && teamConceded === 0) {
  add('Portería a cero', 'Sí', DEFENDER_POINTS.CLEAN_SHEET);
}
```

**Puntos:**
- **Portería a cero:** +4 puntos (si jugó >60 min y el equipo no recibió goles)
- **Goles encajados:** 0 puntos (sin penalización)

**Ejemplo:**
- Defensa jugó 90 minutos, equipo no recibió goles → +4 puntos
- Defensa jugó 90 minutos, equipo recibió 3 goles → 0 puntos (sin penalización)
- Defensa jugó 55 minutos, equipo no recibió goles → 0 puntos (no jugó >60 min)

---

## 📊 Comparativa de Cambios

### MEDIOCAMPISTAS

| Situación | ANTES | AHORA |
|-----------|-------|-------|
| Jugó 90 min, equipo 0 goles | +1 punto | 0 puntos |
| Jugó 90 min, equipo 2 goles | -1 punto | 0 puntos |
| Jugó 90 min, equipo 4 goles | -2 puntos | 0 puntos |

### DEFENSAS

| Situación | ANTES | AHORA |
|-----------|-------|-------|
| Jugó 90 min, equipo 0 goles | +4 puntos | +4 puntos ✅ |
| Jugó 90 min, equipo 2 goles | +4 -2 = +2 | 0 puntos ✅ |
| Jugó 90 min, equipo 4 goles | +4 -4 = 0 | 0 puntos ✅ |
| Jugó 55 min, equipo 0 goles | 0 puntos | 0 puntos |

### PORTEROS (sin cambios)

| Situación | ANTES | AHORA |
|-----------|-------|-------|
| Jugó 90 min, encajó 0 | +5 puntos | +5 puntos ✅ |
| Jugó 90 min, encajó 2 | +5 -4 = +1 | +5 -4 = +1 ✅ |
| Jugó 90 min, encajó 5 | +5 -10 = -5 | +5 -10 = -5 ✅ |

---

## 🔍 Diferencias Técnicas Importantes

### PORTEROS vs DEFENSAS: Fuente de Datos Diferente

#### **Porteros:**
```typescript
// Usa stats.goalkeeper.conceded (goles encajados POR EL PORTERO)
const conceded = Number(stats.goalkeeper?.conceded ?? goals.conceded ?? 0);
```

**Ejemplo:** Si un portero fue sustituido al minuto 60 habiendo encajado 1 gol, y luego el equipo encajó 2 más con el portero suplente:
- `stats.goalkeeper.conceded` = **1** (solo los del portero titular)
- `goals.conceded` (equipo) = **3** (todos los del partido)
- **Penalización portero:** -2 puntos (solo por el gol que él encajó)

#### **Defensas:**
```typescript
// Usa goals.conceded (goles del EQUIPO en TODO el partido)
const teamConceded = Number(goals.conceded ?? 0);
```

**Ejemplo:** Si un defensa jugó 90 minutos y el equipo encajó 3 goles:
- `goals.conceded` = **3**
- **Resultado:** 0 puntos por portería a cero (teamConceded > 0)
- **Penalización:** NINGUNA (ya no se penaliza)

---

## 💡 Lógica de Portería a Cero

### Requisitos (TODAS LAS POSICIONES que aplican):

```typescript
const meetsCleanSheetMinutes = minutes >= 60;
const teamConceded === 0; // Para defensas
const porteroConced === 0; // Para porteros
```

**Condiciones:**
1. ✅ Jugó **60 minutos o más**
2. ✅ No se encajaron goles (portero: los suyos, defensa: todo el equipo)

**Ejemplos:**

| Posición | Minutos | Goles Equipo | Goles Portero | Resultado |
|----------|---------|--------------|---------------|-----------|
| Defensa | 90 | 0 | N/A | +4 puntos ✅ |
| Defensa | 90 | 1 | N/A | 0 puntos |
| Defensa | 59 | 0 | N/A | 0 puntos (no jugó 60 min) |
| Portero | 90 | N/A | 0 | +5 puntos ✅ |
| Portero | 90 | N/A | 1 | -2 puntos |
| Portero | 59 | N/A | 0 | 0 puntos (no jugó 60 min) |
| Mediocampista | 90 | 0 | N/A | 0 puntos (ya no aplica) |

---

## 📝 Resumen de Impacto

### ✅ **Beneficiados:**
- **Defensas:** Ya no pierden puntos por goles encajados
- **Mediocampistas:** Ya no pierden puntos por goles encajados

### ⚖️ **Sin cambios:**
- **Porteros:** Siguen con las mismas reglas (usan `stats.goalkeeper.conceded`)
- **Delanteros:** No tienen reglas de portería a cero

### 🎯 **Objetivo:**
- Hacer que las posiciones defensivas (excepto porteros) no sean penalizadas injustamente
- Los porteros siguen siendo evaluados por su rendimiento individual (`goalkeeper.conceded`)
- Los defensas reciben bonus por portería a cero del equipo, pero sin penalizaciones

---

## 🧪 Testing

Para verificar los cambios, prueba con estos casos:

### Caso 1: Defensa - Partido 0-0
```typescript
stats = {
  games: { minutes: 90 },
  goals: { conceded: 0, total: 0 }
}
role = 'Defender'
// Esperado: +4 puntos por portería a cero
```

### Caso 2: Defensa - Partido perdido 0-3
```typescript
stats = {
  games: { minutes: 90 },
  goals: { conceded: 3, total: 0 }
}
role = 'Defender'
// Esperado: 0 puntos (sin penalización por goles)
```

### Caso 3: Mediocampista - Partido 0-0
```typescript
stats = {
  games: { minutes: 90 },
  goals: { conceded: 0, total: 0 }
}
role = 'Midfielder'
// Esperado: 0 puntos (ya no tiene bonus por portería)
```

### Caso 4: Portero - Encajó 2 goles
```typescript
stats = {
  games: { minutes: 90 },
  goalkeeper: { conceded: 2 },
  goals: { conceded: 2 }
}
role = 'Goalkeeper'
// Esperado: -4 puntos (2 goles × -2 puntos)
```

---

## 📦 Archivos Modificados

```
shared/
  └── pointsCalculator.ts  ← ✅ Actualizado
      ├── Goalkeeper: Sin cambios (ya correcto)
      ├── Defender: Eliminada penalización por goles
      └── Midfielder: Eliminados puntos y penalizaciones defensivas
```

---

**Fecha:** 20 de octubre de 2025  
**Cambios:** Reglas de portería a cero y goles encajados  
**Afecta a:** Defensas y Mediocampistas  
**Estado:** ✅ Implementado y listo para testing
