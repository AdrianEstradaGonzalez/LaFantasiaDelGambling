# ⚡ Sistema de Estadísticas en Tiempo Real

## 🎯 Objetivo

Implementar un sistema inteligente que:
1. **Durante la jornada ABIERTA**: Muestre estadísticas EN VIVO desde la API
2. **Durante la jornada CERRADA**: Use datos de la BD (más rápido, ahorra API calls)
3. **Al cerrar jornada**: Actualice todas las estadísticas finales en la BD

---

## 📊 Flujo de Datos

### 🟢 **Jornada ABIERTA** (Partidos en disputa)

```
Usuario solicita stats → Backend detecta jornada abierta
                      ↓
                 forceRefresh = true
                      ↓
              Consulta API Football (tiempo real)
                      ↓
              Calcula puntos actualizados
                      ↓
              Guarda/actualiza en BD
                      ↓
            Devuelve stats EN VIVO al usuario
```

**Características:**
- ✅ Datos actualizados minuto a minuto
- ✅ Refleja goles, asistencias, tarjetas en tiempo real
- ⚠️ Más lento (consulta API cada vez)
- ⚠️ Consume API calls

**Logging:**
```
[playerStats] ⚡ Jornada 9 está ABIERTA - forzando refresh desde API
```

### 🔴 **Jornada CERRADA** (Partidos finalizados)

```
Usuario solicita stats → Backend detecta jornada cerrada
                      ↓
                 forceRefresh = false
                      ↓
              Busca en BD (stats finales)
                      ↓
        Si existe → Devuelve inmediatamente ⚡
        Si NO existe → Consulta API (caso edge)
```

**Características:**
- ✅ Muy rápido (consulta BD local)
- ✅ No consume API calls
- ✅ Datos finales y definitivos
- ✅ Consistente durante toda la semana

**Logging:**
```
[playerStats] 💾 Usando datos de BD para jugador 12345 jornada 8
```

---

## 🔒 Proceso de Cierre de Jornada

Al ejecutar `closeJornada(leagueId)`, se ejecutan estos pasos:

```
1. Evaluar apuestas
2. Calcular balances
3. Calcular puntos de plantilla
4. Actualizar presupuestos
5. Vaciar plantillas
6. Eliminar opciones de apuestas
7. Eliminar apuestas evaluadas
8. ✨ ACTUALIZAR ESTADÍSTICAS DE TODOS LOS JUGADORES ← NUEVO
9. Avanzar jornada y cambiar estado a 'open'
```

### Paso 8: Actualización Masiva de Estadísticas

```typescript
// En closeJornada()
const { PlayerStatsService } = await import('./playerStats.service.js');
const updateResult = await PlayerStatsService.updateAllPlayersStatsForJornada(jornada);
```

**Qué hace:**
- Itera sobre **TODOS** los jugadores de la BD
- Para cada jugador:
  - Consulta sus estadísticas finales en la API
  - Calcula puntos definitivos
  - Guarda en BD con `forceRefresh: true`
- Respeta rate limits (delay entre llamadas)

**Output:**
```
📊 8. Actualizando estadísticas finales de jugadores...
[OK] Lionel Messi - Jornada 9
[OK] Robert Lewandowski - Jornada 9
[OK] Vinícius Jr. - Jornada 9
...
✅ Estadísticas actualizadas: 450 éxitos, 2 errores
```

---

## 🔍 Detección Automática de Estado

### Código en `playerStats.service.ts`

```typescript
// Verificar si la jornada está abierta
let shouldForceRefresh = options.forceRefresh || false;

if (!shouldForceRefresh) {
  const currentJornada = await prisma.league.findFirst({
    select: { currentJornada: true, jornadaStatus: true },
  });
  
  // Si estamos consultando la jornada actual Y está abierta → forzar refresh
  if (currentJornada && 
      currentJornada.currentJornada === jornada && 
      currentJornada.jornadaStatus === 'open') {
    shouldForceRefresh = true;
    console.log(`[playerStats] ⚡ Jornada ${jornada} está ABIERTA - forzando refresh desde API`);
  }
}
```

**Lógica:**
1. Consulta la tabla `League` para obtener `currentJornada` y `jornadaStatus`
2. Si `jornada solicitada == currentJornada` Y `jornadaStatus == 'open'` → Datos en vivo
3. Si no → Usar BD

---

## 📈 Beneficios

### Durante la Jornada (ABIERTA)
- ⚡ Usuarios ven estadísticas actualizadas en tiempo real
- 📊 Puntuaciones cambian conforme ocurren eventos
- 🎮 Experiencia "en vivo" emocionante

### Después de la Jornada (CERRADA)
- 🚀 Respuestas ultra-rápidas (BD local)
- 💰 Ahorro de API calls (no consume cuota)
- 📊 Datos consistentes y definitivos
- ✅ Todos los jugadores ya tienen stats guardadas

### Para el Admin
- 🔒 Al cerrar jornada → Todo queda listo automáticamente
- 📦 BD actualizada con estadísticas finales
- 🔄 Nueva jornada empieza limpia y rápida

---

## 🎯 Casos de Uso

### Caso 1: Sábado 17:00 - Jornada 9 ABIERTA
```
Usuario consulta a Vinícius Jr. (jornada 9)
→ Backend detecta jornada 9 abierta
→ Consulta API Football (en vivo)
→ Vinícius lleva: 1 gol, 1 asistencia, 70 minutos → 10 puntos
→ Muestra al usuario
```

### Caso 2: Sábado 21:00 - Jornada 9 ABIERTA
```
Usuario consulta a Vinícius Jr. OTRA VEZ
→ Backend detecta jornada 9 abierta
→ Consulta API Football (actualizado)
→ Vinícius ahora: 2 goles, 1 asistencia, 90 minutos → 17 puntos ✨
→ Muestra al usuario
```

### Caso 3: Domingo 23:00 - Admin CIERRA Jornada 9
```
Admin presiona "Cerrar Jornada"
→ Sistema actualiza TODOS los jugadores (450+)
→ Vinícius queda con stats finales: 2 goles, 1 asistencia, 90 min → 17 puntos
→ Guardado en BD
→ jornadaStatus cambia a 'open' (para jornada 10)
```

### Caso 4: Lunes 10:00 - Jornada 9 CERRADA
```
Usuario consulta a Vinícius Jr. (jornada 9)
→ Backend detecta jornada 9 cerrada
→ Busca en BD (ultra rápido)
→ Encuentra: 2 goles, 1 asistencia, 90 min → 17 puntos
→ Devuelve INMEDIATAMENTE (sin API call)
```

### Caso 5: Martes - Usuario revisa jornadas anteriores
```
Usuario consulta a Messi (jornada 5, 6, 7)
→ Backend detecta jornadas cerradas
→ Carga desde BD (3 consultas ultra rápidas)
→ Sin API calls, respuesta instantánea
```

---

## 🛠️ Archivos Modificados

### 1. `backend/src/services/playerStats.service.ts`
```typescript
// Función: getPlayerStatsForJornada()
// Cambio: Detecta estado de jornada y fuerza refresh si está abierta
```

### 2. `backend/src/services/jornada.service.ts`
```typescript
// Función: closeJornada()
// Cambio: Añadido paso 8 - Actualizar todas las estadísticas
```

---

## ⚙️ Configuración

### Variables de Entorno (`.env`)
```env
FOOTBALL_API_SEASON=2025
FOOTBALL_API_KEY=tu_api_key_aqui
FOOTBALL_API_CACHE_TTL_MS=60000
FOOTBALL_API_DELAY_MS=350
```

### Base de Datos
```prisma
model League {
  currentJornada Int            @default(1)
  jornadaStatus  String         @default("open")  // "open" o "closed"
}
```

---

## 📊 Monitoreo y Logs

### Logs Clave

**Jornada Abierta:**
```
[playerStats] ⚡ Jornada 9 está ABIERTA - forzando refresh desde API
[API] FETCH for player season info: 12345:2025
[playerStats] ✓ Jugador 12345 encontrado por ID directo
[playerStats] Equipos encontrados para Messi (12345): [529]
```

**Jornada Cerrada:**
```
[playerStats] 💾 Usando datos de BD para jugador 12345 jornada 8
[DB] HIT for player stats: stats:12345:8:2025
```

**Cierre de Jornada:**
```
📊 8. Actualizando estadísticas finales de jugadores...
[STATS] Actualizando estadísticas de todos los jugadores para jornada 9
[OK] Lionel Messi - Jornada 9
[OK] Robert Lewandowski - Jornada 9
...
[STATS] Actualización completada: 450 éxitos, 2 errores
✅ Estadísticas actualizadas: 450 éxitos, 2 errores
```

---

## 🚀 Rendimiento

### Jornada Abierta (Tiempo Real)
- **Primera consulta**: ~200-300ms (API call)
- **Consultas repetidas**: ~200-300ms (siempre actualizado)
- **API calls por usuario**: 1 por consulta

### Jornada Cerrada (Base de Datos)
- **Consulta**: ~10-50ms (BD local) ⚡
- **API calls**: 0 (ahorro total)
- **Escalabilidad**: Ilimitada

### Cierre de Jornada
- **Tiempo estimado**: ~5-10 minutos (450 jugadores)
- **Frecuencia**: 1 vez por semana
- **Automatizable**: Puede ejecutarse en un cron job

---

## ✅ Checklist de Implementación

- [x] Detectar estado de jornada en `getPlayerStatsForJornada`
- [x] Forzar refresh si jornada está abierta
- [x] Usar BD si jornada está cerrada
- [x] Añadir paso de actualización en `closeJornada`
- [x] Logging claro para debugging
- [x] Documentación completa

---

## 🎉 Resultado Final

**Antes:**
- ❌ Siempre consultaba API (lento, consume cuota)
- ❌ O siempre usaba BD (desactualizado en vivo)

**Ahora:**
- ✅ **Jornada abierta**: Datos EN VIVO desde API
- ✅ **Jornada cerrada**: Datos RÁPIDOS desde BD
- ✅ **Al cerrar**: Actualización automática y completa
- ✅ **Lo mejor de ambos mundos**: Velocidad + Actualización

---

**Fecha de implementación:** 20 de octubre de 2025  
**Versión:** 1.0.0
