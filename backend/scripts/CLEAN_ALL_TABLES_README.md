# Script de Limpieza de Tablas

Este script elimina todos los datos de las tablas principales de la base de datos.

## ⚠️ ADVERTENCIA

**Este script es DESTRUCTIVO y eliminará TODOS los datos de las siguientes tablas:**

- `SquadPlayer` - Jugadores en plantillas
- `Squad` - Plantillas de usuarios
- `Bet` - Apuestas realizadas
- `bet_option` - Opciones de apuesta disponibles
- `LeagueMember` - Miembros de ligas
- `League` - Ligas

**NO se pueden recuperar los datos una vez eliminados.**

## 📋 Orden de Eliminación

El script respeta las relaciones de claves foráneas eliminando en el siguiente orden:

1. **SquadPlayer** - Depende de Squad
2. **Squad** - Depende de LeagueMember
3. **Bet** - Depende de bet_option y LeagueMember
4. **bet_option** - Depende de League
5. **LeagueMember** - Depende de League
6. **League** - Tabla principal

## 🚀 Uso

### Desde la raíz del backend:

```bash
# Con tsx (desarrollo)
npx tsx scripts/clean-all-tables.ts

# Con ts-node
npx ts-node scripts/clean-all-tables.ts

# Compilado con TypeScript
npx tsc scripts/clean-all-tables.ts
node scripts/clean-all-tables.js
```

## 📊 Salida del Script

El script mostrará:

```
🗑️  Iniciando limpieza de tablas...

✅ SquadPlayer: 45 registros eliminados
✅ Squad: 15 registros eliminados
✅ Bet: 120 registros eliminados
✅ bet_option: 80 registros eliminados
✅ LeagueMember: 20 registros eliminados
✅ League: 5 registros eliminadas

✨ Limpieza completada exitosamente
📊 Resumen:
   - 45 jugadores de plantilla eliminados
   - 15 plantillas eliminadas
   - 120 apuestas eliminadas
   - 80 opciones de apuesta eliminadas
   - 20 miembros de liga eliminados
   - 5 ligas eliminadas

🎉 Script finalizado
```

## 🔐 Requisitos

- Variable de entorno `DATABASE_URL` configurada correctamente
- Permisos de escritura en la base de datos
- Prisma Client generado (`npx prisma generate`)

## 📝 Notas

- **Los usuarios NO se eliminan** - Solo se limpian las tablas relacionadas con ligas y apuestas
- El script usa transacciones automáticas de Prisma
- Si hay un error, el script mostrará el mensaje y saldrá con código 1
- La desconexión de Prisma se realiza automáticamente al finalizar

## 🔄 Scripts Relacionados

- `clean-bets.ts` - Solo elimina apuestas y opciones de apuesta
- `reset-squads-and-budgets.ts` - Resetea plantillas y presupuestos
- `reset-betting-budgets.ts` - Solo resetea presupuestos de apuestas

## 💡 Alternativas Más Seguras

Si solo quieres limpiar datos de una liga específica, considera usar los endpoints de la API en lugar de este script global.
