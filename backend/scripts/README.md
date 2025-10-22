# Scripts de Carga de Datos

## 📥 load-all-player-stats.ts

Script para cargar las estadísticas de TODOS los jugadores que no tengan datos en la base de datos para la jornada actual.

### ¿Qué hace?

1. Obtiene la jornada actual de la liga
2. Consulta todos los jugadores en la BD
3. Identifica cuáles NO tienen estadísticas cargadas para la jornada actual
4. Para cada jugador sin stats:
   - Consulta la API Football
   - Calcula los puntos según las reglas del juego
   - Guarda las estadísticas en la BD

### ¿Cuándo usarlo?

- **Al inicio de una jornada**: Para pre-cargar los datos de todos los jugadores
- **Después de que los partidos terminen**: Para tener todos los puntos calculados
- **Cuando hay jugadores sin datos**: El script solo carga los que faltan

### Cómo ejecutar

```bash
# Desde la carpeta backend
npm run load-stats
```

### Características

- ✅ **Inteligente**: Solo carga jugadores que NO tienen stats
- ✅ **Seguro**: Incluye delays para no saturar la API
- ✅ **Informativo**: Muestra progreso en tiempo real
- ✅ **Resiliente**: Continúa aunque falle algún jugador
- ✅ **Completo**: Resumen final con estadísticas

### Ejemplo de salida

```
🚀 Iniciando carga de puntuaciones de todos los jugadores...

📅 Jornada actual: 11
🔒 Estado: CLOSED

👥 Total de jugadores en BD: 550

✅ Jugadores con stats ya cargadas: 200
📥 Jugadores a cargar: 350

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iniciando carga de estadísticas...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1/350] 🔄 Cargando: Vinícius Júnior (Real Madrid)
[1/350] ✅ Vinícius Júnior: 12 puntos
[2/350] 🔄 Cargando: Robert Lewandowski (FC Barcelona)
[2/350] ✅ Robert Lewandowski: 8 puntos
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RESUMEN FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Cargados exitosamente: 320
⚠️  Sin datos (no jugaron): 25
❌ Errores: 5
📈 Total procesados: 350/350
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Script finalizado exitosamente
```

### Notas importantes

- El script usa `forceRefresh: true` para obtener datos actualizados de la API
- Incluye un delay de 300ms entre jugadores (1000ms si hay error)
- Los jugadores sin datos (no jugaron) no se consideran errores
- Se puede ejecutar múltiples veces de forma segura (solo carga lo que falta)

### Variables de entorno requeridas

Asegúrate de tener configuradas en tu `.env`:

```
FOOTBALL_API_KEY=tu_api_key
FOOTBALL_API_SEASON=2025
```
