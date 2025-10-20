# Guía Paso a Paso: Migración Segura de bet_option

## 🎯 Objetivo
Convertir bet_option para que cada partido tenga **UNA apuesta con MÚLTIPLES OPCIONES** en lugar de múltiples apuestas separadas.

---

## 📝 Paso 1: Aplicar Migración SQL

### 1.1 Ejecuta este comando:

```bash
cd backend
npx prisma db push
```

Esto aplicará los cambios del schema.prisma (campo `options` agregado).

**¿Qué hace?**
- Agrega columna `options` tipo JSON (nullable)
- Hace `odd` opcional con default 1.0
- NO modifica datos existentes (todo se preserva)

**Salida esperada:**
```
✔ Database now in sync with schema
```

---

## 📝 Paso 2: Regenerar Cliente Prisma

### 2.1 Ejecuta:

```bash
npx prisma generate
```

**¿Qué hace?**
- Regenera tipos de TypeScript
- Ahora `bet_option.options` estará disponible en el código

**Salida esperada:**
```
✔ Generated Prisma Client
```

---

## 📝 Paso 3: Poblar Campo `options` con Datos Existentes

Ahora los datos existentes tienen `options: null`. Necesitamos poblarlos.

### 3.1 Ejecuta este SQL directamente en tu base de datos:

```sql
-- Convertir datos existentes: betLabel + odd → array de opciones
UPDATE "bet_option" 
SET "options" = jsonb_build_array(
  jsonb_build_object(
    'label', "betLabel",
    'odd', "odd"
  )
)
WHERE "options" IS NULL;
```

**Puedes ejecutarlo con:**

```bash
cd backend
npx prisma studio
```

O con psql:
```bash
psql -d tu_database -c "UPDATE \"bet_option\" SET \"options\" = jsonb_build_array(jsonb_build_object('label', \"betLabel\", 'odd', \"odd\")) WHERE \"options\" IS NULL;"
```

---

## 📝 Paso 4: Consolidar Opciones Duplicadas (OPCIONAL)

Si tienes bet_options duplicadas para el mismo partido (ej: "Más de 2.5" y "Menos de 2.5"), puedes consolidarlas MANUALMENTE.

### Opción A: SQL Directo

```sql
-- Ejemplo: Encontrar duplicados
SELECT "leagueId", "jornada", "matchId", "betType", COUNT(*) as count
FROM "bet_option"
GROUP BY "leagueId", "jornada", "matchId", "betType"
HAVING COUNT(*) > 1;

-- Luego consolidar manualmente vía Prisma Studio
```

### Opción B: Script TypeScript (cuando funcione)

Una vez completados los pasos anteriores, el script `consolidate-bet-options.ts` debería funcionar.

---

## ✅ Verificación

### Verifica que todo funcionó:

```sql
-- Ver algunas bet_options con su campo options
SELECT id, "matchId", "homeTeam", "awayTeam", "betType", "betLabel", "options"
FROM "bet_option"
LIMIT 5;
```

**Deberías ver:**
```
options: [{"label": "Más de 2.5 goles", "odd": 1.8}]
```

---

## 🆘 Si algo sale mal

### Rollback

Si necesitas volver atrás:

```bash
cd backend

# Editar schema.prisma: Eliminar campo 'options' y quitar '?' de 'odd'
# Luego:
npx prisma db push --force-reset  # ⚠️ ESTO BORRA DATOS
```

**Mejor:** Haz backup de tu base de datos ANTES de empezar:

```bash
pg_dump -U tu_usuario -d tu_database > backup_before_migration.sql
```

---

## 📊 Ejemplo Completo

### ANTES:
```json
[
  {
    "id": "1",
    "matchId": 123,
    "betType": "Goles totales",
    "betLabel": "Más de 2.5 goles",
    "odd": 1.8,
    "options": null
  },
  {
    "id": "2",
    "matchId": 123,
    "betType": "Goles totales",
    "betLabel": "Menos de 2.5 goles",
    "odd": 2.1,
    "options": null
  }
]
```

### DESPUÉS Paso 3:
```json
[
  {
    "id": "1",
    "matchId": 123,
    "betType": "Goles totales",
    "betLabel": "Más de 2.5 goles",
    "odd": 1.8,
    "options": [{"label": "Más de 2.5 goles", "odd": 1.8}]
  },
  {
    "id": "2",
    "matchId": 123,
    "betType": "Goles totales",
    "betLabel": "Menos de 2.5 goles",
    "odd": 2.1,
    "options": [{"label": "Menos de 2.5 goles", "odd": 2.1}]
  }
]
```

### DESPUÉS Paso 4 (consolidación manual):
```json
[
  {
    "id": "1",
    "matchId": 123,
    "betType": "Goles totales",
    "betLabel": "Total de goles",
    "odd": 1.8,
    "options": [
      {"label": "Más de 2.5 goles", "odd": 1.8},
      {"label": "Menos de 2.5 goles", "odd": 2.1}
    ]
  }
  // Registro "2" eliminado (consolidado en "1")
]
```

---

**¿Listo?** Empieza con el Paso 1 y avísame si hay algún error.
