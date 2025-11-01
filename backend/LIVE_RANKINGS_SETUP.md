# 🔄 Sistema de Actualización de Rankings en Vivo

## 📋 Resumen

Este sistema actualiza automáticamente los puntos de las clasificaciones de las ligas de Primera División mientras hay partidos en vivo, sin necesidad de que los usuarios hagan peticiones constantes.

## 🎯 Cómo Funciona

1. **Worker Script** (`scripts/update-live-rankings.ts`):
   - Se ejecuta cada 2 minutos (configurable)
   - Busca partidos de La Liga en vivo
   - Si NO hay partidos en vivo, termina inmediatamente (no consume API)
   - Si HAY partidos en vivo:
     - Obtiene las estadísticas de los jugadores de esos partidos
     - Calcula los puntos según el sistema de puntuación
     - Actualiza el campo `points` en la tabla `LeagueMember`

2. **Optimizaciones**:
   - ✅ Los jugadores se procesan **una sola vez** aunque estén en múltiples squads
   - ✅ Solo actualiza ligas de Primera División
   - ✅ Solo hace peticiones a la API cuando hay partidos en vivo
   - ✅ Usa el mismo sistema de puntuación que el resto de la app

## 🚀 Ejecución Local

Para probar el worker localmente:

```bash
cd backend
npm run update-rankings
```

## ☁️ Configuración en Render (PRODUCCIÓN)

### Opción 1: Cron Job Externo (Recomendado)

Render no tiene cron jobs nativos en el plan gratuito. La mejor opción es usar un servicio externo gratuito:

#### Usando **cron-job.org** (Gratis):

1. Ve a https://console.cron-job.org/
2. Crea una cuenta gratis
3. Crea un nuevo "Cron Job":
   - **Title**: "Update Live Rankings"
   - **URL**: `https://lafantasiadelgambling.onrender.com/api/admin/update-rankings` (crear este endpoint)
   - **Schedule**: `*/2 * * * *` (cada 2 minutos)
   - **Request method**: GET
   - **Enabled**: Solo durante horarios de partidos (ej: 16:00-23:00 sábados/domingos)

#### Crear el Endpoint en el Backend:

Añade en `backend/src/routes/admin.routes.ts`:

```typescript
// Endpoint para el cron job externo
app.get('/update-rankings', async (req, reply) => {
  try {
    // Ejecutar el worker
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    
    await execPromise('npm run update-rankings');
    
    return reply.send({ success: true, message: 'Rankings actualizados' });
  } catch (error) {
    return reply.status(500).send({ success: false, error: error.message });
  }
});
```

### Opción 2: Render Cron Job (Plan Pagado)

Si tienes el plan pagado de Render:

1. Ve a tu Dashboard de Render
2. Crea un nuevo "Cron Job"
3. Configura:
   - **Name**: Live Rankings Updater
   - **Command**: `npm run update-rankings`
   - **Schedule**: `*/2 * * * *` (cada 2 minutos)
   - **Environment**: Producción

### Opción 3: Webhook Manual

Puedes llamar manualmente al script desde cualquier lugar:

```bash
curl https://lafantasiadelgambling.onrender.com/api/admin/update-rankings
```

## ⚙️ Configuración del Intervalo

Para cambiar la frecuencia de actualización:

- **Cada 1 minuto**: `*/1 * * * *` (más tiempo real, más peticiones API)
- **Cada 2 minutos**: `*/2 * * * *` (recomendado, buen balance)
- **Cada 5 minutos**: `*/5 * * * *` (menos peticiones, menos tiempo real)

## 📊 Consumo de API

Con partidos en vivo:
- **Por ejecución**: 1 petición para obtener partidos en vivo + 1 petición por cada partido (para las estadísticas de jugadores)
- **Ejemplo**: Si hay 1 partido en vivo y se ejecuta cada 2 minutos → ~30 peticiones/hora

Sin partidos en vivo:
- **Por ejecución**: 1 petición (solo para comprobar si hay partidos)
- **Ejemplo**: ~30 peticiones/hora

## 🔍 Monitoreo

Para ver los logs del worker:

```bash
# Render Dashboard
# Services → tu-backend → Logs → filtrar por "WORKER DE ACTUALIZACIÓN"

# O con el endpoint:
curl https://lafantasiadelgambling.onrender.com/api/admin/update-rankings
```

Verás salida como:

```
══════════════════════════════════════════════════════════════════════
🔄 WORKER DE ACTUALIZACIÓN DE RANKINGS EN VIVO
══════════════════════════════════════════════════════════════════════

🚀 Iniciando actualización de rankings...
⏰ 1/11/2025, 22:04:23

🔍 Buscando partidos en vivo...
✅ Encontrados 1 partidos en vivo
⚽ Partidos en vivo: Real Madrid vs Valencia

  📊 Calculados puntos de 45 jugadores del partido 1390925

✨ Total de jugadores únicos procesados: 45
🏆 Ligas de Primera División encontradas: 9

📋 Procesando liga: VARILLAZO
  ✅ mariaperez: +10 puntos (Total: 10)
  ✅ Charro: +18 puntos (Total: 18)

🎉 Actualización completada. 19 miembros actualizados
══════════════════════════════════════════════════════════════════════
```

## 🎮 Usando los Puntos en la App

En el frontend, cuando muestres la clasificación, simplemente lee el campo `points` de `LeagueMember`:

```typescript
// En LeagueService o similar
static async getLeagueRanking(leagueId: string) {
  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { points: 'desc' }, // Ordenar por puntos
  });
  
  return members.map(m => ({
    userId: m.userId,
    userName: m.user.name || m.user.email,
    points: m.points, // ← Este campo se actualiza automáticamente
  }));
}
```

**No necesitas hacer ninguna petición a la API de fútbol desde el frontend para mostrar la clasificación.**

## ⚠️ Consideraciones Importantes

1. **Horarios de Partidos**: Configura el cron job para que solo se ejecute durante horarios de partidos (ej: viernes 18:00-23:00, sábados 12:00-23:00, domingos 12:00-23:00) para ahorrar recursos.

2. **Segunda División**: Este worker solo procesa ligas de Primera División. Si quieres añadir Segunda División, modifica la línea 230 en el script:
   ```typescript
   where: { division: 'primera' } // Cambiar a 'segunda' o eliminar el filtro
   ```

3. **Reinicio de Puntos**: Al inicio de cada jornada, necesitarás resetear el campo `points` de todos los `LeagueMember` a 0.

## 🧪 Testing

Para probar sin esperar a que haya un partido en vivo, puedes modificar temporalmente el script para simular un partido:

```typescript
// En getLiveMatches(), reemplazar temporalmente:
return [{
  fixture: { id: 1234567 },
  teams: {
    home: { name: 'Test Home' },
    away: { name: 'Test Away' }
  }
}];
```

## 📈 Próximas Mejoras (Opcional)

- **WebSockets**: Empujar actualizaciones en tiempo real al frontend cuando cambien los puntos
- **Cache Redis**: Guardar las estadísticas de jugadores en Redis para evitar peticiones duplicadas
- **Historial**: Guardar el historial de puntos por minuto para mostrar gráficos en vivo
