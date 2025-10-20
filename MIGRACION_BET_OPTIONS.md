# Migración de bet_option a Opciones Múltiples

## ⚠️ IMPORTANTE: Sigue estos pasos EN ORDEN

Esta migración preserva todos los datos existentes y convierte la estructura de bet_option para soportar múltiples opciones por apuesta.

---

## 📋 Pasos de Migración

### Paso 1: Aplicar Migración SQL

```bash
cd backend
npx prisma db execute --file ./prisma/migrations/add_options_field/migration.sql --schema ./prisma/schema.prisma
```

**Qué hace:**
- Agrega columna `options` (JSON) a la tabla `bet_option`
- Hace `odd` opcional con valor default 1.0
- Convierte datos existentes: cada `betLabel + odd` se convierte en `[{label, odd}]`

**Resultado:**
```
ANTES:
{
  betLabel: "Más de 2.5 goles",
  odd: 1.80
}

DESPUÉS:
{
  betLabel: "Más de 2.5 goles",
  odd: 1.80,
  options: [{label: "Más de 2.5 goles", odd: 1.80}]
}
```

---

### Paso 2: Regenerar Cliente Prisma

```bash
cd backend
npx prisma generate
```

**Qué hace:**
- Regenera los tipos de TypeScript
- Ahora `bet_option.options` estará disponible

---

###Paso 3: Agrupar Opciones Duplicadas (OPCIONAL)

Si tienes apuestas duplicadas para el mismo partido (ej: "Más de 2.5" y "Menos de 2.5" como registros separados), ejecuta:

```bash
cd backend
npx tsx scripts/consolidate-bet-options.ts
```

**Qué hace:**
- Agrupa bet_options que comparten `matchId + betType`
- Las fusiona en una sola con array de opciones

**Ejemplo:**
```
ANTES (2 registros):
1. matchId: 123, betType: "Goles totales", betLabel: "Más de 2.5", odd: 1.80
2. matchId: 123, betType: "Goles totales", betLabel: "Menos de 2.5", odd: 2.10

DESPUÉS (1 registro):
1. matchId: 123, betType: "Goles totales", betLabel: "Total de goles", options: [
     {label: "Más de 2.5 goles", odd: 1.80},
     {label: "Menos de 2.5 goles", odd: 2.10}
   ]
```

---

## 🧪 Verificación

Después de completar los pasos, verifica:

```sql
-- Ver estructura de algunas bet_options
SELECT id, "matchId", "betType", "betLabel", options 
FROM bet_option 
LIMIT 5;

-- Contar registros antes y después
SELECT COUNT(*) FROM bet_option;
```

---

## 🔙 Rollback (Si algo sale mal)

Si necesitas revertir la migración:

### 1. Restaurar desde backup automático

Prisma crea backups automáticos. Busca en:
```
backend/prisma/migrations/[timestamp]_add_options_field/
```

### 2. Eliminar columna options

```sql
ALTER TABLE "bet_option" DROP COLUMN "options";
ALTER TABLE "bet_option" ALTER COLUMN "odd" DROP DEFAULT;
```

### 3. Regenerar cliente Prisma

```bash
cd backend
npx prisma generate
```

---

## 📊 Estado Actual vs Estado Deseado

### ACTUAL (antes de migración):
```
bet_option:
- Oviedo vs Español | Goles totales | "Más de 2.5 goles" | 1.80
- Oviedo vs Español | Goles totales | "Menos de 2.5 goles" | 2.10
(2 registros separados)
```

### DESEADO (después de migración):
```
bet_option:
- Oviedo vs Español | Goles totales | "Total de goles" | options: [
    {label: "Más de 2.5 goles", odd: 1.80},
    {label: "Menos de 2.5 goles", odd: 2.10}
  ]
(1 registro con 2 opciones)
```

---

## ⏱️ Tiempo estimado

- Paso 1 (SQL): ~5 segundos
- Paso 2 (Generate): ~10 segundos  
- Paso 3 (Consolidar): ~30 segundos (depende de cantidad de datos)

**Total: ~1 minuto**

---

## 🆘 Solución de Problemas

### Error: "Column 'options' already exists"
**Solución:** La migración ya se ejecutó. Salta al Paso 2.

### Error: "Cannot read property 'options' of undefined"
**Solución:** Ejecuta `npx prisma generate` para regenerar tipos.

### Error: "Type 'Json' is not assignable to..."
**Solución:** TypeScript no reconoce el tipo. Reinicia tu editor (VS Code).

---

**¿Listo para empezar?**

Ejecuta el Paso 1 y dime si hay algún error.
