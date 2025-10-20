# Validación de Apuestas Únicas por Partido

## 📋 Problema Resuelto

**Antes:** En una misma jornada podían existir múltiples apuestas para el mismo partido en una liga (ej: 2 apuestas diferentes para Oviedo-Español en la jornada 8).

**Ahora:** Solo se permite **UNA apuesta por partido en toda la liga**, sin importar el usuario.

## ✅ Cambios Implementados

### 1. Script: Vaciar `bet_option`

**Archivo:** `backend/scripts/clean-bet-options.ts`

Script para limpiar la tabla `bet_option` completamente.

**Ejecutar:**
```bash
cd backend
npx tsx scripts/clean-bet-options.ts
```

**Funcionalidad:**
- ✅ Cuenta registros antes de eliminar
- ✅ Elimina todos los registros de `bet_option`
- ✅ Verifica que la tabla quedó vacía
- ✅ Muestra resumen de la operación

---

### 2. Backend: Validación en `bet.service.ts`

**Archivo:** `backend/src/services/bet.service.ts`

**Cambio:** Modificada la validación en el método `placeBet()`

#### Antes (por usuario):
```typescript
// Solo validaba que el MISMO usuario no tenga otra apuesta para ese partido
const existingForMatch = await prisma.bet.findFirst({
  where: {
    leagueId,
    userId,  // ❌ Solo validaba para el mismo usuario
    jornada: currentJornada,
    matchId,
    status: 'pending',
  },
});
```

#### Ahora (por liga):
```typescript
// NUEVA REGLA: Solo UNA apuesta por partido en toda la liga
const existingBetForMatchInLeague = await prisma.bet.findFirst({
  where: {
    leagueId,
    // ✅ Sin filtro de userId - valida para TODA la liga
    jornada: currentJornada,
    matchId,
    status: 'pending',
  },
  select: { 
    id: true,
    userId: true,
    betLabel: true,
  },
});

if (existingBetForMatchInLeague) {
  // Mensaje específico si el usuario ya tiene una apuesta
  if (existingBetForMatchInLeague.userId === userId) {
    throw new AppError(
      400,
      'ONE_BET_PER_MATCH_USER',
      'Ya tienes una apuesta para este partido en esta jornada...'
    );
  }
  
  // Mensaje específico si otro usuario ya apostó
  throw new AppError(
    400,
    'ONE_BET_PER_MATCH_LEAGUE',
    'Ya existe una apuesta para este partido en la liga...'
  );
}
```

**Códigos de error:**
- `ONE_BET_PER_MATCH_USER`: El mismo usuario ya tiene una apuesta para ese partido
- `ONE_BET_PER_MATCH_LEAGUE`: Otro usuario ya apostó a ese partido

---

### 3. Frontend: Manejo de Errores en `BetService.ts`

**Archivo:** `frontend/services/BetService.ts`

**Cambio:** Mejorado el manejo de errores en `placeBet()`

```typescript
catch (error: any) {
  const errorData = error?.response?.data;
  
  // Mensaje específico para apuesta duplicada del mismo usuario
  if (errorData?.code === 'ONE_BET_PER_MATCH_USER') {
    throw new Error('Ya tienes una apuesta para este partido. Borra o edita tu apuesta existente.');
  }
  
  // Mensaje específico para partido ya apostado en la liga
  if (errorData?.code === 'ONE_BET_PER_MATCH_LEAGUE') {
    throw new Error(errorData.message || 'Ya existe una apuesta para este partido en la liga.');
  }
  
  // Error genérico
  throw new Error(errorData?.message || errorData?.error || 'Error al crear apuesta');
}
```

**Beneficios:**
- ✅ Mensajes claros y específicos según el tipo de error
- ✅ Usuario sabe si el problema es su apuesta o de otro miembro
- ✅ Usa el mensaje del backend cuando está disponible

---

## 🎯 Comportamiento Actual

### Caso 1: Usuario intenta apostar dos veces al mismo partido
1. Usuario apuesta a "Oviedo - Español"
2. Usuario intenta apostar nuevamente a "Oviedo - Español"
3. ❌ **Error:** "Ya tienes una apuesta para este partido. Borra o edita tu apuesta existente."

### Caso 2: Otro usuario intenta apostar al mismo partido
1. Usuario A apuesta a "Oviedo - Español" (por ejemplo: "Más de 2.5 goles")
2. Usuario B intenta apostar a "Oviedo - Español" (con cualquier apuesta)
3. ❌ **Error:** "Ya existe una apuesta para este partido en la liga. Solo se permite una apuesta por partido (Oviedo vs Español)."

### Caso 3: Apuesta a partido diferente
1. Usuario A apuesta a "Oviedo - Español"
2. Usuario B apuesta a "Barcelona - Madrid"
3. ✅ **Éxito:** Ambas apuestas se crean correctamente (diferentes partidos)

---

## 📊 Validaciones Completas en `placeBet()`

El método ahora valida:

1. ✅ **Jornada no bloqueada** - No se puede apostar si la jornada está abierta/cerrada
2. ✅ **Miembro de la liga** - El usuario debe pertenecer a la liga
3. ✅ **Monto válido** - Mayor a 0 y máximo 50M
4. ✅ **Presupuesto suficiente** - No exceder el presupuesto disponible para apuestas
5. ✅ **UNA apuesta por partido en la liga** - ⭐ **NUEVO** - Solo una apuesta por partido en toda la liga

---

## 🔧 Migración de Datos Existentes

Si ya tienes apuestas duplicadas en la base de datos, considera:

1. **Opción 1: Limpiar todas las apuestas pendientes**
   ```bash
   cd backend
   npx tsx scripts/clean-bets.ts
   ```

2. **Opción 2: Limpiar solo duplicados (crear script custom)**
   ```sql
   -- Ejemplo SQL para identificar duplicados
   SELECT leagueId, jornada, matchId, COUNT(*) as count
   FROM bet
   WHERE status = 'pending'
   GROUP BY leagueId, jornada, matchId
   HAVING COUNT(*) > 1;
   ```

3. **Opción 3: Permitir las existentes, solo bloquear nuevas**
   - La validación solo aplica a NUEVAS apuestas
   - Las apuestas existentes en la BD no se ven afectadas

---

## 🧪 Testing

### Test Manual - Backend
```bash
# 1. Vaciar bet_options
cd backend
npx tsx scripts/clean-bet-options.ts

# 2. Iniciar servidor
npm run dev

# 3. Intentar crear 2 apuestas para el mismo partido
# (usar Postman o la app)
```

### Test Manual - Frontend
```bash
# 1. Abrir la app
# 2. Ir a la sección de apuestas
# 3. Crear una apuesta para un partido (ej: Oviedo - Español)
# 4. Intentar crear otra apuesta para el mismo partido
# 5. Verificar que muestra el mensaje de error
```

### Escenarios a Probar
- [ ] Usuario intenta duplicar su propia apuesta → Error específico
- [ ] Otro usuario intenta apostar al mismo partido → Error específico
- [ ] Apuestas a partidos diferentes → Funciona correctamente
- [ ] Borrar apuesta y crear nueva para mismo partido → Funciona
- [ ] Editar apuesta existente → Funciona (no crea duplicado)

---

## 📁 Archivos Modificados

### Backend
- ✅ `scripts/clean-bet-options.ts` - **NUEVO** Script para vaciar bet_option
- ✅ `src/services/bet.service.ts` - Validación de apuesta única por partido (por liga)

### Frontend
- ✅ `services/BetService.ts` - Manejo mejorado de errores específicos

---

## 💡 Consideraciones Futuras

### ¿Qué pasa si quieres permitir múltiples apuestas por partido?

Si en el futuro decides permitir que varios usuarios apuesten al mismo partido, simplemente modifica la validación en `bet.service.ts` de vuelta a:

```typescript
// Permitir múltiples usuarios, pero solo 1 apuesta por usuario por partido
const existingForMatch = await prisma.bet.findFirst({
  where: {
    leagueId,
    userId,  // Restaurar validación solo por usuario
    jornada: currentJornada,
    matchId,
    status: 'pending',
  },
});
```

### Alternativa: Configuración por Liga

Podrías agregar un campo en el modelo `League`:

```prisma
model League {
  // ... otros campos
  allowMultipleBetsPerMatch Boolean @default(false)
}
```

Y validar según esa configuración:

```typescript
const league = await prisma.league.findUnique({ where: { id: leagueId } });

if (!league.allowMultipleBetsPerMatch) {
  // Validar apuesta única por partido en toda la liga
} else {
  // Validar solo para el mismo usuario
}
```

---

**Estado:** ✅ Implementación completa
**Última actualización:** Octubre 2025
