# Sistema de Roles de Administrador - Implementación

## 📋 Resumen

Se ha implementado un sistema de roles para restringir el acceso al panel de administración únicamente al usuario administrador identificado por el email `adrian.estrada2001@gmail.com`.

## 🔄 Cambios Realizados

### Backend

#### 1. Modelo de Datos (`backend/prisma/schema.prisma`)
- ✅ Agregado campo `isAdmin` al modelo `User` (tipo Boolean, default: false)

#### 2. Servicios de Autenticación (`backend/src/services/auth.service.ts`)
- ✅ Modificado `register()` para incluir `isAdmin` en la respuesta
- ✅ Modificado `login()` para incluir `isAdmin` en la respuesta
- ✅ Modificado `me()` para incluir `isAdmin` en la respuesta

#### 3. Scripts de Configuración
- ✅ `backend/scripts/set-admin.ts` - Script TypeScript para marcar usuario como admin
- ✅ `backend/scripts/set-admin.sql` - Script SQL para actualización directa
- ✅ `backend/ADMIN_SETUP.md` - Documentación completa de configuración

### Frontend

#### 1. Servicio de Login (`frontend/services/LoginService.ts`)
- ✅ Modificado `login()` para guardar el campo `isAdmin` en `EncryptedStorage`
- ✅ Agregado método `isAdmin()` para verificar estado de administrador
- ✅ Modificado `logout()` para eliminar el campo `isAdmin`

#### 2. Servicio de Registro (`frontend/services/RegisterService.ts`)
- ✅ Modificado `register()` para guardar el campo `isAdmin` en `EncryptedStorage`

#### 3. Pantalla Home (`frontend/pages/home/Home.tsx`)
- ✅ Agregado estado `isAdmin` 
- ✅ Agregado efecto para verificar estado de admin al cargar
- ✅ Modificado botón "Admin" para mostrarse solo si `isAdmin === true`

#### 4. Pantalla PlayersMarket (`frontend/pages/players/PlayersMarket.tsx`)
- ✅ Actualizada verificación de admin para usar `LoginService.isAdmin()`
- ✅ Mantiene funcionalidad existente de edición de precios y posiciones solo para admin

## 🚀 Pasos para Activar

### 1. Aplicar Migración de Base de Datos

```bash
cd backend
npx prisma migrate dev --name add_is_admin_field
npx prisma generate
```

### 2. Marcar Usuario como Administrador

**Opción A - SQL Directo (Recomendado):**
```bash
psql -U postgres -d tu_base_datos -f scripts/set-admin.sql
```

**Opción B - Script TypeScript:**
```bash
cd backend
npx tsx scripts/set-admin.ts
```

**Opción C - SQL Manual:**
```sql
UPDATE "user"
SET "isAdmin" = true
WHERE email = 'adrian.estrada2001@gmail.com';
```

### 3. Reiniciar el Backend

```bash
cd backend
npm run dev
```

### 4. Probar en la App

1. Hacer logout si ya estás logueado
2. Hacer login con `adrian.estrada2001@gmail.com`
3. Verificar que aparece el botón "Admin" en rojo en la pantalla Home
4. Los demás usuarios NO verán el botón

## 🔍 Verificación

### Backend
```typescript
// La respuesta de login/register debe incluir:
{
  user: {
    id: "...",
    email: "adrian.estrada2001@gmail.com",
    name: "...",
    isAdmin: true  // ← Este campo debe estar presente
  },
  accessToken: "...",
  refreshToken: "..."
}
```

### Frontend
```typescript
// En EncryptedStorage debe existir:
isAdmin: "true"  // Solo para el usuario admin

// LoginService.isAdmin() debe retornar:
true  // Para adrian.estrada2001@gmail.com
false // Para todos los demás usuarios
```

### UI
- ✅ Usuario admin: Ve botón "Admin" (rojo) junto a "Crear Liga"
- ✅ Otros usuarios: Solo ven botón "Crear Liga"

## 📁 Archivos Modificados

### Backend
- `backend/prisma/schema.prisma`
- `backend/src/services/auth.service.ts`
- `backend/scripts/set-admin.ts` (nuevo)
- `backend/scripts/set-admin.sql` (nuevo)
- `backend/ADMIN_SETUP.md` (nuevo)

### Frontend
- `frontend/services/LoginService.ts`
- `frontend/services/RegisterService.ts`
- `frontend/pages/home/Home.tsx`
- `frontend/pages/players/PlayersMarket.tsx`

## 🔒 Seguridad

1. **Campo isAdmin**: Solo se puede modificar directamente en la base de datos
2. **Sin endpoints públicos**: No hay API para cambiar el rol de admin
3. **Verificación en frontend**: El botón solo se muestra si `isAdmin === true`
4. **Verificación en backend**: Los endpoints de jornada requieren autenticación (pueden agregarse validaciones adicionales)

## 🎯 Funcionalidad Final

### Usuario Admin (adrian.estrada2001@gmail.com)
- ✅ Ve el botón "Admin" en la pantalla Home (ejecutar cambios de jornada)
- ✅ Puede acceder al panel de administración
- ✅ Puede ejecutar cambios de jornada para todas las ligas
- ✅ Puede editar precios de mercado de jugadores en PlayersMarket
- ✅ Puede editar posiciones de jugadores en PlayersMarket
- ✅ NO puede comprar jugadores (modo edición admin)
- ✅ NO ve estadísticas de jugadores (solo para usuarios normales)

### Usuarios Normales
- ❌ NO ven el botón "Admin"
- ❌ NO pueden acceder al panel de administración
- ❌ NO pueden editar precios de jugadores
- ❌ NO pueden editar posiciones de jugadores
- ✅ Pueden comprar/vender jugadores normalmente
- ✅ Ven estadísticas detalladas de jugadores
- ✅ Funcionalidad normal de fantasy sin cambios

## ⚠️ Notas Importantes

1. El usuario admin debe existir en la base de datos antes de marcarlo
2. Después de aplicar la migración, todos los usuarios tendrán `isAdmin: false` por defecto
3. Solo el usuario con email `adrian.estrada2001@gmail.com` debe marcarse como admin
4. Si el usuario admin hace logout y vuelve a hacer login, su estado de admin se mantiene
