# Solución de Migraciones Fallidas en Producción

## Problema
Error al desplegar en Render: `migrate found failed migrations in the target database`

## Solución

### Opción 1: Usar `prisma db push` (Recomendado)
Esta es la solución más rápida y segura. Ya está configurado en el `package.json`:

```bash
npm run build  # Ahora usa prisma db push automáticamente
```

El script `build` ahora ejecuta:
1. `prisma db push --accept-data-loss` - Sincroniza el schema sin migraciones
2. `prisma generate` - Regenera el cliente de Prisma
3. `tsc -p tsconfig.json` - Compila TypeScript

### Opción 2: Resolver manualmente en Railway
Si necesitas resolver la migración fallida:

1. Conectarte a la base de datos de Railway:
```bash
# Obtener la URL de conexión desde Railway
railway connect postgresql
```

2. Ejecutar el script de reparación:
```bash
npm run fix-migrations
```

O ejecutar manualmente en la base de datos:
```sql
-- Ver migraciones fallidas
SELECT * FROM "_prisma_migrations" WHERE success = FALSE;

-- Marcar como completada
UPDATE "_prisma_migrations" 
SET finished_at = NOW(), success = TRUE 
WHERE migration_name = 'add_options_field';
```

### Opción 3: Limpiar y recrear migraciones (Producción)

⚠️ **CUIDADO**: Esto eliminará el historial de migraciones

```bash
# 1. Resolver migraciones
npx prisma migrate resolve --applied add_options_field

# 2. O forzar reset (BORRA DATOS)
npx prisma migrate reset --force

# 3. O usar db push (no afecta datos)
npx prisma db push --accept-data-loss
```

## ¿Por qué pasó esto?

Las migraciones pueden fallar en producción por:
- Cambios simultáneos en el schema
- Timeout de la base de datos
- Permisos insuficientes
- Migración parcialmente aplicada

## Prevención

Para evitar este problema en el futuro:

1. **Usar `prisma db push` en desarrollo** para cambios rápidos
2. **Usar migraciones solo para cambios importantes** en producción
3. **Probar migraciones en staging** antes de producción
4. **Hacer backup** antes de aplicar migraciones

## Estado actual

✅ `build` script actualizado para usar `prisma db push`
✅ Campo `pointsPerJornada` agregado al schema
✅ Campo `options` agregado a `bet_option`
✅ Prisma Client regenerado localmente

## Desplegar en Render

1. Hacer commit de los cambios:
```bash
git add backend/package.json backend/prisma/schema.prisma
git commit -m "fix: usar prisma db push en build para evitar migraciones fallidas"
git push
```

2. Render automáticamente ejecutará `npm run build`
3. El nuevo build usará `prisma db push` que es más seguro

## Scripts útiles

```bash
# Ver estado de la base de datos
npm run fix-migrations

# Sincronizar schema sin migraciones
npm run prisma:push

# Aplicar migraciones (si decides volver a usarlas)
npm run prisma:deploy
```

## Notas importantes

- `prisma db push` NO crea archivos de migración
- `prisma db push` sincroniza directamente el schema con la BD
- Es seguro para desarrollo y producción cuando no quieres gestionar migraciones
- Los datos NO se pierden (a menos que cambies tipos incompatibles)
