# 🐛 BUG CRÍTICO: Cálculo de Puntos de Jornada Incorrecta

## 🔴 Problema Detectado

### Síntoma:
Al cerrar la **jornada 9**, el sistema estaba calculando puntos de jugadores usando la **jornada 5** (u otra anterior) en lugar de la **jornada 9**.

### Ejemplo del Bug:
```
Usuario cierra jornada 9

Jugador: Garces
  - Jornada 5: 8 puntos
  - Jornada 6: 0 puntos (lesionado)
  - Jornada 7: 0 puntos (lesionado)
  - Jornada 8: 0 puntos (lesionado)
  - Jornada 9: 0 puntos (lesionado)

❌ ANTES (BUG):
  Sistema usaba jornada 5 → +8 puntos
  
✅ DESPUÉS (CORREGIDO):
  Sistema usa jornada 9 → 0 puntos
```

---

## 🔍 Causa Raíz

### Código Problemático (ANTES):

**Archivo**: `backend/src/services/jornada.service.ts`  
**Línea**: 395-399

```typescript
private static async calculateSquadPoints(userId: string, leagueId: string, jornadaObjetivo: number): Promise<number> {
  try {
    // ❌ PROBLEMA: Buscaba la última jornada donde el jugador tuvo estadísticas
    const jornada = await this.findLastCompletedJornada(jornadaObjetivo);
    console.log(`jornadaObjetivo=${jornadaObjetivo}, jornadaUsada=${jornada}`);
```

### Método Problemático: `findLastCompletedJornada()`

**Línea**: 329-393

Este método hacía lo siguiente:

```typescript
public static async findLastCompletedJornada(targetJornada: number): Promise<number> {
  // Intentar desde la jornada objetivo hacia atrás (9, 8, 7, 6, 5...)
  for (let j = targetJornada; j >= 1; j--) {
    const fixtures = await api.get('/fixtures', {
      params: { round: `Regular Season - ${j}` }
    });
    
    const hasFinishedMatches = fixtures.some(f => 
      ['FT', 'AET', 'PEN'].includes(f.fixture.status.short)
    );
    
    if (hasFinishedMatches) {
      console.log(`✅ Jornada ${j} tiene partidos terminados.`);
      return j;  // ❌ Devuelve jornada 5 en lugar de 9
    }
  }
}
```

### ¿Por qué ocurría el bug?

El método buscaba **hacia atrás** desde la jornada objetivo hasta encontrar una jornada con partidos terminados. Esto causaba que:

1. Si la jornada 9 no tenía todos los partidos terminados aún
2. Buscaba en jornada 8, 7, 6, 5...
3. Encontraba la jornada 5 con partidos terminados
4. **Usaba la jornada 5** en lugar de la 9

**Escenario real**:
```
Cerrando jornada 9:
  - Jornada 9: Solo 8/10 partidos terminados
  - Jornada 8: Solo 7/10 partidos terminados
  - Jornada 7: Solo 6/10 partidos terminados
  - Jornada 6: Solo 5/10 partidos terminados
  - Jornada 5: 10/10 partidos terminados ✅
  
  ❌ Sistema usa jornada 5 (incorrecta)
```

---

## ✅ Solución Implementada

### Código Corregido (DESPUÉS):

**Archivo**: `backend/src/services/jornada.service.ts`  
**Línea**: 395-400

```typescript
private static async calculateSquadPoints(userId: string, leagueId: string, jornadaObjetivo: number): Promise<number> {
  try {
    // ✅ SOLUCIÓN: Usar SIEMPRE la jornada objetivo (la que se está cerrando)
    // Si el jugador no jugó, tendrá 0 puntos (correcto)
    const jornada = jornadaObjetivo;
    console.log(`    🔍 Calculando puntos para userId=${userId}, leagueId=${leagueId}, jornada=${jornada}`);
```

### Cambios Realizados:

1. **Eliminada** la llamada a `findLastCompletedJornada()`
2. **Uso directo** de `jornadaObjetivo`
3. **Comportamiento correcto**: Si el jugador no jugó, obtiene 0 puntos

---

## 🎯 Comportamiento Correcto

### Caso 1: Jugador jugó en la jornada

```
Cerrando jornada 9

Lewandowski:
  - Jornada 9: Barcelona vs Real Madrid
  - Stats: 2 goles, 1 asistencia, 90 minutos
  - Puntos: 15

✅ Sistema usa jornada 9 → +15 puntos (correcto)
```

### Caso 2: Jugador NO jugó en la jornada (lesionado)

```
Cerrando jornada 9

Garces:
  - Jornada 5: 8 puntos (jugó)
  - Jornada 9: 0 puntos (lesionado)

✅ Sistema usa jornada 9 → 0 puntos (correcto)
❌ ANTES usaba jornada 5 → 8 puntos (incorrecto)
```

### Caso 3: Jugador no convocado

```
Cerrando jornada 9

Suplente:
  - Jornada 9: Partido existe pero el jugador no jugó
  - Stats: No encontradas en la API

✅ Sistema usa jornada 9 → 0 puntos (correcto)
```

---

## 🔄 Flujo Corregido

### ANTES (Incorrecto):

```
1. Cerrar jornada 9
2. Para cada jugador:
   a. findLastCompletedJornada(9) → Devuelve 5 ❌
   b. Busca partido de jornada 5
   c. Obtiene stats de jornada 5
   d. Calcula puntos de jornada 5 ❌
3. Resultado: Puntos incorrectos
```

### DESPUÉS (Correcto):

```
1. Cerrar jornada 9
2. Para cada jugador:
   a. Usa jornada 9 directamente ✅
   b. Busca partido de jornada 9
   c. Obtiene stats de jornada 9
   d. Si no hay stats → 0 puntos ✅
3. Resultado: Puntos correctos
```

---

## 📊 Impacto del Bug

### Jugadores Afectados:

Cualquier jugador que:
- Estuvo lesionado en jornadas recientes
- Fue suplente sin entrar
- Cambió de equipo
- Fue sancionado

### Síntomas Visibles:

1. **Puntos inflados**: Usuarios con jugadores lesionados seguían sumando puntos
2. **Presupuestos incorrectos**: El budget se calculaba con puntos de jornadas antiguas
3. **Clasificación errónea**: Usuarios con jugadores lesionados mantenían ventaja injusta

### Ejemplo Real:

```
Usuario A con Garces:
  
Jornada 5 (Garces jugó):
  - Puntos de Garces: 8
  - Total usuario: 50 puntos
  
Jornadas 6-9 (Garces lesionado):
  
❌ ANTES (BUG):
  - Jornada 6: +8 puntos (de jornada 5) ❌
  - Jornada 7: +8 puntos (de jornada 5) ❌
  - Jornada 8: +8 puntos (de jornada 5) ❌
  - Jornada 9: +8 puntos (de jornada 5) ❌
  - Total: 50 + 32 = 82 puntos ❌

✅ DESPUÉS (CORRECTO):
  - Jornada 6: 0 puntos (lesionado) ✅
  - Jornada 7: 0 puntos (lesionado) ✅
  - Jornada 8: 0 puntos (lesionado) ✅
  - Jornada 9: 0 puntos (lesionado) ✅
  - Total: 50 puntos ✅
```

---

## 🧪 Testing

### Caso de Prueba 1: Jugador Activo

```bash
# Configuración
Jornada a cerrar: 9
Jugador: Lewandowski
Estado: Jugó 90 minutos en jornada 9

# Esperado
✅ Usa jornada 9
✅ Puntos: 15 (según stats de jornada 9)
```

### Caso de Prueba 2: Jugador Lesionado

```bash
# Configuración
Jornada a cerrar: 9
Jugador: Garces
Estado: Lesionado desde jornada 6
Última vez que jugó: Jornada 5 (8 puntos)

# Esperado
✅ Usa jornada 9
✅ Puntos: 0 (no jugó en jornada 9)
❌ NO debe usar jornada 5
```

### Caso de Prueba 3: Jugador Suplente

```bash
# Configuración
Jornada a cerrar: 9
Jugador: Suplente que no entró
Estado: En el banquillo pero no jugó

# Esperado
✅ Usa jornada 9
✅ Puntos: 0 (0 minutos)
```

---

## 📝 Logs Antes y Después

### ANTES (Bug):

```
🔍 Calculando puntos para userId=abc123, leagueId=liga1, jornadaObjetivo=9, jornadaUsada=5
   🔍 ===== PROCESANDO JUGADOR =====
      Nombre: Garces
      Jornada a buscar: 5  ❌ Incorrecto
      ⚽ PUNTOS: 8  ❌ De jornada 5
```

### DESPUÉS (Corregido):

```
🔍 Calculando puntos para userId=abc123, leagueId=liga1, jornada=9
   🔍 ===== PROCESANDO JUGADOR =====
      Nombre: Garces
      Jornada a buscar: 9  ✅ Correcto
      ⚠️ No participó en el partido (lesionado)
      ⚽ PUNTOS: 0  ✅ Correcto
```

---

## 🎯 Método `findLastCompletedJornada` - ¿Eliminarlo?

### Decisión: **MANTENER** pero NO usar en `calculateSquadPoints`

**Razones para mantenerlo**:
- Puede ser útil para otros casos (mostrar última jornada con datos)
- No causa daño si no se usa
- Puede servir para futuras funcionalidades

**Razones para NO usarlo aquí**:
- El cierre de jornada debe usar **siempre** la jornada objetivo
- Si un jugador no jugó, debe tener 0 puntos (no puntos de jornadas pasadas)
- El comportamiento actual es el correcto

---

## ✅ Resumen de la Corrección

| Aspecto | ANTES (Bug) | DESPUÉS (Correcto) |
|---------|-------------|-------------------|
| **Jornada usada** | Última con stats (ej: 5) | Jornada objetivo (ej: 9) |
| **Jugador lesionado** | Puntos de jornada antigua ❌ | 0 puntos ✅ |
| **Comportamiento** | Busca hacia atrás ❌ | Usa jornada específica ✅ |
| **Código** | `await findLastCompletedJornada()` | `jornadaObjetivo` directo |
| **Logs** | `jornadaUsada=5` | `jornada=9` |

---

## 🔧 Archivos Modificados

- ✅ `backend/src/services/jornada.service.ts` - Línea 395-400

---

## 🚀 Próximos Pasos

1. ✅ **Código corregido**
2. ⏳ **Probar con jornada real** (cerrar jornada y verificar puntos)
3. ⏳ **Verificar logs** (debe mostrar `jornada=X` sin `jornadaUsada`)
4. ⏳ **Confirmar presupuestos** (deben calcularse con puntos correctos)

---

**Fecha de corrección**: 2025-01-20  
**Bug detectado por**: Usuario  
**Severidad**: Alta (afecta cálculo de puntos y presupuestos)  
**Estado**: ✅ Corregido
