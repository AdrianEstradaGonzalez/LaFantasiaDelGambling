# REPORTE DE TIPOS DE APUESTAS - EVALUACIÓN IMPLEMENTADA

## RESUMEN EJECUTIVO

**Total de tipos de apuesta en BET_TYPE_TRANSLATIONS**: 98 tipos
**Tipos con evaluación implementada**: 14 tipos (~14%)
**Tipos sin evaluación implementada**: 84 tipos (~86%)

---

## ✅ TIPOS DE APUESTAS CON EVALUACIÓN IMPLEMENTADA (14)

### 1. **Más/Menos Goles** (Goals Over/Under)
**Traducciones**: `'Goals Over/Under'`, `'Over/Under'`, `'Total Goals'`

**Código de evaluación**:
```typescript
// GOLES TOTALES
if (betType.includes('goles') || betType.includes('goals')) {
  const totalGoals = stats.homeGoals + stats.awayGoals;
  
  if (betLabelLower.includes('más de') || betLabelLower.includes('over')) {
    const threshold = parseFloat(betLabelLower.match(/\d+\.?\d*/)?.[0] || '0');
    const won = totalGoals > threshold;
    return { won, actualResult: `${totalGoals} goles totales` };
  }
  
  if (betLabelLower.includes('menos de') || betLabelLower.includes('under')) {
    const threshold = parseFloat(betLabelLower.match(/\d+\.?\d*/)?.[0] || '0');
    const won = totalGoals < threshold;
    return { won, actualResult: `${totalGoals} goles totales` };
  }
}
```
**Variables usadas**: `stats.homeGoals`, `stats.awayGoals`

---

### 2. **Más/Menos Goles Primera Parte** (First Half Goals Over/Under)
**Traducciones**: `'First Half Goals Over/Under'`, `'First Half Total Goals'`

**Código de evaluación**:
```typescript
if (isPrimeraParte) {
  totalGoals = stats.homeGoalsHalftime + stats.awayGoalsHalftime;
  goalsLabel = 'goles en primera parte';
  
  if (betLabelLower.includes('más de') || betLabelLower.includes('over')) {
    const threshold = parseFloat(betLabelLower.match(/\d+\.?\d*/)?.[0] || '0');
    const won = totalGoals > threshold;
    return { won, actualResult: `${totalGoals} ${goalsLabel}` };
  }
}
```
**Variables usadas**: `stats.homeGoalsHalftime`, `stats.awayGoalsHalftime`

---

### 3. **Más/Menos Goles Segunda Parte** (Second Half Goals Over/Under)
**Traducciones**: `'Second Half Goals Over/Under'`, `'Second Half Total Goals'`

**Código de evaluación**:
```typescript
if (isSegundaParte) {
  const homeGoalsSecondHalf = stats.homeGoals - stats.homeGoalsHalftime;
  const awayGoalsSecondHalf = stats.awayGoals - stats.awayGoalsHalftime;
  totalGoals = homeGoalsSecondHalf + awayGoalsSecondHalf;
  goalsLabel = 'goles en segunda parte';
  
  if (betLabelLower.includes('más de') || betLabelLower.includes('over')) {
    const threshold = parseFloat(betLabelLower.match(/\d+\.?\d*/)?.[0] || '0');
    const won = totalGoals > threshold;
    return { won, actualResult: `${totalGoals} ${goalsLabel}` };
  }
}
```
**Variables usadas**: Cálculo derivado de goles finales menos goles al descanso

---

### 4. **Más/Menos Corners** (Corners Over/Under)
**Traducciones**: `'Corners Over/Under'`, `'Total Corners'`

**Código de evaluación**:
```typescript
if (betType.includes('córner') || betType.includes('corner')) {
  const totalCorners = stats.homeCorners + stats.awayCorners;
  
  if (betLabel.includes('más de') || betLabel.includes('over')) {
    const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
    return {
      won: totalCorners > threshold,
      actualResult: `${totalCorners} córners totales`
    };
  }
  
  if (betLabel.includes('menos de') || betLabel.includes('under')) {
    const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
    return {
      won: totalCorners < threshold,
      actualResult: `${totalCorners} córners totales`
    };
  }
}
```
**Variables usadas**: `stats.homeCorners`, `stats.awayCorners`

---

### 5. **Más/Menos Tarjetas** (Cards Over/Under)
**Traducciones**: `'Cards Over/Under'`, `'Total Cards'`

**Código de evaluación**:
```typescript
if (betType.includes('tarjeta') || betType.includes('card')) {
  const totalYellow = stats.homeYellowCards + stats.awayYellowCards;
  const totalRed = stats.homeRedCards + stats.awayRedCards;
  const totalCards = totalYellow + totalRed;
  
  if (betLabel.includes('más de') || betLabel.includes('over')) {
    const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
    return {
      won: totalCards > threshold,
      actualResult: `${totalCards} tarjetas (${totalYellow} amarillas, ${totalRed} rojas)`
    };
  }
}
```
**Variables usadas**: `stats.homeYellowCards`, `stats.awayYellowCards`, `stats.homeRedCards`, `stats.awayRedCards`

---

### 6. **Gana Local o Visitante (Sin Empate)** (Home/Away)
**Traducciones**: `'Home/Away'`

**Código de evaluación**:
```typescript
if (betType.toLowerCase().includes('gana local o visitante') || 
    betType.toLowerCase().includes('sin empate') ||
    betType.toLowerCase().includes('home/away')) {
  const result = stats.homeGoals > stats.awayGoals ? 'local' : 
                 stats.awayGoals > stats.homeGoals ? 'visitante' : 'empate';
  
  // Si hay empate, todas las apuestas pierden
  if (result === 'empate') {
    return {
      won: false,
      actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam} - Empate (apuesta perdida)`
    };
  }

  return {
    won: result === prediction,
    actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam}`
  };
}
```

---

### 7. **Gana con Reembolso si Empate** (Draw No Bet)
**Traducciones**: `'Draw No Bet'`

**Código de evaluación**:
```typescript
if (betType.toLowerCase().includes('gana con reembolso') || 
    betType.toLowerCase().includes('draw no bet')) {
  const result = stats.homeGoals > stats.awayGoals ? 'local' : 
                 stats.awayGoals > stats.homeGoals ? 'visitante' : 'empate';
  
  // Lógica de reembolso si empate
  // (código presente en líneas 300-320)
}
```

---

### 8. **Resultado Final / Ganador del Partido** (Match Winner / 1X2)
**Traducciones**: `'Match Winner'`, `'Winner'`, `'Fulltime Result'`

**Código de evaluación**:
```typescript
if (betType.includes('resultado') || betType.includes('match result') || betType.includes('1x2')) {
  const result = stats.homeGoals > stats.awayGoals ? 'local' : 
                 stats.awayGoals > stats.homeGoals ? 'visitante' : 'empate';
  
  let prediction = '';
  if (betLabel.includes('local') || betLabel.includes('home') || betLabel === '1') {
    prediction = 'local';
  } else if (betLabel.includes('visitante') || betLabel.includes('away') || betLabel === '2') {
    prediction = 'visitante';
  } else if (betLabel.includes('empate') || betLabel.includes('draw') || betLabel === 'x') {
    prediction = 'empate';
  }

  return {
    won: result === prediction,
    actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam}`
  };
}
```

---

### 9. **Ambos Equipos Marcan** (Both Teams To Score / BTTS)
**Traducciones**: `'Both Teams Score'`, `'Both Teams To Score'`, `'BTTS'`

**Código de evaluación**:
```typescript
if (betType.includes('ambos') || betType.includes('both') || betType.includes('btts')) {
  const bothScored = stats.homeGoals > 0 && stats.awayGoals > 0;
  
  const labelLower = betLabel.toLowerCase().trim();
  const isNoPrediction = labelLower === 'no' || 
                        labelLower.includes('no ') || 
                        labelLower.includes('no ambos') || 
                        labelLower.includes('ninguno') ||
                        labelLower.includes('neither') ||
                        labelLower.includes('al menos un equipo no');
  
  const prediction = !isNoPrediction;
  
  return {
    won: bothScored === prediction,
    actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam} - ${bothScored ? 'Ambos marcaron' : 'No ambos marcaron'}`
  };
}
```

---

### 10. **Tiros a Puerta** (Shots on Goal)
**Traducciones**: No está en BET_TYPE_TRANSLATIONS pero sí implementado

**Código de evaluación**:
```typescript
if (betType.includes('tiros') || betType.includes('shots')) {
  const totalShots = stats.homeShotsOnGoal + stats.awayShotsOnGoal;
  
  if (betLabel.includes('más de') || betLabel.includes('over')) {
    const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
    return {
      won: totalShots > threshold,
      actualResult: `${totalShots} tiros a puerta`
    };
  }
}
```
**Variables usadas**: `stats.homeShotsOnGoal`, `stats.awayShotsOnGoal`

---

### 11. **Portería a Cero - Local** (Clean Sheet - Home)
**Traducciones**: `'Clean Sheet - Home'`, `'Home Clean Sheet'`

**Código de evaluación**:
```typescript
if (betType.toLowerCase().includes('portería') && betType.toLowerCase().includes('cero')) {
  const isLocal = betType.toLowerCase().includes('local');
  const labelLower = betLabel.toLowerCase();
  const isSi = labelLower === 'sí' || labelLower === 'si';
  
  if (isLocal) {
    // Sí = el local no encajó goles (awayGoals === 0)
    const cleanSheet = stats.awayGoals === 0;
    return {
      won: isSi ? cleanSheet : !cleanSheet,
      actualResult: `${stats.homeTeam} encajó ${stats.awayGoals} goles`
    };
  }
}
```

---

### 12. **Portería a Cero - Visitante** (Clean Sheet - Away)
**Traducciones**: `'Clean Sheet - Away'`, `'Away Clean Sheet'`

**Código de evaluación**:
```typescript
if (isVisitante) {
  // Sí = el visitante no encajó goles (homeGoals === 0)
  const cleanSheet = stats.homeGoals === 0;
  return {
    won: isSi ? cleanSheet : !cleanSheet,
    actualResult: `${stats.awayTeam} encajó ${stats.homeGoals} goles`
  };
}
```

---

### 13. **Local Gana sin Encajar** (Home Win To Nil)
**Traducciones**: `'Home Win To Nil'`, `'Win To Nil'`

**Código de evaluación**:
```typescript
if (betType.toLowerCase().includes('sin encajar') || betType.toLowerCase().includes('win to nil')) {
  const isLocal = betTypeLower.includes('local') || betTypeLower.includes('home');
  
  if (isLocal) {
    const homeWins = stats.homeGoals > stats.awayGoals;
    const cleanSheet = stats.awayGoals === 0;
    const won = homeWins && cleanSheet;
    
    return {
      won,
      actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam} - ${won ? 'Local gana sin encajar' : homeWins ? 'Local gana pero encaja' : cleanSheet ? 'Local no encaja pero no gana' : 'Local no gana y encaja'}`
    };
  }
}
```

---

### 14. **Visitante Gana sin Encajar** (Away Win To Nil)
**Traducciones**: `'Away Win To Nil'`

**Código de evaluación**:
```typescript
if (isVisitante) {
  const awayWins = stats.awayGoals > stats.homeGoals;
  const cleanSheet = stats.homeGoals === 0;
  const won = awayWins && cleanSheet;
  
  return {
    won,
    actualResult: `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam} - ${won ? 'Visitante gana sin encajar' : awayWins ? 'Visitante gana pero encaja' : cleanSheet ? 'Visitante no encaja pero no gana' : 'Visitante no gana y encaja'}`
  };
}
```

---

## ❌ TIPOS DE APUESTAS SIN EVALUACIÓN IMPLEMENTADA (84)

### CATEGORÍA: Resultados Específicos (7 tipos)

1. **Ganador Primera Parte** (`'First Half Winner'`)
   - **Datos necesarios**: Resultado al descanso (disponible: `stats.homeGoalsHalftime`, `stats.awayGoalsHalftime`)
   - **Complejidad**: BAJA - datos ya disponibles

2. **Ganador Segunda Parte** (`'Second Half Winner'`)
   - **Datos necesarios**: Goles de segunda parte (calcular: goles finales - goles descanso)
   - **Complejidad**: BAJA - cálculo simple

3. **Resultado al Descanso** (`'Halftime Result'`)
   - **Datos necesarios**: Resultado 1X2 al descanso
   - **Complejidad**: BAJA - datos ya disponibles

4. **Resultado Descanso/Final** (`'Halftime/Fulltime'`)
   - **Datos necesarios**: Combinación de resultados (HH, HD, HA, DH, DD, DA, AH, AD, AA)
   - **Complejidad**: MEDIA - requiere lógica de combinación

5. **Resultado Exacto** (`'Exact Score'`, `'Correct Score'`)
   - **Datos necesarios**: Marcador exacto
   - **Complejidad**: BAJA - comparación directa

6. **Resultado 10 Minutos** (`'10 Minutes Result'`)
   - **Datos necesarios**: API no proporciona eventos minuto a minuto
   - **Complejidad**: ALTA - requiere datos adicionales de eventos

7. **Resultado 15 Minutos** (`'15 Minutes Result'`)
   - **Datos necesarios**: API no proporciona eventos minuto a minuto
   - **Complejidad**: ALTA - requiere datos adicionales de eventos

---

### CATEGORÍA: Goles Específicos (11 tipos)

8. **Total Goles Local** (`'Home Team Total Goals'`)
   - **Datos necesarios**: `stats.homeGoals`
   - **Complejidad**: BAJA - dato ya disponible

9. **Total Goles Visitante** (`'Away Team Total Goals'`)
   - **Datos necesarios**: `stats.awayGoals`
   - **Complejidad**: BAJA - dato ya disponible

10. **Primer Equipo en Marcar** (`'First Team To Score'`, `'Team To Score First'`)
    - **Datos necesarios**: Eventos de goles ordenados por tiempo
    - **Complejidad**: ALTA - requiere API de eventos

11. **Último Equipo en Marcar** (`'Last Team To Score'`, `'Team To Score Last'`)
    - **Datos necesarios**: Eventos de goles ordenados por tiempo
    - **Complejidad**: ALTA - requiere API de eventos

12. **Parte con Más Goles** (`'Highest Scoring Half'`)
    - **Datos necesarios**: Comparar goles primera parte vs segunda parte
    - **Complejidad**: BAJA - cálculo simple

13. **Segunda Parte con Más Goles** (`'Highest Scoring Half 2nd Half'`)
    - **Datos necesarios**: Comparar goles por parte
    - **Complejidad**: BAJA - cálculo simple

14. **Primera Parte con Más Goles** (`'Highest Scoring Half 1st Half'`)
    - **Datos necesarios**: Comparar goles por parte
    - **Complejidad**: BAJA - cálculo simple

15. **Gol en Ambas Partes** (`'Goal In Both Halves'`)
    - **Datos necesarios**: Verificar si hubo al menos 1 gol en cada parte
    - **Complejidad**: BAJA - datos disponibles

16. **Marcará en Cualquier Momento** (`'Anytime Goalscorer'`)
    - **Datos necesarios**: Goleadores del partido
    - **Complejidad**: ALTA - requiere API de eventos de jugadores

17. **Primer Goleador** (`'First Goalscorer'`)
    - **Datos necesarios**: Jugador que marcó primero
    - **Complejidad**: ALTA - requiere API de eventos de jugadores

18. **Último Goleador** (`'Last Goalscorer'`)
    - **Datos necesarios**: Jugador que marcó último
    - **Complejidad**: ALTA - requiere API de eventos de jugadores

---

### CATEGORÍA: Corners Específicos (5 tipos)

19. **Corners del Local** (`'Home Team Corners'`)
    - **Datos necesarios**: `stats.homeCorners`
    - **Complejidad**: BAJA - dato ya disponible

20. **Corners del Visitante** (`'Away Team Corners'`)
    - **Datos necesarios**: `stats.awayCorners`
    - **Complejidad**: BAJA - dato ya disponible

21. **Corners Primera Parte** (`'First Half Corners'`)
    - **Datos necesarios**: Corners por tiempo
    - **Complejidad**: ALTA - API no proporciona corners por tiempo

22. **Corners Segunda Parte** (`'Second Half Corners'`)
    - **Datos necesarios**: Corners por tiempo
    - **Complejidad**: ALTA - API no proporciona corners por tiempo

23. **Más/Menos Corners Primera Parte** (inferido)
    - **Datos necesarios**: Corners primera parte
    - **Complejidad**: ALTA - requiere datos adicionales

---

### CATEGORÍA: Tarjetas Específicas (4 tipos)

24. **Tarjetas del Local** (`'Home Team Cards'`)
    - **Datos necesarios**: `stats.homeYellowCards + stats.homeRedCards`
    - **Complejidad**: BAJA - datos disponibles

25. **Tarjetas del Visitante** (`'Away Team Cards'`)
    - **Datos necesarios**: `stats.awayYellowCards + stats.awayRedCards`
    - **Complejidad**: BAJA - datos disponibles

26. **Tarjetas de Jugadores** (`'Player Cards'`)
    - **Datos necesarios**: Tarjetas específicas de jugadores
    - **Complejidad**: ALTA - requiere API de eventos de jugadores

27. **Más/Menos Tarjetas Primera/Segunda Parte** (no listado pero posible)
    - **Datos necesarios**: Tarjetas por tiempo
    - **Complejidad**: ALTA - requiere datos adicionales

---

### CATEGORÍA: Doble Oportunidad y Combinadas (4 tipos)

28. **Doble Oportunidad** (`'Double Chance'`)
    - **Datos necesarios**: Resultado final (1X, 12, X2)
    - **Complejidad**: BAJA - datos disponibles

29. **Resultado y Ambos Marcan** (`'Result & Both Teams To Score'`)
    - **Datos necesarios**: Combinar resultado + BTTS
    - **Complejidad**: BAJA - ambos datos disponibles

30. **Resultado y Total de Goles** (`'Result & Total Goals'`)
    - **Datos necesarios**: Combinar resultado + over/under
    - **Complejidad**: BAJA - ambos datos disponibles

31. **Ambos Marcan y Total** (`'Both Teams To Score & Total'`)
    - **Datos necesarios**: Combinar BTTS + over/under
    - **Complejidad**: BAJA - ambos datos disponibles

---

### CATEGORÍA: Marcar Goles (4 tipos)

32. **Local Marca un Gol** (`'Home Team Score A Goal'`, `'Home Team Score a Goal'`)
    - **Datos necesarios**: Verificar si local marcó al menos 1 gol
    - **Complejidad**: BAJA - dato disponible

33. **Visitante Marca un Gol** (`'Away Team Score A Goal'`, `'Away Team Score a Goal'`)
    - **Datos necesarios**: Verificar si visitante marcó al menos 1 gol
    - **Complejidad**: BAJA - dato disponible

34. **Marcar en Ambas Partes** (`'Score In Both Halves'`)
    - **Datos necesarios**: Verificar si un equipo marcó en ambas mitades
    - **Complejidad**: MEDIA - requiere especificar equipo

35. **Marcar Primero** (`'First Goal'`)
    - **Datos necesarios**: Eventos de goles
    - **Complejidad**: ALTA - requiere API de eventos

---

### CATEGORÍA: Ganar Partes (4 tipos)

36. **Ganar Alguna Parte** (`'Win Either Half'`)
    - **Datos necesarios**: Resultado de cada parte
    - **Complejidad**: BAJA - datos disponibles

37. **Ganar Ambas Partes** (`'Win Both Halves'`)
    - **Datos necesarios**: Resultado de cada parte
    - **Complejidad**: BAJA - datos disponibles

38. **Ganar Remontando** (`'To Win From Behind'`)
    - **Datos necesarios**: Eventos de goles ordenados por tiempo
    - **Complejidad**: ALTA - requiere API de eventos

39. **Ganar sin Encajar** (`'To Win To Nil'`)
    - **Datos necesarios**: Ya implementado parcialmente
    - **Complejidad**: BAJA - requiere generalización

---

### CATEGORÍA: Par/Impar (3 tipos)

40. **Goles Par/Impar** (`'Odd/Even'`, `'Odd/Even Goals'`)
    - **Datos necesarios**: Total de goles
    - **Complejidad**: BAJA - cálculo simple

41. **Goles Par/Impar Local** (`'Home Odd/Even'`)
    - **Datos necesarios**: Goles del local
    - **Complejidad**: BAJA - dato disponible

42. **Goles Par/Impar Visitante** (`'Away Odd/Even'`)
    - **Datos necesarios**: Goles del visitante
    - **Complejidad**: BAJA - dato disponible

---

### CATEGORÍA: Hándicaps (7 tipos)

43. **Hándicap Asiático** (`'Asian Handicap'`)
    - **Datos necesarios**: Resultado con hándicap aplicado
    - **Complejidad**: MEDIA - lógica de hándicap asiático es compleja

44. **Hándicap Europeo** (`'European Handicap'`)
    - **Datos necesarios**: Resultado con hándicap aplicado
    - **Complejidad**: MEDIA - lógica más simple que asiático

45. **Hándicap** (`'Handicap'`)
    - **Datos necesarios**: Resultado con hándicap aplicado
    - **Complejidad**: MEDIA

46. **Resultado con Hándicap** (`'Handicap Result'`)
    - **Datos necesarios**: Resultado con hándicap aplicado
    - **Complejidad**: MEDIA

47. **Hándicap Alternativo** (`'Alternative Handicap'`)
    - **Datos necesarios**: Resultado con hándicap aplicado
    - **Complejidad**: MEDIA

48. **Hándicap de Goles** (`'Goals Handicap'`)
    - **Datos necesarios**: Resultado con hándicap aplicado
    - **Complejidad**: MEDIA

49. **Hándicap 3 Vías** (`'3-Way Handicap'`)
    - **Datos necesarios**: Resultado con hándicap aplicado (incluye empate)
    - **Complejidad**: MEDIA

---

### CATEGORÍA: Tiempo del Primer Gol (1 tipo)

50. **Tiempo del Primer Gol** (`'Time Of First Goal'`)
    - **Datos necesarios**: Minuto del primer gol
    - **Complejidad**: ALTA - requiere API de eventos

---

### CATEGORÍA: Multigoles (3 tipos)

51. **Multigoles** (`'Multigoals'`)
    - **Datos necesarios**: Verificar si total de goles está en rango
    - **Complejidad**: BAJA - dato disponible

52. **Multigoles Local** (`'Home Multigoals'`)
    - **Datos necesarios**: Verificar si goles del local están en rango
    - **Complejidad**: BAJA - dato disponible

53. **Multigoles Visitante** (`'Away Multigoals'`)
    - **Datos necesarios**: Verificar si goles del visitante están en rango
    - **Complejidad**: BAJA - dato disponible

---

### CATEGORÍA: Otros (2 tipos)

54. **Clasificación** (`'To Qualify'`)
    - **Datos necesarios**: Resultado de eliminatorias (ida + vuelta)
    - **Complejidad**: ALTA - requiere múltiples partidos

55. **Portería a Cero (genérico)** (`'Clean Sheet'`)
    - **Datos necesarios**: Ya parcialmente implementado
    - **Complejidad**: BAJA - requiere generalización

---

## RESUMEN DE COMPLEJIDADES

### ✅ BAJA COMPLEJIDAD (Datos ya disponibles - 32 tipos)
Estos tipos pueden implementarse fácilmente con los datos actuales de la API:

1. Total Goles Local
2. Total Goles Visitante
3. Ganador Primera Parte
4. Ganador Segunda Parte
5. Resultado al Descanso
6. Resultado Exacto
7. Parte con Más Goles
8. Segunda Parte con Más Goles
9. Primera Parte con Más Goles
10. Gol en Ambas Partes
11. Corners del Local
12. Corners del Visitante
13. Tarjetas del Local
14. Tarjetas del Visitante
15. Doble Oportunidad
16. Resultado y Ambos Marcan
17. Resultado y Total de Goles
18. Ambos Marcan y Total
19. Local Marca un Gol
20. Visitante Marca un Gol
21. Ganar Alguna Parte
22. Ganar Ambas Partes
23. Ganar sin Encajar (generalizar)
24. Goles Par/Impar
25. Goles Par/Impar Local
26. Goles Par/Impar Visitante
27. Multigoles
28. Multigoles Local
29. Multigoles Visitante
30. Portería a Cero (generalizar)
31. Marcar en Ambas Partes
32. Resultado Descanso/Final

---

### ⚠️ MEDIA COMPLEJIDAD (Lógica adicional necesaria - 7 tipos)
Requieren lógica específica pero no datos adicionales:

1. Hándicap Asiático
2. Hándicap Europeo
3. Hándicap
4. Resultado con Hándicap
5. Hándicap Alternativo
6. Hándicap de Goles
7. Hándicap 3 Vías

---

### 🔴 ALTA COMPLEJIDAD (Requieren datos adicionales de la API - 13 tipos)
Necesitan endpoints adicionales de eventos/jugadores:

1. Primer Equipo en Marcar
2. Último Equipo en Marcar
3. Marcará en Cualquier Momento
4. Primer Goleador
5. Último Goleador
6. Corners Primera Parte
7. Corners Segunda Parte
8. Tarjetas de Jugadores
9. Resultado 10 Minutos
10. Resultado 15 Minutos
11. Ganar Remontando
12. Tiempo del Primer Gol
13. Marcar Primero

---

## RECOMENDACIONES DE IMPLEMENTACIÓN

### PRIORIDAD ALTA (Implementar primero - 20 tipos)
Tipos con mayor uso y menor complejidad:

1. ✅ Total Goles Local
2. ✅ Total Goles Visitante
3. ✅ Doble Oportunidad
4. ✅ Goles Par/Impar (todas las variantes)
5. ✅ Ganador Primera Parte
6. ✅ Ganador Segunda Parte
7. ✅ Resultado al Descanso
8. ✅ Parte con Más Goles
9. ✅ Local Marca un Gol
10. ✅ Visitante Marca un Gol
11. ✅ Corners del Local
12. ✅ Corners del Visitante
13. ✅ Tarjetas del Local
14. ✅ Tarjetas del Visitante
15. ✅ Ganar Alguna Parte
16. ✅ Ganar Ambas Partes
17. ✅ Gol en Ambas Partes
18. ✅ Resultado Exacto
19. ✅ Multigoles (todas las variantes)
20. ✅ Resultado y Ambos Marcan

### PRIORIDAD MEDIA (Implementar después - 12 tipos)
Tipos útiles pero con lógica más compleja:

1. Resultado Descanso/Final
2. Resultado y Total de Goles
3. Ambos Marcan y Total
4. Marcar en Ambas Partes (específico de equipo)
5. Hándicap Europeo
6. Hándicap 3 Vías
7. Hándicap Asiático
8. Hándicap de Goles

### PRIORIDAD BAJA (Implementar al final - 13 tipos)
Tipos que requieren datos adicionales de la API:

1. Primer Equipo en Marcar
2. Último Equipo en Marcar
3. Goleadores (todos)
4. Corners por tiempo
5. Tiempo del Primer Gol
6. Resultados por minutos
7. Ganar Remontando

---

## NOTAS FINALES

- **Variables disponibles actualmente**:
  - `stats.homeGoals`, `stats.awayGoals`
  - `stats.homeGoalsHalftime`, `stats.awayGoalsHalftime`
  - `stats.homeCorners`, `stats.awayCorners`
  - `stats.homeYellowCards`, `stats.awayYellowCards`
  - `stats.homeRedCards`, `stats.awayRedCards`
  - `stats.homeShotsOnGoal`, `stats.awayShotsOnGoal`
  - `stats.homePossession`, `stats.awayPossession`

- **Endpoints API-Football necesarios para completar**:
  - `/fixtures/events` - Para eventos minuto a minuto (goles, tarjetas)
  - `/fixtures/players` - Para estadísticas de jugadores (goleadores)
  - `/fixtures/lineups` - Para información de alineaciones

- **Estimación de cobertura tras implementar PRIORIDAD ALTA**: ~55% de tipos cubiertos
- **Estimación de cobertura tras implementar PRIORIDAD MEDIA**: ~67% de tipos cubiertos
- **Cobertura total posible con datos actuales**: ~67% (66 de 98 tipos)
