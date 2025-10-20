# Estructura de Apuestas con Opciones Múltiples

## 🎯 Objetivo Final

**ANTES:** Cada partido tenía múltiples apuestas separadas
```
- Oviedo vs Español | Apuesta #1: "Más de 2.5 goles" (odd: 1.8)
- Oviedo vs Español | Apuesta #2: "Menos de 2.5 goles" (odd: 2.1)
- Oviedo vs Español | Apuesta #3: "Marcan ambos" (odd: 1.9)
```

**AHORA:** Cada partido tiene UNA apuesta con múltiples opciones
```
- Oviedo vs Español | Apuesta: "Goles totales" 
  Opciones:
    - "Más de 2.5 goles" (odd: 1.8)
    - "Menos de 2.5 goles" (odd: 2.1)
    
- Oviedo vs Español | Apuesta: "Ambos marcan"
  Opciones:
    - "Marcan Oviedo y Español" (odd: 1.9)
    - "Al menos uno no marca" (odd: 2.2)
```

---

## ✅ Cambios Completados

### 1. Schema de Base de Datos ✅

**Archivo:** `backend/prisma/schema.prisma`

**Cambio:**
```prisma
model bet_option {
  id        String   @id
  leagueId  String
  jornada   Int
  matchId   Int
  homeTeam  String
  awayTeam  String
  betType   String
  betLabel  String   // Ahora es label general (ej: "Goles totales")
  odd       Float    @default(1.0) // Deprecated, usar options
  options   Json?    // NUEVO: Array de {label: string, odd: number}
  createdAt DateTime @default(now())
  League    League   @relation(...)
}
```

### 2. Generación de Apuestas ✅

**Archivo:** `frontend/services/FutbolService.ts`

**Modificaciones:**
- ✅ Goles totales: Genera UNA apuesta con 2 opciones (Más de X, Menos de X)
- ✅ Córners: Genera UNA apuesta con 2 opciones (Más de X, Menos de X)
- ✅ Tarjetas: Genera UNA apuesta con 2 opciones (Más de X, Menos de X)
- ✅ Ambos marcan: Genera UNA apuesta con 2 opciones (Sí, No)
- ✅ Par/Impar: Genera UNA apuesta con 2 opciones (Par, Impar)
- ⏳ Resultado: Pendiente - debería tener 3 opciones (Local, Empate, Visitante)

**Estructura generada:**
```typescript
{
  matchId: 123,
  jornada: 8,
  local: "Oviedo",
  visitante: "Español",
  type: "Goles totales",
  label: "Goles totales", // Label general
  odd: 1.8, // Odd de primera opción (default)
  options: [
    { label: "Se marcarán más de 2.5 goles", odd: 1.8 },
    { label: "Se marcarán menos de 2.5 goles", odd: 2.1 }
  ]
}
```

### 3. Funciones Modificadas ✅

**Líneas modificadas en `FutbolService.ts`:**

1. **Generación normal (con API de odds):**
   - Líneas ~1109-1148: Goles/Córners/Tarjetas
   - Líneas ~1150-1170: Ambos marcan
   - Líneas ~1172-1194: Par/Impar

2. **Generación fallback (cuando falla API):**
   - Líneas ~1000-1026: Goles/Córners/Tarjetas
   - Líneas ~1028-1050: Ambos marcan
   - Líneas ~1052-1074: Par/Impar

3. **Función `generateSyntheticBet()`:**
   - Líneas ~1290-1370: Todos los tipos

**Cambio clave en todos:**
```typescript
// ANTES: Solo una opción
bets.push({
  ...matchInfo,
  type: 'Goles totales',
  label: 'Más de 2.5 goles',
  odd: 1.8
});

// AHORA: Una apuesta con múltiples opciones
const options = [
  { label: 'Más de 2.5 goles', odd: 1.8 },
  { label: 'Menos de 2.5 goles', odd: 2.1 }
];
bets.push({
  ...matchInfo,
  type: 'Goles totales',
  label: 'Goles totales', // Label general
  odd: options[0].odd,
  options: options // NUEVO!
});
```

---

## 📋 Pasos Pendientes

### Paso 1: Aplicar Migración de BD ⏳
```bash
cd backend
npx prisma db push
```

### Paso 2: Regenerar Cliente Prisma ⏳
```bash
npx prisma generate
```

### Paso 3: Migrar Datos Existentes ⏳
```sql
UPDATE "bet_option" 
SET "options" = jsonb_build_array(
  jsonb_build_object('label', "betLabel", 'odd', "odd")
)
WHERE "options" IS NULL;
```

### Paso 4: Actualizar Backend Services ⏳

**Archivos a modificar:**
- `backend/src/services/betOption.service.ts` - Guardar con `options`
- `backend/src/services/bet.service.ts` - Al crear apuesta, guardar la opción seleccionada

### Paso 5: Actualizar Frontend UI ⏳

**Archivos a modificar:**
- `frontend/pages/apuestas/Apuestas.tsx` - Mostrar opciones múltiples
- Permitir seleccionar UNA opción de las disponibles
- Al hacer apuesta, enviar label de la opción seleccionada

---

## 🎨 Diseño de UI Propuesto

### Card de Apuesta con Opciones Múltiples

```
┌─────────────────────────────────────────┐
│  🏟️ Oviedo vs Español                  │
│  📅 21/10 - 18:30                       │
├─────────────────────────────────────────┤
│  Goles totales                          │
│                                         │
│  ○ Más de 2.5 goles      📊 1.80       │
│  ○ Menos de 2.5 goles    📊 2.10       │
│                                         │
│  [Apostar 10M] [Ver detalles]          │
└─────────────────────────────────────────┘
```

### Interacción:
1. Usuario selecciona UNA opción (radio button)
2. Ingresa monto
3. Al confirmar, se crea apuesta con:
   - `betType`: "Goles totales"
   - `betLabel`: "Más de 2.5 goles" (la seleccionada)
   - `odd`: 1.80

---

## 📊 Ejemplos de Opciones por Tipo

### Goles totales (2 opciones)
```json
{
  "type": "Goles totales",
  "label": "Goles totales",
  "options": [
    {"label": "Se marcarán más de 2.5 goles", "odd": 1.80},
    {"label": "Se marcarán menos de 2.5 goles", "odd": 2.10}
  ]
}
```

### Córners (2 opciones)
```json
{
  "type": "Córners",
  "label": "Córners",
  "options": [
    {"label": "Habrá más de 9.5 córners", "odd": 1.75},
    {"label": "Habrá menos de 9.5 córners", "odd": 2.15}
  ]
}
```

### Tarjetas (2 opciones)
```json
{
  "type": "Tarjetas",
  "label": "Tarjetas",
  "options": [
    {"label": "Se mostrarán más de 4.5 tarjetas", "odd": 1.85},
    {"label": "Se mostrarán menos de 4.5 tarjetas", "odd": 2.05}
  ]
}
```

### Ambos marcan (2 opciones)
```json
{
  "type": "Ambos marcan",
  "label": "Ambos marcan",
  "options": [
    {"label": "Marcan Oviedo y Español", "odd": 1.90},
    {"label": "Al menos un equipo no marcará", "odd": 2.00}
  ]
}
```

### Par/Impar (2 opciones)
```json
{
  "type": "Par/Impar",
  "label": "Par/Impar",
  "options": [
    {"label": "Se marcarán un número impar de goles", "odd": 1.95},
    {"label": "Se marcarán un número par de goles", "odd": 1.95}
  ]
}
```

### Resultado (3 opciones) ⚠️ Pendiente
```json
{
  "type": "Resultado",
  "label": "Resultado final",
  "options": [
    {"label": "Ganará Oviedo", "odd": 2.30},
    {"label": "Empate", "odd": 3.10},
    {"label": "Ganará Español", "odd": 2.80}
  ]
}
```

---

## 🔧 Validaciones a Implementar

### Backend

1. **Al guardar bet_option:**
   - `options` debe tener al menos 2 elementos
   - Cada opción debe tener `label` y `odd`
   - `odd` debe ser > 1.0

2. **Al crear apuesta (placeBet):**
   - Verificar que `betLabel` exista en las opciones disponibles
   - Asignar el `odd` correcto según la opción seleccionada

### Frontend

1. **Al mostrar opciones:**
   - Si `options` existe y tiene elementos, mostrar radio buttons
   - Si no, mostrar como apuesta simple (backward compatibility)

2. **Al crear apuesta:**
   - Usuario DEBE seleccionar una opción
   - Enviar `betLabel` de la opción seleccionada

---

## 🧪 Testing

### Test Cases

1. **Generar apuestas nuevas:**
   - ✅ Cada partido debe tener solo 1 registro por tipo
   - ✅ Cada registro debe tener campo `options` con 2-3 opciones
   - ✅ Tipos: Goles, Córners, Tarjetas (2 opciones cada uno)
   - ✅ Tipos: Ambos marcan, Par/Impar (2 opciones cada uno)
   - ⏳ Tipo: Resultado (3 opciones)

2. **Migrar datos existentes:**
   - ✅ Datos existentes se convierten a formato options
   - ✅ No se pierden apuestas
   - ⏳ Apuestas duplicadas se consolidan

3. **UI Frontend:**
   - ⏳ Mostrar radio buttons para seleccionar opción
   - ⏳ Deshabilitar botón "Apostar" si no hay opción seleccionada
   - ⏳ Mostrar odd de la opción seleccionada

4. **Crear apuesta:**
   - ⏳ Guardar opción seleccionada correctamente
   - ⏳ Asignar odd correcto
   - ⏳ Validar que opción existe en bet_option

---

## 📁 Archivos Modificados

### Backend
- ✅ `prisma/schema.prisma` - Agregado campo `options`
- ⏳ `src/services/betOption.service.ts` - Guardar con options
- ⏳ `src/services/bet.service.ts` - Validar opción seleccionada

### Frontend
- ✅ `services/FutbolService.ts` - Generar con opciones múltiples
- ⏳ `pages/apuestas/Apuestas.tsx` - UI para seleccionar opción
- ⏳ `services/BetService.ts` - Enviar opción seleccionada

### Scripts
- ✅ `backend/scripts/migrate-bet-options-to-multi-choice.ts`
- ✅ `backend/scripts/consolidate-bet-options.ts`

### Documentación
- ✅ `GUIA_MIGRACION_PASO_A_PASO.md`
- ✅ `MIGRACION_BET_OPTIONS.md`
- ✅ `ESTRUCTURA_APUESTAS_OPCIONES_MULTIPLES.md` (este archivo)

---

**Estado Actual:** ✅ Lógica de generación completada
**Siguiente Paso:** Aplicar migración de BD (Paso 1)
**Última Actualización:** Octubre 2025
