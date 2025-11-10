# Sistema de Backup Antes del Cierre de Jornada

## ✅ Implementado

Se ha creado un sistema de backup automático de la base de datos usando Prisma que permite guardar el estado completo antes de ejecutar operaciones críticas como el cierre de jornada.

## 🎯 Funcionalidad

### Script de Backup: `backup-database-prisma.ts`

Exporta todas las tablas de la base de datos a un archivo JSON:

```bash
npm run backup-db
```

### Características

- ✅ **Exporta 24,812+ registros** de todas las tablas principales
- ✅ **Formato JSON** fácil de leer y restaurar
- ✅ **Timestamp automático** en el nombre del archivo
- ✅ **Resumen en TXT** con estadísticas del backup
- ✅ **29 MB** de datos respaldados

## 📊 Tablas Respaldadas

El backup incluye:

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `user` | 36 | Usuarios del sistema |
| `player` | 603 | Jugadores La Liga |
| `playerStats` | 7,248 | Estadísticas La Liga |
| `playerSegunda` | 757 | Jugadores La Liga 2 |
| `playerSegundaStats` | 8,443 | Estadísticas La Liga 2 |
| `playerPremier` | 671 | Jugadores Premier League |
| `playerPremierStats` | 5,781 | Estadísticas Premier |
| `squad` | 37 | Plantillas de usuarios |
| `squadPlayer` | 321 | Jugadores en plantillas |
| `league` | 14 | Ligas creadas |
| `leagueMember` | 48 | Miembros de ligas |
| `bet` | 318 | Apuestas realizadas |
| `bet_option` | 535 | Opciones de apuesta |

**Total:** 24,812 registros

## 📁 Ubicación de Backups

```
backend/backups/
├── prisma-backup-2025-11-09T23-19-10.json  (29 MB)
└── backup-summary-2025-11-09T23-19-10.txt  (resumen)
```

## 🚀 Uso

### Antes del Cierre de Jornada

```bash
# 1. Crear backup
npm run backup-db

# 2. Cerrar jornada (desde el admin panel)
# POST /api/jornada/close-all
```

### Si Algo Sale Mal

Si el cierre de jornada tiene errores, puedes:

1. **Revisar el backup JSON** para ver el estado anterior
2. **Restaurar manualmente** las tablas afectadas
3. **Comparar datos** antes y después

## 📝 Formato del Backup

```json
{
  "metadata": {
    "timestamp": "2025-11-09T23:19:10.123Z",
    "version": "1.0",
    "tables": ["user", "player", ...]
  },
  "data": {
    "user": [...],
    "player": [...],
    "playerStats": [...],
    // ... todas las demás tablas
  }
}
```

## 🔧 Integración con Cierre de Jornada

### Flujo Recomendado

```
1. 🔒 BACKUP (npm run backup-db)
   ↓
2. ✅ Verificar backup creado
   ↓
3. 🔐 Cerrar jornada (admin panel)
   ↓
4. ✅ Verificar resultados
   ↓
5. ⚠️ Si hay errores → revisar backup
```

## 💡 Ventajas

### ✅ Seguridad
- Estado completo de la BD guardado antes de operaciones críticas
- Posibilidad de auditar cambios
- Rollback manual si es necesario

### ✅ Debugging
- Ver el estado exacto antes del cierre
- Comparar valores de puntos, presupuestos, etc.
- Identificar qué cambió y por qué

### ✅ Performance
- Backup rápido (~5 segundos)
- No afecta a la BD en producción
- Usa Prisma (sin dependencias externas)

## 📋 Comandos Disponibles

```bash
# Crear backup completo
npm run backup-db

# Futuros comandos (por implementar)
npm run restore-backup -- prisma-backup-2025-11-09T23-19-10.json
npm run compare-backups -- backup1.json backup2.json
npm run cleanup-old-backups
```

## 🎯 Estado Actual

- ✅ Script de backup implementado
- ✅ Exportación de todas las tablas principales
- ✅ Formato JSON con metadata
- ✅ Resumen en TXT
- ✅ Comando npm configurado
- ✅ Backup de pre-cierre creado (29 MB, 24,812 registros)

## 📅 Backup Actual

**Último backup creado:**
- **Archivo:** `prisma-backup-2025-11-09T23-19-10.json`
- **Fecha:** 10 de noviembre 2025, 00:19:13
- **Tamaño:** 28.98 MB
- **Registros:** 24,812
- **Estado BD:** Jornada 12 en progreso

Este backup representa el estado de la base de datos **ANTES** del cierre de jornada 12, incluyendo:
- ✅ Puntos de plantilla calculados en tiempo real
- ✅ Apuestas evaluadas
- ✅ Presupuestos actuales
- ✅ Plantillas actuales de todos los usuarios

## 🔗 Archivos Relacionados

- `backend/scripts/backup-database-prisma.ts` - Script de backup
- `backend/backups/` - Directorio de backups
- `REFACTOR_CIERRE_JORNADA.md` - Documentación del cierre refactorizado

---

**Fecha:** Noviembre 10, 2025
**Estado:** ✅ Backup pre-cierre completado
