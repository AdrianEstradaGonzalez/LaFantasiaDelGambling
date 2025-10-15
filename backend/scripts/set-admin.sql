-- Script para marcar el usuario adrian.estrada2001@gmail.com como administrador
-- Ejecutar este script después de crear la migración para el campo isAdmin

-- Actualizar el usuario admin
UPDATE "user"
SET "isAdmin" = true
WHERE email = 'adrian.estrada2001@gmail.com';

-- Verificar el resultado
SELECT id, email, name, "isAdmin"
FROM "user"
WHERE email = 'adrian.estrada2001@gmail.com';
