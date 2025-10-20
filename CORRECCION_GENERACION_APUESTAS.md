# Corrección: Generación de Apuestas Únicas por Partido

## 🐛 Problema Identificado

**ANTES:** El sistema generaba **múltiples apuestas separadas** para el mismo partido. Por ejemplo:
- "Oviedo - Español: Más de 2.5 goles" (apuesta #1)
- "Oviedo - Español: Menos de 2.5 goles" (apuesta #2)
- "Oviedo - Español: Marcan ambos" (apuesta #3)
- "Oviedo - Español: Al menos uno no marca" (apuesta #4)

Esto resultaba en **2, 3 o más apuestas distintas para el mismo partido**, generando:
- ❌ Confusión en la interfaz
- ❌ Violación de la regla "una apuesta por partido por liga"
- ❌ Opciones redundantes (ej: "Más de X" y "Menos de X" simultáneamente)

## ✅ Solución Implementada

**AHORA:** El sistema genera **solo UNA apuesta por partido**, eligiendo aleatoriamente entre las opciones disponibles.

### Ejemplo:
Para el partido "Oviedo - Español", el sistema generará **SOLO UNA** de estas opciones:
- "Más de 2.5 goles" **O** "Menos de 2.5 goles" (no ambas)
- "Marcan ambos" **O** "Al menos uno no marca" (no ambas)
- etc.

---

## 📝 Cambios Realizados

### Archivo: `frontend/services/FutbolService.ts`

Se modificaron **4 secciones** donde se generaban apuestas:

#### 1. Generación Normal (con API de Odds)

**Tipos afectados:**
- `Goles totales`
- `Córners`
- `Tarjetas`
- `Ambos marcan`
- `Par/Impar`

**Antes (generaba TODAS las opciones):**
```typescript
const options = [
  { label: `Se marcarán más de ${n} goles`, odd: 1.8 },
  { label: `Se marcarán menos de ${n} goles`, odd: 2.1 }
];
for (const opt of options) {
  bets.push({ ...opt }); // ❌ Push de AMBAS
}
```

**Ahora (elige UNA opción aleatoriamente):**
```typescript
const esOver = Math.random() > 0.5; // 50% de probabilidad
const label = esOver 
  ? `Se marcarán más de ${n} goles`  // Solo una
  : `Se marcarán menos de ${n} goles`; // o la otra
const odd = parseFloat((esOver ? baseOdd : baseOdd + 0.3).toFixed(2));

bets.push({ // ✅ Push de SOLO UNA
  matchId, jornada, local, visitante,
  type: t, label, odd
});
```

#### 2. Generación Fallback (cuando falla API)

Mismo cambio aplicado en el bloque `catch` donde se generan apuestas sintéticas cuando la API de odds falla.

#### 3. Función `generateSyntheticBet()`

Función helper usada para completar mínimos de apuestas.

**Antes:**
```typescript
const options = [
  { label: `Más de ${n}`, odd: baseOdd },
  { label: `Menos de ${n}`, odd: altOdd }
];
for (const opt of options) {
  bets.push({ ...opt }); // ❌ Ambas opciones
}
return bets; // Retorna array con 2 elementos
```

**Ahora:**
```typescript
const esOver = Math.random() > 0.5;
const label = esOver ? `Más de ${n}` : `Menos de ${n}`;
const odd = esOver ? baseOdd : altOdd;

bets.push({ label, odd }); // ✅ Solo una opción
return bets; // Retorna array con 1 elemento
```

---

## 🎲 Lógica de Selección Aleatoria

Para cada tipo de apuesta, se elige aleatoriamente entre las opciones:

### Goles totales / Córners / Tarjetas
```typescript
const esOver = Math.random() > 0.5; // 50%
// Genera: "Más de X" o "Menos de X"
```

### Ambos marcan
```typescript
const ambosMarcan = Math.random() > 0.5; // 50%
// Genera: "Marcan ambos" o "Al menos uno no marca"
```

### Par/Impar
```typescript
const esPar = Math.random() > 0.5; // 50%
// Genera: "Par" o "Impar"
```

### Resultado (sin cambios)
Este tipo ya generaba solo una opción (Local/Empate/Visitante), no se modificó.

---

## 📊 Impacto en la Base de Datos

### Antes:
```
bet_option table:
- Oviedo-Español | Goles totales | Más de 2.5 goles | 1.80
- Oviedo-Español | Goles totales | Menos de 2.5 goles | 2.10
- Oviedo-Español | Ambos marcan | Marcan ambos | 1.90
- Oviedo-Español | Ambos marcan | Al menos uno no marca | 2.20
(4 registros para el mismo partido)
```

### Ahora:
```
bet_option table:
- Oviedo-Español | Goles totales | Más de 2.5 goles | 1.80
(Solo 1 registro por partido - elegido aleatoriamente)
```

---

## 🔗 Integración con Validación Backend

Esta corrección se complementa perfectamente con la validación implementada en el backend:

**Backend (`bet.service.ts`):**
```typescript
// No permite crear 2 apuestas para el mismo partido en la liga
const existingBetForMatchInLeague = await prisma.bet.findFirst({
  where: { leagueId, jornada, matchId, status: 'pending' }
});

if (existingBetForMatchInLeague) {
  throw new AppError(...); // ❌ Bloquea duplicados
}
```

**Frontend (ahora):**
- Solo genera UNA opción por partido
- Los usuarios ven solo una apuesta disponible para cada partido
- Imposible seleccionar opciones contradictorias

---

## 🧪 Testing

### Test Manual

1. **Limpiar bet_options existentes:**
   ```bash
   cd backend
   npx tsx scripts/clean-bet-options.ts
   ```

2. **Generar nuevas apuestas:**
   - Abrir la app
   - Ir a la sección de apuestas
   - Cargar jornada nueva
   - Verificar que cada partido tenga **SOLO UNA opción**

3. **Verificar en Base de Datos:**
   ```sql
   SELECT matchId, COUNT(*) as count
   FROM bet_option
   WHERE leagueId = 'xxx' AND jornada = Y
   GROUP BY matchId
   HAVING COUNT(*) > 1;
   -- Debe retornar 0 filas
   ```

### Casos de Prueba

- [ ] Generar apuestas para jornada nueva → Solo 1 opción por partido
- [ ] Verificar tipos variados: Goles, Córners, Tarjetas, etc.
- [ ] Cada partido tiene label único (no duplicados "Más de X" y "Menos de X")
- [ ] Intentar crear apuesta duplicada manual → Backend bloquea
- [ ] Regenerar apuestas → Opciones pueden cambiar (aleatoriedad)

---

## 📊 Contadores de Apuestas

El código incluye logs para verificar que se cumplan los mínimos:

```typescript
console.log('📊 Conteo FINAL de apuestas:');
console.log(`   - Goles totales: ${bets.filter(b => b.type === 'Goles totales').length}`);
console.log(`   - Córners: ${bets.filter(b => b.type === 'Córners').length}`);
console.log(`   - Tarjetas: ${bets.filter(b => b.type === 'Tarjetas').length}`);
console.log(`   - Total: ${bets.length} apuestas`);
```

**Antes:** Podría mostrar 20-30 apuestas para 10 partidos (2-3 por partido)
**Ahora:** Mostrará ~10 apuestas para 10 partidos (1 por partido)

---

## 🎯 Ventajas del Cambio

### 1. **Claridad**
- ✅ Una apuesta = un partido
- ✅ No hay opciones contradictorias visibles
- ✅ Interfaz más limpia

### 2. **Consistencia**
- ✅ Alineado con la regla "una apuesta por partido por liga"
- ✅ Backend y frontend trabajan en armonía
- ✅ No más validaciones fallidas inesperadas

### 3. **Variedad**
- ✅ Cada jornada tendrá apuestas diferentes (aleatoriedad)
- ✅ Usuarios no ven siempre "Más de 2.5 goles"
- ✅ Mix equilibrado de opciones over/under, sí/no, etc.

### 4. **Performance**
- ✅ Menos registros en base de datos
- ✅ Queries más rápidos
- ✅ Menos datos transferidos al frontend

---

## 🔄 Regeneración de Apuestas

Si necesitas regenerar apuestas:

1. **Limpiar opciones existentes:**
   ```bash
   cd backend
   npx tsx scripts/clean-bet-options.ts
   ```

2. **En la app:**
   - Ir a sección de apuestas
   - Forzar recarga (pull to refresh)
   - Sistema generará nuevas opciones (diferentes debido a aleatoriedad)

---

## 📁 Archivos Modificados

- ✅ `frontend/services/FutbolService.ts`
  - Líneas ~1107-1130: Goles/Córners/Tarjetas (generación normal)
  - Líneas ~1132-1150: Ambos marcan (generación normal)
  - Líneas ~1152-1170: Par/Impar (generación normal)
  - Líneas ~990-1020: Goles/Córners/Tarjetas (generación fallback)
  - Líneas ~1022-1040: Ambos marcan (generación fallback)
  - Líneas ~1042-1060: Par/Impar (generación fallback)
  - Líneas ~1280-1350: Función `generateSyntheticBet()`

---

## 💡 Consideraciones Futuras

### ¿Y si quieres mostrar TODAS las opciones?

Si en el futuro quieres que los usuarios puedan elegir entre múltiples opciones para el mismo partido:

**Opción 1: Cambiar Schema (Complejo)**
```prisma
model bet_option {
  // ... campos actuales
  options BetOptionChoice[] // Relación 1:N
}

model BetOptionChoice {
  id String @id
  betOptionId String
  label String
  odd Float
  betOption bet_option @relation(...)
}
```

**Opción 2: Mantener Schema, Cambiar UI**
- Generar TODAS las opciones en `bet_option`
- Agruparlas por `matchId` en el frontend
- Mostrar como "tabs" o "selector" en lugar de lista
- Eliminar validación backend de "una apuesta por partido"

---

**Estado:** ✅ Implementación completa
**Testing:** ⏳ Pendiente de verificar en producción
**Última actualización:** Octubre 2025
