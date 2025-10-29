# Migración: Campo isPremium en League

## 📋 Resumen

Se ha añadido el campo `isPremium` al modelo `League` para identificar explícitamente las ligas premium, en lugar de depender únicamente del campo `division`.

## ✅ Cambios Realizados

### Backend
1. **Schema Prisma** (`backend/prisma/schema.prisma`):
   - ✅ Añadido campo `isPremium Boolean @default(false)` al modelo `League`

2. **League Repository** (`backend/src/repositories/league.repo.ts`):
   - ✅ Actualizado `create()` para establecer `isPremium = true` cuando `division === 'segunda'`

3. **LeagueMember Repository** (`backend/src/repositories/leagueMember.ts`):
   - ✅ Cambiado validación de límite de jugadores para usar `isPremium` en lugar de `division`
   - ✅ Liga Premium: 50 jugadores
   - ✅ Liga Normal: 20 jugadores

### Frontend
1. **Home.tsx**:
   - ✅ Añadido `isPremium?: boolean` al tipo `Liga`
   - ✅ Pasando `isPremium` en navegación a MiPlantilla

2. **MiPlantilla.tsx**:
   - ✅ Añadido `isPremium` a route params
   - ✅ `FormationDropdown` usa `isPremium` en lugar de `division`
   - ✅ Formaciones premium se bloquean cuando `isPremium === false`

## 🔧 Pasos Pendientes (Ejecutar en Producción)

### 1. Ejecutar script de migración SQL

Ejecutar el script `backend/scripts/add-is-premium.ts`:

```bash
cd backend
npx ts-node scripts/add-is-premium.ts
```

O ejecutar SQL directamente:

```sql
-- Añadir columna
ALTER TABLE league ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;

-- Actualizar ligas existentes
UPDATE league SET "isPremium" = true WHERE division = 'segunda';
```

### 2. Regenerar cliente de Prisma

```bash
cd backend
npx prisma generate
```

### 3. Verificar base de datos

```sql
SELECT id, name, division, "isPremium" FROM league;
```

## 📊 Beneficios

1. **Explícito**: El campo `isPremium` es más claro que inferir de `division`
2. **Flexible**: Permite tener ligas premium con diferentes configuraciones en el futuro
3. **Mantenible**: Más fácil de entender y mantener el código
4. **Escalable**: Facilita añadir más características premium:
   - Formaciones exclusivas ✅
   - Límite de 50 jugadores ✅
   - Futuras características premium 🔮

## 🎯 Uso del Campo

### Backend
```typescript
// Verificar si es premium
const league = await prisma.league.findUnique({ 
  where: { id }, 
  select: { isPremium: true } 
});

if (league.isPremium) {
  // Lógica premium
}
```

### Frontend
```typescript
// Bloquear formaciones premium
const isLocked = formation.isPremium && !isPremium;
```

## ⚠️ Notas Importantes

- El campo `division` se mantiene para referencia de qué división de fútbol se usa
- `isPremium` determina las características premium de la liga
- Las ligas existentes con `division === 'segunda'` se marcan automáticamente como `isPremium: true`
- Las nuevas ligas premium se crean con `isPremium: true` automáticamente

## 🚀 Próximas Características Premium

Con este campo podemos implementar fácilmente:
- [ ] Estadísticas avanzadas exclusivas
- [ ] Análisis de rendimiento detallado
- [ ] Más formaciones tácticas
- [ ] Límites de presupuesto personalizados
- [ ] Torneos y competiciones especiales
