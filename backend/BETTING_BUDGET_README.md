# Sistema de Presupuesto de Apuestas 💰

## Descripción General

Cada miembro de una liga tiene un **presupuesto independiente de 250M** para realizar apuestas en cada jornada. Este presupuesto es **independiente del presupuesto de fichajes**.

## Características

### 📊 Presupuesto por Defecto
- **250 millones** por jornada
- Se resetea automáticamente al inicio de cada nueva jornada
- Independiente del presupuesto de fichajes (500M)

### 🎯 Flujo de Apuestas

1. **Al unirse a una liga**: El miembro recibe automáticamente 250M para apuestas
2. **Durante la jornada**: El presupuesto se descuenta al realizar apuestas
3. **Al cambiar de jornada**: El presupuesto se resetea a 250M

### 💳 Presupuesto Disponible

El presupuesto disponible se calcula como:
```
Disponible = Total (250M) - Apuestas Pendientes
```

Solo las apuestas con estado `pending` consumen presupuesto. Las apuestas resueltas (`won` o `lost`) no afectan al presupuesto de la jornada actual.

## Endpoints API

### Obtener Presupuesto
```http
GET /api/bets/budget/:leagueId
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "total": 250,
  "used": 75,
  "available": 175
}
```

### Resetear Presupuestos

#### Todas las ligas
```http
POST /api/bets/reset-budgets
Authorization: Bearer <token>
```

#### Liga específica
```http
POST /api/bets/reset-budgets/:leagueId
Authorization: Bearer <token>
```

## Scripts de Administración

### Resetear Presupuestos Manualmente

Desde el directorio `backend/`:

```bash
# Resetear todas las ligas
npx tsx scripts/reset-betting-budgets.ts

# Resetear una liga específica
npx tsx scripts/reset-betting-budgets.ts <leagueId>
```

**Ejemplo:**
```bash
npx tsx scripts/reset-betting-budgets.ts cm2abc123xyz
```

El script muestra:
- ✅ Número de miembros actualizados
- 📊 Estado actual de todos los presupuestos

## Base de Datos

### Schema

```prisma
model LeagueMember {
  leagueId      String
  userId        String
  points        Int      @default(0)
  budget        Int      @default(500)        // Presupuesto fichajes
  initialBudget Int      @default(500)        // Presupuesto inicial fichajes
  bettingBudget Int      @default(250)        // ⭐ Presupuesto apuestas
  joinedAt      DateTime @default(now())
  // ...
}
```

### Valor por Defecto

El campo `bettingBudget` tiene un **valor por defecto de 250** definido en el schema de Prisma, por lo que:

- ✅ Nuevos miembros reciben automáticamente 250M
- ✅ No requiere lógica adicional al crear miembros
- ✅ Se puede resetear manualmente cuando sea necesario

## Servicios

### BetService.resetBettingBudgets()

Método del servicio que resetea los presupuestos:

```typescript
static async resetBettingBudgets(leagueId?: string) {
  const where = leagueId ? { leagueId } : {};

  await prisma.leagueMember.updateMany({
    where,
    data: {
      bettingBudget: 250,
    },
  });

  return { success: true };
}
```

## Validaciones

### Al Crear Apuesta
- ✅ El monto debe ser > 0
- ✅ El monto no puede exceder el presupuesto disponible
- ✅ Se verifica el presupuesto antes de crear la apuesta

### Al Actualizar Apuesta
- ✅ Solo se pueden modificar apuestas pendientes
- ✅ Se recalcula el presupuesto disponible incluyendo el monto anterior
- ✅ El nuevo monto no puede exceder el presupuesto disponible

### Al Eliminar Apuesta
- ✅ Solo se pueden eliminar apuestas pendientes
- ✅ El presupuesto se libera automáticamente

## Frontend

### BetService

```typescript
interface BettingBudget {
  total: number;      // 250
  used: number;       // Suma de apuestas pendientes
  available: number;  // total - used
}

static async getBettingBudget(leagueId: string): Promise<BettingBudget>
```

### Componente Apuestas

El componente `Apuestas.tsx` muestra:
- 💰 Presupuesto total, usado y disponible
- 🎯 Lista de apuestas con opciones de editar/eliminar
- ✅ Validación en tiempo real del presupuesto

## Cambio de Jornada

Para resetear los presupuestos al cambiar de jornada, ejecutar:

### Opción 1: API
```bash
curl -X POST http://localhost:3000/api/bets/reset-budgets \
  -H "Authorization: Bearer <token>"
```

### Opción 2: Script
```bash
cd backend
npx tsx scripts/reset-betting-budgets.ts
```

### Opción 3: Programático

En el código del backend cuando detectes cambio de jornada:

```typescript
await BetService.resetBettingBudgets();
```

## Resumen

| Concepto | Valor |
|----------|-------|
| Presupuesto inicial | 250M |
| Presupuesto por jornada | 250M |
| Independiente de fichajes | ✅ Sí |
| Se resetea automáticamente | ❌ Manual (por ahora) |
| Nuevos miembros | ✅ 250M automático |

## TODO / Mejoras Futuras

- [ ] Automatizar reset al detectar nueva jornada desde la API de LaLiga
- [ ] Sistema de notificaciones al resetear presupuestos
- [ ] Historial de presupuestos por jornada
- [ ] Dashboard de estadísticas de apuestas por liga
