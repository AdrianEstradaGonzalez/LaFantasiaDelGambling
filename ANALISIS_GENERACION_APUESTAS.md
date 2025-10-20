# Análisis: Generación y Visualización de Apuestas

## 🔍 Estado Actual del Sistema

### 1. Generación de Apuestas (Backend/Frontend)

**Archivo:** `frontend/services/FutbolService.ts` (líneas 1100-1200)

#### ❌ PROBLEMA IDENTIFICADO: Generación de MÚLTIPLES REGISTROS

El código actual está generando **MÚLTIPLES registros separados** para cada opción:

```typescript
// CÓDIGO ACTUAL (INCORRECTO):
if (t === 'Goles totales' || t === 'Córners' || t === 'Tarjetas') {
  const options = [
    { label: `Más de ${n} ${unit}`, odd: 1.80 },
    { label: `Menos de ${n} ${unit}`, odd: 2.10 }
  ];
  
  // ❌ PROBLEMA: Hace un push por cada opción
  for (const opt of options) {
    bets.push({
      matchId: match.id,
      type: t,
      label: opt.label,  // Cada opción es un registro separado
      odd: opt.odd,
    });
  }
}
```

**Resultado en BD:**
```
bet_option tabla:
├─ id: "liga1_8_123_Goles_totales_Más_de_2.5_goles"
│  matchId: 123
│  betType: "Goles totales"
│  betLabel: "Más de 2.5 goles"
│  odd: 1.80
│
└─ id: "liga1_8_123_Goles_totales_Menos_de_2.5_goles"
   matchId: 123
   betType: "Goles totales"
   betLabel: "Menos de 2.5 goles"
   odd: 2.10
```

### 2. Agrupación en Frontend

**Archivo:** `frontend/pages/apuestas/Apuestas.tsx` (líneas 100-140)

El frontend **agrupa manualmente** los registros duplicados:

```typescript
// CÓDIGO FRONTEND (WORKAROUND):
const grouped: Record<string, GroupedBet> = {};

for (const bet of apuestas) {
  const key = `${bet.matchId}-${bet.type}`;
  
  if (!grouped[key]) {
    grouped[key] = {
      matchId: bet.matchId,
      type: bet.type,
      options: [],  // Array de opciones
    };
  }
  
  // Agrupa múltiples registros en un solo objeto
  grouped[key].options.push({ 
    label: bet.label, 
    odd: bet.odd 
  });
}
```

**Resultado en UI:**
```
GroupedBet {
  matchId: 123,
  type: "Goles totales",
  options: [
    { label: "Más de 2.5 goles", odd: 1.80 },
    { label: "Menos de 2.5 goles", odd: 2.10 }
  ]
}
```

---

## ✅ Solución Correcta: Campo `options` en BD

### Schema Actualizado

**Archivo:** `backend/prisma/schema.prisma`

```prisma
model bet_option {
  id        String   @id
  leagueId  String
  jornada   Int
  matchId   Int
  homeTeam  String
  awayTeam  String
  betType   String
  betLabel  String   // Label general: "Goles totales"
  odd       Float    // Deprecated (mantener para backward compatibility)
  options   Json?    // ✅ NUEVO: [{label: string, odd: number}]
  createdAt DateTime @default(now())
  
  League    League   @relation(...)
}
```

### Nueva Estructura de Datos

**Un solo registro por partido + tipo de apuesta:**

```json
{
  "id": "liga1_8_123_Goles_totales",
  "matchId": 123,
  "betType": "Goles totales",
  "betLabel": "Goles totales",
  "odd": 1.80,
  "options": [
    {"label": "Se marcarán más de 2.5 goles", "odd": 1.80},
    {"label": "Se marcarán menos de 2.5 goles", "odd": 2.10}
  ]
}
```

---

## 🔧 Cambios Necesarios

### 1. Modificar Generación (FutbolService.ts)

**ANTES (líneas 1107-1148):**
```typescript
// ❌ Genera múltiples registros
for (const opt of options) {
  bets.push({
    matchId: match.id,
    type: t,
    label: opt.label,
    odd: opt.odd,
  });
}
```

**DESPUÉS:**
```typescript
// ✅ Genera UN registro con array de options
bets.push({
  matchId: match.id,
  jornada: match.jornada,
  local: match.local,
  visitante: match.visitante,
  type: 'Goles totales',
  label: 'Goles totales',  // Label general
  odd: options[0].odd,     // Primera opción como default
  options: [
    { label: "Más de 2.5 goles", odd: 1.80 },
    { label: "Menos de 2.5 goles", odd: 2.10 }
  ]
});
```

### 2. Actualizar Backend Service

**Archivo:** `backend/src/services/betOption.service.ts` (línea 29)

```typescript
static async saveBetOptions(
  leagueId: string,
  jornada: number,
  options: Array<{
    matchId: number;
    homeTeam: string;
    awayTeam: string;
    betType: string;
    betLabel: string;
    odd: number;
    options?: Array<{label: string; odd: number}>;  // ✅ NUEVO
  }>
) {
  const created = await prisma.bet_option.createMany({
    data: options.map((opt) => ({
      id: `${leagueId}_${jornada}_${opt.matchId}_${opt.betType}`.replace(/\s+/g, '_'),
      leagueId,
      jornada,
      matchId: opt.matchId,
      homeTeam: opt.homeTeam,
      awayTeam: opt.awayTeam,
      betType: opt.betType,
      betLabel: opt.betLabel,
      odd: opt.odd,
      options: opt.options ? JSON.stringify(opt.options) : null,  // ✅ NUEVO
    })),
  });
}
```

### 3. Simplificar Frontend (Apuestas.tsx)

**ANTES (líneas 100-140):**
```typescript
// ❌ Agrupación manual necesaria
const grouped: Record<string, GroupedBet> = {};
for (const bet of apuestas) {
  const key = `${bet.matchId}-${bet.type}`;
  if (!grouped[key]) {
    grouped[key] = { ...bet, options: [] };
  }
  grouped[key].options.push({ label: bet.label, odd: bet.odd });
}
```

**DESPUÉS:**
```typescript
// ✅ No necesita agrupación, ya viene agrupado desde BD
const betsWithOptions = apuestas.map(bet => ({
  ...bet,
  options: bet.options || [{ label: bet.betLabel, odd: bet.odd }]
}));
setGroupedBets(betsWithOptions);
```

---

## 📊 Comparación: Antes vs Después

### Registros en Base de Datos

**ANTES:**
```
Oviedo vs Español:
├─ bet_option #1: "Goles totales" - "Más de 2.5"
├─ bet_option #2: "Goles totales" - "Menos de 2.5"
├─ bet_option #3: "Córners" - "Más de 9.5"
├─ bet_option #4: "Córners" - "Menos de 9.5"
├─ bet_option #5: "Ambos marcan" - "Sí"
└─ bet_option #6: "Ambos marcan" - "No"

TOTAL: 6 registros para 3 tipos de apuesta
```

**DESPUÉS:**
```
Oviedo vs Español:
├─ bet_option #1: "Goles totales" 
│  └─ options: ["Más de 2.5", "Menos de 2.5"]
├─ bet_option #2: "Córners"
│  └─ options: ["Más de 9.5", "Menos de 9.5"]
└─ bet_option #3: "Ambos marcan"
   └─ options: ["Sí", "No"]

TOTAL: 3 registros para 3 tipos de apuesta
```

### Reducción de Datos

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Registros por partido | 6-12 | 3-6 | 50% menos |
| Consultas BD | 1 + agrupación JS | 1 | Más eficiente |
| Validaciones necesarias | Complejas | Simples | Menos bugs |

---

## 🎯 Tipos de Apuesta y sus Opciones

### Goles totales (2 opciones)
```typescript
{
  type: "Goles totales",
  label: "Goles totales",
  options: [
    { label: "Más de 2.5 goles", odd: 1.80 },
    { label: "Menos de 2.5 goles", odd: 2.10 }
  ]
}
```

### Córners (2 opciones)
```typescript
{
  type: "Córners",
  label: "Córners",
  options: [
    { label: "Más de 9.5 córners", odd: 1.75 },
    { label: "Menos de 9.5 córners", odd: 2.15 }
  ]
}
```

### Tarjetas (2 opciones)
```typescript
{
  type: "Tarjetas",
  label: "Tarjetas",
  options: [
    { label: "Más de 4.5 tarjetas", odd: 1.85 },
    { label: "Menos de 4.5 tarjetas", odd: 2.05 }
  ]
}
```

### Ambos marcan (2 opciones)
```typescript
{
  type: "Ambos marcan",
  label: "Ambos marcan",
  options: [
    { label: "Marcan Oviedo y Español", odd: 1.90 },
    { label: "Al menos un equipo no marcará", odd: 2.00 }
  ]
}
```

### Par/Impar (2 opciones)
```typescript
{
  type: "Par/Impar",
  label: "Par/Impar",
  options: [
    { label: "Número impar de goles", odd: 1.95 },
    { label: "Número par de goles", odd: 1.95 }
  ]
}
```

### Resultado (3 opciones) ⚠️ Pendiente
```typescript
{
  type: "Resultado",
  label: "Resultado final",
  options: [
    { label: "Ganará Oviedo", odd: 2.30 },
    { label: "Empate", odd: 3.10 },
    { label: "Ganará Español", odd: 2.80 }
  ]
}
```

---

## 🚨 Problemas del Sistema Actual

### 1. Duplicación de Datos
- ✅ Un partido con 6 tipos de apuesta genera **12-15 registros**
- ❌ Debería generar **6 registros** (uno por tipo)

### 2. Validación Compleja
**Código actual (bet.service.ts):**
```typescript
// ❌ Tiene que buscar TODAS las apuestas del partido para validar
const existingBet = await prisma.bet.findFirst({
  where: {
    leagueId,
    userId,
    matchId,
    betType,
  }
});
```

**Con campo options:**
```typescript
// ✅ Solo necesita validar que no exista apuesta en ese bet_option
const existingBet = await prisma.bet.findFirst({
  where: {
    userId,
    betOptionId,  // ID único del bet_option
  }
});
```

### 3. Agrupación Manual en Frontend
- ❌ Frontend tiene que agrupar registros duplicados
- ❌ Código repetitivo y propenso a errores
- ✅ Con `options`, viene pre-agrupado desde BD

### 4. IDs Redundantes
**ANTES:**
```
liga1_8_123_Goles_totales_Más_de_2.5_goles
liga1_8_123_Goles_totales_Menos_de_2.5_goles
```

**DESPUÉS:**
```
liga1_8_123_Goles_totales
```

---

## 📋 Plan de Migración

### Paso 1: Aplicar Schema ✅
```bash
cd backend
npx prisma db push
```

### Paso 2: Regenerar Cliente ⏳
```bash
npx prisma generate
```

### Paso 3: Modificar FutbolService.ts ⏳
Cambiar generación para crear UN registro con `options` array

### Paso 4: Actualizar betOption.service.ts ⏳
Guardar campo `options` en BD

### Paso 5: Simplificar Apuestas.tsx ⏳
Eliminar lógica de agrupación manual

### Paso 6: Migrar Datos Existentes ⏳
Consolidar registros duplicados en uno con `options`

---

## 🎨 UI Propuesta

### Card de Apuesta (UN registro, múltiples opciones)

```
┌─────────────────────────────────────────────┐
│  🏟️ Real Oviedo vs Español                 │
│  📅 21/10 - 18:30                           │
├─────────────────────────────────────────────┤
│  GOLES TOTALES                              │
│                                             │
│  ○ Más de 2.5 goles           📊 1.80      │
│  ○ Menos de 2.5 goles         📊 2.10      │
│                                             │
│  [Apostar 10M] [Ver detalles]              │
└─────────────────────────────────────────────┘
```

**Interacción:**
1. Usuario selecciona **UNA** opción (radio button)
2. Ingresa monto
3. Al confirmar:
   - Se crea registro en tabla `bet`
   - `betType`: "Goles totales"
   - `betLabel`: "Más de 2.5 goles" (la seleccionada)
   - `odd`: 1.80 (de la opción seleccionada)

---

## ✅ Ventajas de la Nueva Estructura

1. **Reducción de Datos:**
   - 50% menos registros en `bet_option`
   - IDs más simples y cortos

2. **Código Más Simple:**
   - No necesita agrupación en frontend
   - Validaciones más directas
   - Menos consultas a BD

3. **Mejor Performance:**
   - Menos registros = consultas más rápidas
   - Menos procesamiento en frontend

4. **Escalabilidad:**
   - Fácil agregar más opciones (ej: Resultado con 3 opciones)
   - Estructura flexible para futuros tipos de apuesta

5. **Mantenibilidad:**
   - Código más limpio y entendible
   - Menos bugs potenciales
   - Más fácil de testear

---

**Estado Actual:** ⚠️ Sistema funcional pero ineficiente (genera registros duplicados)
**Próximo Paso:** Ejecutar `npx prisma db push` y `npx prisma generate`
**Fecha Análisis:** 20 de octubre de 2025
