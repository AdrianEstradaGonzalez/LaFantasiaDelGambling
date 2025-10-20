# Eliminación del Tipo de Apuesta "Doble Oportunidad"

## 📋 Contexto

Se ha eliminado completamente el tipo de apuesta "Doble oportunidad" (Double Chance) del sistema por ser redundante con el tipo "Resultado".

### Problema Identificado

La apuesta "Doble oportunidad" generaba opciones como:
- "Victoria de [equipo local] o empate"
- "Victoria de [equipo visitante] o empate"
- "Victoria de [equipo local] o de [equipo visitante]" ← **Confuso y redundante**

Esta última opción (Home/Away) es especialmente problemática porque:
1. No es intuitivo que signifique "cualquier victoria excepto empate"
2. Ya existe el tipo "Resultado" que permite apostar a:
   - Victoria local
   - Empate
   - Victoria visitante

## 🔧 Cambios Realizados

### 1. Frontend - FutbolService.ts

**Líneas 730-732**: Eliminada generación de apuestas "Doble oportunidad" desde mapeo rápido
```typescript
// ANTES:
if (nameL.includes('double chance')) {
  if (valL.includes('home') && valL.includes('draw')) return { type: 'Doble oportunidad', label: `Victoria de ${homeName} o empate` };
  if (valL.includes('home') && valL.includes('away')) return { type: 'Doble oportunidad', label: `Victoria de ${homeName} o de ${awayName}` };
  if (valL.includes('draw') && valL.includes('away')) return { type: 'Doble oportunidad', label: `Empate o victoria de ${awayName}` };
}

// DESPUÉS:
// Double chance eliminado - redundante con 'Resultado'
```

**Líneas 863-865**: Eliminada generación desde API Bet ID 12
```typescript
// ANTES:
} else if (betId === 12) {
  if (v.value.includes('Home') && v.value.includes('Draw')) mapped = { type: 'Doble oportunidad', label: `Victoria de ${match.local} o empate` };
  else if (v.value.includes('Home') && v.value.includes('Away')) mapped = { type: 'Doble oportunidad', label: `Victoria de ${match.local} o de ${match.visitante}` };
  else if (v.value.includes('Draw') && v.value.includes('Away')) mapped = { type: 'Doble oportunidad', label: `Empate o victoria de ${match.visitante}` };
}

// DESPUÉS:
} else if (betId === 12) {
  // Double chance eliminado - redundante con 'Resultado'
  mapped = null;
}
```

### 2. Backend - jornada.service.ts

**Líneas 190-207**: Eliminada evaluación de apuestas "Doble oportunidad"
```typescript
// ANTES:
if (type === 'Doble oportunidad') {
  const homeWin = goalsHome > goalsAway;
  const draw = goalsHome === goalsAway;
  const awayWin = goalsAway > goalsHome;
  const homeTeam = fixture.teams?.home?.name?.toLowerCase();
  const awayTeam = fixture.teams?.away?.name?.toLowerCase();

  if (labelLower.includes('empate') && labelLower.includes(homeTeam)) {
    return homeWin || draw;
  }
  if (labelLower.includes('empate') && labelLower.includes(awayTeam)) {
    return awayWin || draw;
  }
  if (labelLower.includes(homeTeam) && labelLower.includes(awayTeam)) {
    return homeWin || awayWin;
  }
}

// DESPUÉS:
// Doble oportunidad eliminado - redundante con 'Resultado'
```

### 3. Backend - apiBetMapping.ts

**Líneas 127-157**: Eliminado mapeo de API Football Bet ID 12
```typescript
// ANTES:
// ========== DOBLE OPORTUNIDAD ==========
// API Bet ID: 12 - Double Chance
if (typeNorm.includes('doble oportunidad')) {
  if (labelNorm.includes('empate')) {
    if (labelNorm.includes(homeTeam.toLowerCase())) {
      return { apiBetId: 12, apiEndpoint: 'fixtures', apiStatKey: 'teams.away.winner', apiOperator: 'not_equals', apiValue: 'true' };
    }
    if (labelNorm.includes(awayTeam.toLowerCase())) {
      return { apiBetId: 12, apiEndpoint: 'fixtures', apiStatKey: 'teams.home.winner', apiOperator: 'not_equals', apiValue: 'true' };
    }
  }
  if (!labelNorm.includes('empate')) {
    return { apiBetId: 12, apiEndpoint: 'fixtures', apiStatKey: 'teams.home.winner,teams.away.winner', apiOperator: 'at_least_one_true', apiValue: 'true' };
  }
}

// DESPUÉS:
// ========== DOBLE OPORTUNIDAD (ELIMINADO) ==========
// Double chance eliminado - redundante con 'Resultado'
```

### 4. Frontend - ApuestasEvaluator.ts

**Líneas 182-198**: Eliminada evaluación de apuestas "Doble oportunidad"
```typescript
// ANTES:
if (type === "Doble oportunidad") {
  const homeWin = goalsHome > goalsAway;
  const draw = goalsHome === goalsAway;
  const awayWin = goalsAway > goalsHome;

  if (labelLower.includes("empate") && labelLower.includes(fixture.teams?.home?.name?.toLowerCase())) {
    return homeWin || draw;
  } else if (labelLower.includes("empate") && labelLower.includes(fixture.teams?.away?.name?.toLowerCase())) {
    return awayWin || draw;
  } else if (labelLower.includes(fixture.teams?.home?.name?.toLowerCase()) && labelLower.includes(fixture.teams?.away?.name?.toLowerCase())) {
    return homeWin || awayWin;
  }
}

// DESPUÉS:
// Doble oportunidad eliminado - redundante con 'Resultado'
```

## ✅ Tipos de Apuestas Disponibles

Después de esta limpieza, los tipos de apuesta disponibles son:

1. **Resultado** (Match Winner)
   - Victoria del equipo local
   - Empate
   - Victoria del equipo visitante

2. **Goles totales** (Over/Under Goals)
   - Más de X goles
   - Menos de X goles

3. **Ambos marcan** (Both Teams Score)
   - Ambos equipos marcarán
   - Al menos un equipo no marcará

4. **Tarjetas** (Cards Over/Under)
   - Más de X tarjetas
   - Menos de X tarjetas

5. **Córners** (Corners Over/Under)
   - Más de X córners
   - Menos de X córners

6. **Goles exactos** (Exact Goals)
   - Se marcarán exactamente X goles

7. **Par/Impar** (Odd/Even Goals)
   - Número impar de goles
   - Número par de goles

## 🎯 Impacto

### Positivo
- ✅ Sistema más claro y fácil de entender
- ✅ Eliminación de redundancia
- ✅ Menos confusión para los usuarios
- ✅ Código más limpio y mantenible

### A Considerar
- ⚠️ Las apuestas "Doble oportunidad" existentes en la base de datos no se evaluarán correctamente
- ⚠️ Recomendado: Limpiar apuestas antiguas de este tipo antes de abrir nueva jornada

## 🔄 Próximos Pasos

1. **Limpieza de datos** (opcional):
   ```sql
   -- Ver apuestas de tipo "Doble oportunidad" existentes
   SELECT * FROM "Bet" WHERE "betType" = 'Doble oportunidad';
   
   -- Si se desea eliminar (usar con precaución)
   DELETE FROM "Bet" WHERE "betType" = 'Doble oportunidad';
   ```

2. **Verificación**:
   - Abrir nueva jornada en el admin
   - Verificar que NO aparecen apuestas "Doble oportunidad"
   - Verificar que las apuestas "Resultado" siguen funcionando correctamente

## 📝 Notas Técnicas

- **API Football Bet ID 12** (Double Chance): Ahora se ignora completamente
- **Generación**: El frontend ya no genera opciones de este tipo al consultar la API
- **Evaluación**: El backend ya no evalúa apuestas de este tipo al cerrar jornadas
- **Mapeo**: El sistema ya no mapea este tipo de apuesta desde la API de Football

---

**Fecha**: Enero 2025  
**Motivo**: Simplificación y eliminación de redundancia en tipos de apuesta
