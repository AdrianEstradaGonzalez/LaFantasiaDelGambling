# Configuración de Usuario Administrador

## 📋 Descripción

Este documento explica cómo configurar el usuario administrador que tendrá acceso al panel de administración para ejecutar cambios de jornada.

## 🔧 Pasos de Configuración

### 1. Agregar el campo isAdmin a la base de datos

Primero necesitas crear y aplicar la migración de Prisma:

```bash
cd backend
npx prisma migrate dev --name add_is_admin_field
```

Esto creará una nueva migración que agrega el campo `isAdmin` al modelo `User`.

### 2. Marcar el usuario como administrador

**Opción A: Usando SQL directo**

Ejecuta el script SQL proporcionado:

```bash
# Conectarse a la base de datos PostgreSQL
psql -U tu_usuario -d nombre_base_datos -f scripts/set-admin.sql
```

O ejecuta manualmente la siguiente consulta SQL:

```sql
UPDATE "user"
SET "isAdmin" = true
WHERE email = 'adrian.estrada2001@gmail.com';
```

**Opción B: Usando el script TypeScript**

Después de regenerar el cliente de Prisma:

```bash
cd backend
npx prisma generate
npx tsx scripts/set-admin.ts
```

### 3. Verificar la configuración

Puedes verificar que el usuario fue marcado como admin con esta consulta:

```sql
SELECT id, email, name, "isAdmin"
FROM "user"
WHERE email = 'adrian.estrada2001@gmail.com';
```

## 🎯 Funcionalidad

Una vez configurado:

1. **Login**: Cuando el usuario admin inicia sesión, el backend enviará `isAdmin: true` en la respuesta
2. **Frontend**: El estado de admin se guarda en `EncryptedStorage`
3. **Botón Admin**: Solo será visible en la pantalla Home para usuarios administradores
4. **Panel de Administración**: Solo accesible para el usuario admin

## 🔒 Seguridad

- El campo `isAdmin` está en el modelo User de la base de datos
- Solo se puede modificar directamente en la base de datos (no hay endpoint de API)
- El backend incluye el estado `isAdmin` en las respuestas de login/register/me
- El frontend verifica el estado antes de mostrar funcionalidades de admin

## 📝 Usuario Administrador

- **Email**: adrian.estrada2001@gmail.com
- **Permisos**: Acceso completo al panel de administración
- **Funcionalidades**:
  - Ejecutar cambios de jornada para todas las ligas
  - Ver estadísticas de apuestas evaluadas
  - Gestionar el ciclo de jornadas del sistema

## ⚠️ Importante

- Solo debe haber un usuario administrador principal
- No crear endpoints públicos para modificar el campo `isAdmin`
- Mantener las credenciales del usuario admin seguras
