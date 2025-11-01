# 🔄 Workers de Actualización de Rankings

Este sistema cuenta con **dos workers** que actualizan los rankings de las ligas de Primera División:

## 📁 Archivos

### 1. `update-live-rankings.ts` (Partidos Terminados)
Worker que procesa partidos **finalizados** (status: FT - Full Time)

### 2. `update-live-rankings-in-progress.ts` (Partidos en Curso)
Worker que procesa partidos **en vivo** (live: all)

---

## 🎯 Cuándo usar cada uno

### ✅ Partidos Terminados (`update-live-rankings.ts`)

**Propósito**: Actualizar puntuaciones definitivas cuando los partidos han finalizado

**Características**:
- ✅ Consulta partidos con `status: 'FT'` (Full Time)
- ✅ Guarda estadísticas definitivas en `PlayerStats`
- ✅ Los puntos son **finales** y no cambiarán
- ✅ Ideal para ejecutar **después de cada jornada**

**Cuándo ejecutar**:
- ⏰ Después de que terminen los partidos de la jornada
- ⏰ Por ejemplo: Lunes después de la última jornada del fin de semana
- ⏰ Se puede ejecutar varias veces (hace upsert, no duplica datos)

**Comando**:
```bash
npx tsx scripts/update-live-rankings.ts
```

---

### 🔴 Partidos en Curso (`update-live-rankings-in-progress.ts`)

**Propósito**: Actualizar puntuaciones en tiempo real mientras los partidos se están jugando

**Características**:
- 🔴 Consulta partidos con `live: 'all'` (en curso)
- 🔴 Guarda estadísticas **temporales** en `PlayerStats`
- 🔴 Los puntos son **provisionales** y cambiarán constantemente
- 🔴 Ideal para ejecutar **cada 2-5 minutos** durante los partidos

**Cuándo ejecutar**:
- ⏰ Durante los partidos de la jornada
- ⏰ Por ejemplo: Cada 2-5 minutos mientras hay partidos en vivo
- ⏰ Configurar con cron job para ejecución automática

**Comando**:
```bash
npx tsx scripts/update-live-rankings-in-progress.ts
```

---

## 🔄 Flujo Recomendado

### Durante la Jornada (Fin de semana)

```
┌─────────────────────────────────────────┐
│  Sábado/Domingo - Partidos en vivo      │
├─────────────────────────────────────────┤
│  🔴 Worker EN CURSO cada 2-5 minutos    │
│  - Actualiza puntos provisionales        │
│  - Los usuarios ven cambios en vivo      │
└─────────────────────────────────────────┘
```

### Después de la Jornada

```
┌─────────────────────────────────────────┐
│  Lunes - Todos los partidos terminados  │
├─────────────────────────────────────────┤
│  ✅ Worker TERMINADOS una vez           │
│  - Actualiza puntos definitivos          │
│  - Los puntos ya no cambiarán            │
└─────────────────────────────────────────┘
```

---

## ⚙️ Configuración de Cron Jobs

### Opción 1: Durante partidos en vivo
```
*/2 * * * *   # Cada 2 minutos (solo cuando hay partidos)
```

### Opción 2: Después de jornada
```
0 22 * * 1    # Lunes a las 22:00 (después de todos los partidos)
```

### Opción 3: Combinado (Recomendado)
- **Sábados/Domingos**: Worker EN CURSO cada 2-5 minutos
- **Lunes**: Worker TERMINADOS una vez

---

## 🏗️ Arquitectura Compartida

Ambos workers comparten:
- ✅ Sistema de cálculo de puntos centralizado (`pointsCalculator.ts`)
- ✅ Guardan en la misma tabla `PlayerStats` (upsert)
- ✅ Actualizan `LeagueMember.points` (total de jornada, no acumulativo)
- ✅ Consideran capitán (x2 puntos) por usuario
- ✅ Consultan jornada actual desde BD

---

## 📊 Diferencias Clave

| Característica | Terminados | En Curso |
|---|---|---|
| **Status API** | `status: 'FT'` | `live: 'all'` |
| **Frecuencia** | Una vez/jornada | Cada 2-5 min |
| **Puntos** | Definitivos | Provisionales |
| **Cuándo** | Después jornada | Durante partidos |
| **Peticiones** | ~10/jornada | ~450/día |

---

## 🎯 Ejemplo Práctico

### Jornada 11 - Real Madrid vs Barcelona

**Sábado 18:00 - Partido en curso (45')**
```bash
# Worker EN CURSO
npx tsx scripts/update-live-rankings-in-progress.ts
```
Output:
```
⚽ Partidos en curso: Real Madrid vs Barcelona (45')
📊 Benzema: 8 puntos (1 gol, 1 asistencia) - PROVISIONAL
✅ Usuario1: 87 puntos EN VIVO
```

**Sábado 20:00 - Partido terminado (FT 3-2)**
```bash
# Worker TERMINADOS
npx tsx scripts/update-live-rankings.ts
```
Output:
```
⚽ Partidos terminados: Real Madrid vs Barcelona
📊 Benzema: 12 puntos (2 goles, 1 asistencia) - DEFINITIVO
✅ Usuario1: 104 puntos FINALES
```

---

## 🚀 Comandos Rápidos

```bash
# Probar worker de partidos terminados
cd backend
npx tsx scripts/update-live-rankings.ts

# Probar worker de partidos en curso
cd backend
npx tsx scripts/update-live-rankings-in-progress.ts

# Ver logs en tiempo real
npx tsx scripts/update-live-rankings-in-progress.ts | tee live-log.txt
```

---

## ⚠️ Notas Importantes

1. **Ambos workers hacen upsert**: No duplican datos, actualizan los existentes
2. **PlayerStats se sobrescribe**: El worker de terminados reemplaza los datos del worker en curso
3. **Puntos en LeagueMember**: Siempre son totales de jornada, no acumulativos
4. **Capitán x2**: Se aplica en ambos workers, es específico por usuario
5. **Consumo API**: Worker en curso consume más peticiones (ejecutar solo durante partidos)

---

## 📝 Próximos Pasos

- [ ] Configurar cron jobs en servidor (cron-job.org o node-cron)
- [ ] Crear endpoint REST para activar workers manualmente
- [ ] Agregar logs a archivo para debugging
- [ ] Implementar notificaciones cuando termine jornada
- [ ] Dashboard de monitoreo de workers
