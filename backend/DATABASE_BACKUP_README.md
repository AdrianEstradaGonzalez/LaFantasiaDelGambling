# 📦 Backup de Base de Datos - LaFantasiaDelGambling

## 📄 Archivo Generado

**Archivo:** `database_dump.sql`
**Fecha de generación:** Ver timestamp en el archivo
**Ubicación:** `backend/database_dump.sql`

## 📊 Contenido del Dump

El archivo SQL contiene:

✅ **Estructura completa de todas las tablas:**
- `user` - Usuarios del sistema
- `PasswordResetCode` - Códigos de reseteo de contraseña
- `League` - Ligas creadas
- `LeagueMember` - Miembros de las ligas con presupuestos
- `Squad` - Plantillas de jugadores
- `SquadPlayer` - Jugadores en cada plantilla
- `player` - Base de datos de jugadores de LaLiga
- `bet` - Sistema de apuestas

✅ **Todos los datos actuales:**
- 4 Usuarios registrados
- 3 Ligas activas
- 5 Miembros de ligas
- 3 Plantillas configuradas
- 12 Jugadores en plantillas
- 615 Jugadores de LaLiga sincronizados
- 1 Apuesta activa

✅ **Índices y restricciones:**
- Claves primarias
- Claves foráneas con `ON DELETE CASCADE`
- Índices para optimización de consultas
- Restricciones de unicidad

## 🔄 Cómo Restaurar la Base de Datos

### Opción 1: Usando psql (Recomendado)

```bash
# Conectarte a PostgreSQL
psql -U tu_usuario -d nombre_de_tu_base_de_datos

# Dentro de psql, ejecutar el dump
\i backend/database_dump.sql

# O desde la línea de comandos directamente
psql -U tu_usuario -d nombre_de_tu_base_de_datos -f backend/database_dump.sql
```

### Opción 2: Usando Prisma

```bash
cd backend

# Opción A: Ejecutar el SQL directamente
cat database_dump.sql | npx prisma db execute --stdin

# Opción B: En Windows PowerShell
Get-Content database_dump.sql | npx prisma db execute --stdin
```

### Opción 3: Restauración completa (Base de datos nueva)

```bash
# 1. Crear una nueva base de datos
createdb -U tu_usuario nombre_nueva_bd

# 2. Restaurar el dump
psql -U tu_usuario -d nombre_nueva_bd -f backend/database_dump.sql

# 3. Actualizar tu .env con la nueva DATABASE_URL
# DATABASE_URL="postgresql://tu_usuario:tu_password@localhost:5432/nombre_nueva_bd"

# 4. Regenerar el cliente de Prisma
cd backend
npx prisma generate
```

## 🔧 Generar Nuevo Dump

Para generar un nuevo dump actualizado con los datos más recientes:

```bash
# Desde la raíz del proyecto
npx tsx backend/scripts/export-db.ts
```

El script:
1. Se conecta a la base de datos usando Prisma
2. Exporta la estructura de todas las tablas
3. Exporta todos los datos en formato SQL
4. Guarda el archivo en `backend/database_dump.sql`
5. Muestra un resumen de lo exportado

## ⚠️ Notas Importantes

1. **Contraseñas**: Las contraseñas en el dump están hasheadas con bcrypt, son seguras.

2. **ON CONFLICT DO NOTHING**: El dump usa esta cláusula para evitar errores si los datos ya existen.

3. **Orden de inserción**: Los datos se insertan en el orden correcto respetando las relaciones de claves foráneas.

4. **Encoding**: El dump usa UTF-8, asegúrate de que tu base de datos también.

5. **Timestamps**: Todas las fechas están en formato ISO 8601.

## 🛡️ Seguridad

- ⚠️ **NO COMPARTIR** este archivo en repositorios públicos
- Contiene datos sensibles (emails, contraseñas hasheadas)
- Añadir `database_dump.sql` al `.gitignore`
- Usar únicamente para backups locales o desarrollo

## 📝 Estructura del Archivo

```
database_dump.sql
├── Configuración de PostgreSQL
├── CREATE TABLE statements (con índices y constraints)
├── INSERT statements para user
├── INSERT statements para League
├── INSERT statements para LeagueMember
├── INSERT statements para Squad
├── INSERT statements para SquadPlayer
├── INSERT statements para player (615 jugadores)
├── INSERT statements para bet
└── Comentarios de fin de dump
```

## 🔍 Verificar Importación

Después de restaurar, verifica que todo se importó correctamente:

```sql
-- Ver cantidad de registros por tabla
SELECT 'user' as tabla, COUNT(*) as registros FROM "user"
UNION ALL
SELECT 'League', COUNT(*) FROM "League"
UNION ALL
SELECT 'LeagueMember', COUNT(*) FROM "LeagueMember"
UNION ALL
SELECT 'Squad', COUNT(*) FROM "Squad"
UNION ALL
SELECT 'SquadPlayer', COUNT(*) FROM "SquadPlayer"
UNION ALL
SELECT 'player', COUNT(*) FROM "player"
UNION ALL
SELECT 'bet', COUNT(*) FROM "bet";
```

Resultado esperado:
- user: 4
- League: 3
- LeagueMember: 5
- Squad: 3
- SquadPlayer: 12
- player: 615
- bet: 1

## 🚀 Uso en Desarrollo

Este dump es ideal para:
- ✅ Configurar entornos de desarrollo rápidamente
- ✅ Compartir datos de prueba con el equipo
- ✅ Resetear la base de datos a un estado conocido
- ✅ Testing con datos reales
- ✅ Recuperación de datos en caso de error

## 📞 Soporte

Si tienes problemas para restaurar el dump, verifica:
1. Que PostgreSQL esté corriendo
2. Que las credenciales en `.env` sean correctas
3. Que la base de datos de destino exista
4. Que tengas permisos suficientes
