# Sistema de Puntuación de Plantilla - Implementación

## 📋 Descripción

Se ha implementado un sistema que calcula automáticamente los puntos conseguidos por la plantilla de cada usuario en cada jornada y los convierte en presupuesto para fichajes.

## 💰 Fórmula de Presupuesto por Jornada

```
Nuevo Presupuesto = 500M + Ganancias/Pérdidas de Apuestas + Puntos de Plantilla
```

**Donde:**
- **500M**: Presupuesto base para todos
- **Ganancias/Pérdidas de Apuestas**: Balance neto de las apuestas realizadas
- **Puntos de Plantilla**: 1 millón por cada punto conseguido por los jugadores

## ⚽ Sistema de Puntuación DreamLeague

### Base General (Todos los Jugadores)
- Juega < 45 min: **+1 punto**
- Juega ≥ 45 min: **+2 puntos**
- Asistencia: **+3 puntos**
- Tarjeta amarilla: **-1 punto**
- Tarjeta roja: **-3 puntos**
- Penalti ganado: **+2 puntos**
- Penalti cometido: **-2 puntos**
- Penalti anotado: **+3 puntos**
- Penalti fallado: **-2 puntos**

### Portero (GK)
- Portería a cero (≥60 min): **+5 puntos**
- Gol encajado: **-2 puntos**
- Parada: **+1 punto**
- Penalti detenido: **+5 puntos**
- Gol marcado: **+10 puntos**
- Cada 5 recuperaciones: **+1 punto**

### Defensa (DEF)
- Portería a cero (≥60 min): **+4 puntos**
- Gol marcado: **+6 puntos**
- Cada 2 duelos ganados: **+1 punto**
- Cada 5 recuperaciones: **+1 punto**
- Gol encajado: **-1 punto**
- Tiro a puerta: **+1 punto**

### Centrocampista (MID)
- Portería a cero (≥60 min): **+1 punto**
- Gol marcado: **+5 puntos**
- Cada 2 goles encajados: **-1 punto**
- Pase clave: **+1 punto**
- Cada 2 regates exitosos: **+1 punto**
- Cada 3 faltas recibidas: **+1 punto**
- Cada 3 recuperaciones: **+1 punto**
- Tiro a puerta: **+1 punto**

### Delantero (ATT)
- Gol marcado: **+4 puntos**
- Pase clave: **+1 punto**
- Cada 3 faltas recibidas: **+1 punto**
- Cada 2 regates exitosos: **+1 punto**
- Tiro a puerta: **+1 punto**

## 🔄 Proceso de Cambio de Jornada

Cuando se ejecuta el cambio de jornada, el sistema:

1. **Evalúa las apuestas** de la jornada anterior
2. **Calcula el balance** de ganancias/pérdidas por usuario
3. **Obtiene las estadísticas** de cada jugador de cada plantilla para esa jornada (desde la API de Football)
4. **Calcula los puntos** según el sistema DreamLeague
5. **Suma los puntos totales** de la plantilla de cada usuario
6. **Actualiza el presupuesto**:
   - 500M base
   - + Balance de apuestas
   - + Puntos de plantilla (1M por punto)
7. **Actualiza los puntos totales** del usuario en la clasificación de la liga
8. **Resetea el presupuesto de apuestas** a 250M

## 📊 Ejemplo Práctico

### Usuario con Plantilla y Apuestas Exitosas

**Jornada 5:**
- Plantilla de 11 jugadores consigue: **52 puntos**
- Apuestas: 3 ganadas, 1 perdida = **+45M**

**Cálculo:**
```
Presupuesto = 500M + 45M + 52M = 597M para fichajes
Puntos totales en liga = puntos anteriores + 52
Presupuesto apuestas = 250M (reseteo)
```

### Usuario con Plantilla Regular y Apuestas Perdidas

**Jornada 5:**
- Plantilla consigue: **38 puntos**
- Apuestas: 0 ganadas, 2 perdidas = **-30M**

**Cálculo:**
```
Presupuesto = 500M - 30M + 38M = 508M para fichajes
Puntos totales en liga = puntos anteriores + 38
Presupuesto apuestas = 250M (reseteo)
```

## 🎯 Ventajas del Sistema

1. **Recompensa el rendimiento**: Los usuarios con mejores plantillas obtienen más presupuesto
2. **Balance entre apuestas y fantasy**: Ambos sistemas contribuyen al presupuesto
3. **Estrategia profunda**: Los usuarios deben gestionar tanto su plantilla como sus apuestas
4. **Competitivo**: La clasificación refleja el rendimiento real de la plantilla
5. **Dinámico**: El presupuesto varía cada jornada según el rendimiento

## 🔧 Implementación Técnica

### Backend (`jornada.service.ts`)

```typescript
// Métodos principales:
- calculateSquadPoints(userId, leagueId, jornada): Calcula puntos de plantilla
- calculatePlayerPoints(stats, role): Calcula puntos de un jugador según rol
- resetJornada(leagueId, jornada): Ejecuta todo el proceso de cambio de jornada
```

### Flujo de Datos

1. Obtiene plantilla del usuario desde la BD
2. Para cada jugador:
   - Consulta partidos de la jornada (Football API)
   - Obtiene estadísticas del jugador en el partido
   - Calcula puntos según el rol (GK, DEF, MID, ATT)
3. Suma todos los puntos de la plantilla
4. Actualiza `LeagueMember`:
   - `budget`: Nuevo presupuesto de fichajes
   - `points`: Puntos totales acumulados (para clasificación)
   - `bettingBudget`: 250M fijos

## 📝 Logs de Ejemplo

```
🔄 Iniciando cambio de jornada 5 para liga abc123...

📊 Evaluando 15 apuestas de la jornada 5...
✅ 15 apuestas evaluadas

💰 Balances de apuestas calculados para 8 usuarios

⚽ Usuario user1: 52 puntos de plantilla
⚽ Usuario user2: 38 puntos de plantilla
⚽ Usuario user3: 45 puntos de plantilla

✅ Puntos de plantilla calculados

👤 Usuario user1:
   Apuestas: 3W/1L = +45M
   Plantilla: 52 puntos = +52M
   Nuevo presupuesto: 597M (150 + 52 = 202 puntos totales)

👤 Usuario user2:
   Apuestas: 0W/2L = -30M
   Plantilla: 38 puntos = +38M
   Nuevo presupuesto: 508M (89 + 38 = 127 puntos totales)

✨ Cambio de jornada completado: 8 miembros actualizados
```

## ⚠️ Consideraciones

1. **Rate Limiting de API**: El sistema incluye pausas de 100ms entre peticiones para evitar límites de la API
2. **Rendimiento**: El cálculo puede tardar varios segundos por liga (depende del número de usuarios y jugadores)
3. **Precisión**: Los puntos se calculan solo si el jugador participó en un partido de esa jornada
4. **Roles**: Es importante que los jugadores tengan el rol correcto (GK, DEF, MID, ATT) para el cálculo preciso

## 🚀 Uso

### Panel de Admin
El administrador puede ejecutar el cambio de jornada desde el panel:
1. Navegar al Panel de Admin
2. Ingresar el número de jornada a procesar
3. Confirmar la ejecución
4. Ver los resultados detallados

### Script CLI
```bash
cd backend
npx tsx scripts/cambiar-jornada.ts <leagueId|all> <jornada>
```

## 📈 Impacto en la Clasificación

Los puntos conseguidos por la plantilla se acumulan en el campo `points` de `LeagueMember`, que se usa para la clasificación de la liga. Esto significa que:

- La clasificación refleja el rendimiento real de las plantillas
- No solo importa apostar bien, sino también tener buenos jugadores
- Los puntos se acumulan jornada tras jornada
- El líder es quien ha conseguido más puntos con su plantilla a lo largo de la temporada
