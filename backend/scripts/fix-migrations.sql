-- Script para resolver migraciones fallidas en producción
-- Ejecutar esto en la base de datos de Railway/Render

-- 1. Ver el estado actual de las migraciones
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10;

-- 2. Marcar la migración fallida como completada (si ya se aplicaron los cambios)
-- Reemplaza 'add_options_field' con el nombre de tu migración fallida
UPDATE "_prisma_migrations" 
SET finished_at = NOW(), 
    success = TRUE 
WHERE migration_name = 'add_options_field';

-- 3. O eliminar la migración fallida si quieres empezar de nuevo
-- DELETE FROM "_prisma_migrations" WHERE migration_name = 'add_options_field';

-- 4. Verificar que el campo existe en la tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bet_option' 
  AND column_name = 'options';

-- 5. Si el campo no existe, crearlo manualmente
-- ALTER TABLE bet_option ADD COLUMN IF NOT EXISTS options JSONB;

-- 6. Verificar el campo pointsPerJornada en LeagueMember
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'league_member' 
  AND column_name IN ('pointsPerJornada', 'points_per_jornada');

-- 7. Si no existe, agregarlo
-- ALTER TABLE "LeagueMember" ADD COLUMN IF NOT EXISTS "pointsPerJornada" JSONB;
