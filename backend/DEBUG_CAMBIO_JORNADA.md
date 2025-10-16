# 🐛 Debug: ¿Por qué no se vacía la plantilla ni se suman puntos?

## Posibles Causas

### 1. **Ya se ejecutó el cambio de jornada anteriormente**

Si ya ejecutaste el cambio de jornada para la jornada X:
- ✅ Las apuestas ya fueron evaluadas
- ✅ Los puntos ya fueron sumados al presupuesto
- ✅ Las plantillas ya fueron vaciadas
- ✅ Las apuestas evaluadas ya fueron **eliminadas** de la BD

**Solución**: Ejecuta el cambio para la **siguiente jornada** (X+1)

---

### 2. **No hay apuestas ni plantillas para esa jornada**

Si los usuarios no crearon apuestas o plantillas para la jornada que estás intentando evaluar:
- No habrá nada que evaluar
- No se sumarán puntos porque no hay plantillas

**Verificar**:
```bash
# En backend, ejecutar:
npx tsx scripts/check-database-state.ts
```

Esto mostrará:
- Qué apuestas hay y para qué jornada
- Qué plantillas existen
- El estado actual de presupuestos y puntos

---

### 3. **La jornada en la vida real aún no ha terminado**

Si la jornada en La Liga aún no se ha jugado completamente:
- La API-FOOTBALL no tendrá estadísticas de los jugadores
- No se podrán calcular puntos de plantilla
- Las apuestas no se podrán evaluar

**Solución**: Espera a que todos los partidos de la jornada terminen

---

## 🔍 Cómo Verificar qué Pasó

### Paso 1: Ver logs del backend

Cuando ejecutas el cambio de jornada, el backend imprime logs detallados:

```
🔄 Iniciando cambio de jornada 7 para liga abc123...

📊 Evaluando 15 apuestas de la jornada 7...
  ✅ Apuesta 1: Local gana - Athletic vs Mallorca (50M × 2.0) = +100M
  
✅ 15 apuestas evaluadas

💰 Balances calculados para 5 usuarios

  ⚽ Usuario user1: 25 puntos de plantilla
  ❌ Usuario user2: Solo 9/11 jugadores - 0 puntos  <-- REGLA DE 11 JUGADORES
  
✨ 5 miembros actualizados

🗑️ Vaciando todas las plantillas...
  🗑️ Usuario user1: 11 jugadores eliminados
  
✅ 5 plantillas vaciadas

🗑️ 15 apuestas eliminadas
```

Si no ves estos logs, el cambio NO se ejecutó.

---

### Paso 2: Verificar en la base de datos

Ejecuta el script de verificación:

```bash
cd backend
npx tsx scripts/check-database-state.ts
```

Verás:
- **Apuestas**: Si no aparecen apuestas para la jornada X, es porque ya se evaluaron y eliminaron
- **Plantillas**: Si aparecen vacías (0 jugadores), es porque ya se vaciaron
- **Presupuestos**: Verás si los puntos ya se sumaron al budget

---

### Paso 3: Ver en la app móvil

1. **Plantilla**:
   - Ve a la pestaña de Plantilla
   - Si está vacía, ya se ejecutó el cambio
   
2. **Presupuesto**:
   - Ve al header de la app
   - Verás el budget actual
   - Si aumentó, es porque ya se sumaron los puntos

3. **Clasificación**:
   - Ve a la pestaña de Liga → Clasificación
   - Verás los puntos totales de cada usuario
   - Si hay puntos, es porque ya se evaluó

---

## 🎯 Flujo Correcto de Uso

### Antes de la Jornada
1. Usuarios crean sus plantillas (11 jugadores)
2. Usuarios hacen sus apuestas

### Durante la Jornada
- Se juegan los partidos en la vida real
- **NO se puede modificar plantilla ni apuestas** (bloqueado)

### Después de la Jornada
1. **Admin ejecuta cambio de jornada desde AdminPanel**
2. Sistema evalúa automáticamente:
   - ✅ Evalúa apuestas (won/lost)
   - ✅ Calcula puntos de plantilla (0 si <11 jugadores)
   - ✅ Suma puntos al budget (1M por punto)
   - ✅ Actualiza puntos totales en clasificación
   - ✅ Resetea bettingBudget a 250M
   - ✅ **VACÍA TODAS LAS PLANTILLAS**
   - ✅ **ELIMINA APUESTAS EVALUADAS**

3. Usuarios vuelven a crear plantillas para siguiente jornada

---

## ⚠️ Errores Comunes

### "No se sumaron los puntos"

**Posibles razones**:

1. **El usuario NO tenía 11 jugadores en su plantilla**
   - Verás en logs: `❌ Usuario X: Solo 9/11 jugadores - 0 puntos`
   - Solución: Asegúrate de tener 11 jugadores antes de la evaluación

2. **La jornada aún no se jugó en la vida real**
   - La API no tiene estadísticas
   - Solución: Espera a que termine la jornada

3. **Ya se evaluó anteriormente**
   - Los puntos ya están sumados en el budget
   - Verifica el budget actual vs el anterior

### "No se vació la plantilla"

**Posibles razones**:

1. **Ya se vació anteriormente**
   - Verifica en la app si la plantilla está vacía
   - Ejecuta `check-database-state.ts` para ver el estado

2. **El cambio no se ejecutó correctamente**
   - Verifica los logs del backend
   - Revisa si hay errores en el AdminPanel

### "No se eliminaron las apuestas"

**Esto es CORRECTO**. Las apuestas **SÍ se eliminan** pero SOLO las que fueron evaluadas:

```typescript
// Se eliminan solo las apuestas evaluadas (won/lost)
await prisma.bet.deleteMany({
  where: {
    leagueId,
    jornada,
    status: { in: ['won', 'lost'] }
  }
});
```

Las apuestas con status `pending` (de jornadas futuras) NO se eliminan.

---

## 🧪 Cómo Probar

### Opción 1: Crear datos de prueba

```typescript
// Crear una apuesta de prueba para jornada 8
// Crear una plantilla de 11 jugadores
// Ejecutar cambio de jornada 8 desde AdminPanel
```

### Opción 2: Verificar ejecución anterior

```bash
# Ver estado actual
npx tsx scripts/check-database-state.ts

# Buscar en logs del backend si hay:
"✨ Cambio de jornada completado"
"🗑️ X plantillas vaciadas"
"🗑️ X apuestas eliminadas"
```

---

## 📝 Resumen

**El código ESTÁ funcionando correctamente** si al ejecutar el cambio de jornada ves estos logs:

```
🔄 Iniciando cambio de jornada...
📊 Evaluando apuestas...
✅ Apuestas evaluadas
💰 Balances calculados
⚽ Puntos de plantilla calculados
✨ Miembros actualizados
🗑️ Plantillas vaciadas
🗑️ Apuestas eliminadas
```

Si NO ves estos logs, el problema puede ser:
- El endpoint no se está llamando correctamente
- Hay un error en el backend (revisar logs completos)
- El token de autenticación es inválido (401 Unauthorized)
