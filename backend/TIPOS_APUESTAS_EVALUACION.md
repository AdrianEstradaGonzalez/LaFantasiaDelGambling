# Sistema de Evaluación de Apuestas - Tipos Soportados

## ✅ Tipos de Apuesta CON Evaluación Implementada (20 tipos)

### 📊 Goles

1. **Más/Menos Goles** - Partido completo
   - `Goals Over/Under`, `Over/Under`, `Más/Menos Goles`
   - Evalúa: Total de goles > o < que un umbral
   - Ejemplo: "Más de 2.5 goles"

2. **Más/Menos Goles Primera Parte**
   - `First Half Goals Over/Under`, `Más/Menos Goles Primera Parte`
   - Evalúa: Goles al descanso > o < que un umbral
   - Usa: `homeGoalsHalftime + awayGoalsHalftime`

3. **Más/Menos Goles Segunda Parte**
   - `Second Half Goals Over/Under`, `Más/Menos Goles Segunda Parte`
   - Evalúa: Goles de segunda parte > o < que un umbral
   - Usa: `(homeGoals - homeGoalsHalftime) + (awayGoals - awayGoalsHalftime)`

4. **Total Goles Local**
   - `Home Team Total Goals`, `Total Goles Local`
   - Evalúa: Goles del equipo local > o < que un umbral
   - Usa: `homeGoals`

5. **Total Goles Visitante**
   - `Away Team Total Goals`, `Total Goles Visitante`
   - Evalúa: Goles del equipo visitante > o < que un umbral
   - Usa: `awayGoals`

6. **Goles Par/Impar**
   - `Odd/Even`, `Goles Par/Impar`
   - Evalúa: Si el total de goles es par o impar
   - Variantes: Total, Local, Visitante

### 🏆 Resultados

7. **Ganador del Partido (1X2)**
   - `Match Winner`, `Winner`, `Resultado Final`
   - Evalúa: Local, Empate o Visitante
   - Usa: Comparación de `homeGoals` vs `awayGoals`

8. **Ganador Primera Parte**
   - `First Half Winner`, `Ganador Primera Parte`, `Resultado al Descanso`
   - Evalúa: Resultado al descanso (1X2)
   - Usa: `homeGoalsHalftime` vs `awayGoalsHalftime`

9. **Ganador Segunda Parte**
   - `Second Half Winner`, `Ganador Segunda Parte`
   - Evalúa: Resultado de segunda parte (1X2)
   - Usa: Goles de segunda parte calculados

10. **Doble Oportunidad**
    - `Double Chance`, `Doble Oportunidad`
    - Evalúa: 1X (Local o Empate), 12 (Local o Visitante), X2 (Empate o Visitante)

11. **Gana Local o Visitante (Sin Empate)**
    - `Home/Away`, `Gana Local o Visitante (Sin Empate)`
    - Evalúa: Si hay empate todas pierden, si no se evalúa normalmente

12. **Gana con Reembolso si Empate**
    - `Draw No Bet`, `Gana con Reembolso si Empate`
    - Evalúa: Si hay empate la apuesta se pierde

### 👥 Ambos Equipos

13. **Ambos Equipos Marcan (BTTS)**
    - `Both Teams Score`, `Both Teams To Score`, `BTTS`, `Ambos Equipos Marcan`
    - Evalúa: Si ambos equipos marcaron al menos 1 gol
    - Usa: `homeGoals > 0 && awayGoals > 0`

### 🥅 Portería a Cero

14. **Portería a Cero - Local**
    - `Clean Sheet - Home`, `Portería a Cero - Local`
    - Evalúa: Si el local no encajó goles
    - Usa: `awayGoals === 0`

15. **Portería a Cero - Visitante**
    - `Clean Sheet - Away`, `Portería a Cero - Visitante`
    - Evalúa: Si el visitante no encajó goles
    - Usa: `homeGoals === 0`

16. **Local Gana sin Encajar**
    - `Home Win To Nil`, `Local Gana sin Encajar`
    - Evalúa: Local gana Y no encaja
    - Usa: `homeGoals > awayGoals && awayGoals === 0`

17. **Visitante Gana sin Encajar**
    - `Away Win To Nil`, `Visitante Gana sin Encajar`
    - Evalúa: Visitante gana Y no encaja
    - Usa: `awayGoals > homeGoals && homeGoals === 0`

### ⚽ Corners

18. **Más/Menos Corners**
    - `Corners Over/Under`, `Más/Menos Corners`
    - Evalúa: Total de corners > o < que un umbral
    - Usa: `homeCorners + awayCorners`

19. **Corners del Local/Visitante**
    - `Home Team Corners`, `Away Team Corners`
    - Evalúa: Corners de un equipo específico
    - Usa: `homeCorners` o `awayCorners`

### 🟨 Tarjetas

20. **Más/Menos Tarjetas**
    - `Cards Over/Under`, `Más/Menos Tarjetas`
    - Evalúa: Total de tarjetas > o < que un umbral
    - Usa: `(homeYellowCards + awayYellowCards) + (homeRedCards + awayRedCards)`

21. **Tarjetas del Local/Visitante**
    - `Home Team Cards`, `Away Team Cards`
    - Evalúa: Tarjetas de un equipo específico
    - Usa: Tarjetas amarillas + rojas del equipo

### 📈 Estadísticas

22. **Tiros a Puerta**
    - `Shots On Goal`, `Tiros a Puerta`
    - Evalúa: Total de tiros > o < que un umbral
    - Usa: `homeShotsOnGoal + awayShotsOnGoal`

23. **Parte con Más Goles**
    - `Highest Scoring Half`, `Parte con Más Goles`
    - Evalúa: Qué parte tuvo más goles
    - Usa: Comparación de goles por parte

---

## ❌ Tipos de Apuesta SIN Evaluación (78 tipos restantes)

### 🔴 Alta Complejidad - Requieren datos adicionales de API

Estos tipos necesitan información que no está en las estadísticas básicas:

- **Goleadores específicos**: First Goalscorer, Last Goalscorer, Anytime Goalscorer
- **Timing de goles**: First Team To Score, Last Team To Score, Time Of First Goal
- **Eventos por minuto**: 10 Minutes Result, 15 Minutes Result
- **Corners por tiempo**: First Half Corners, Second Half Corners
- **Resultado exacto**: Exact Score, Correct Score
- **Combinaciones específicas**: Halftime/Fulltime, Result & Both Teams To Score

### 🟡 Media Complejidad - Requieren lógica especial

Estos tipos son posibles pero requieren implementar lógica de hándicap:

- **Asian Handicap**: Hándicap Asiático con medios goles
- **European Handicap**: Hándicap Europeo
- **3-Way Handicap**: Hándicap 3 Vías
- **Handicap Result**: Resultado con Hándicap

### 🟢 Baja Complejidad - Podrían implementarse

Estos tipos podrían evaluarse con los datos actuales pero son menos comunes:

- **Multigoles**: Home Multigoals, Away Multigoals
- **Score In Both Halves**: Marcar en Ambas Partes
- **Win Either Half**: Ganar Alguna Parte
- **Win Both Halves**: Ganar Ambas Partes
- **To Win From Behind**: Ganar Remontando (requiere eventos)
- **Goal In Both Halves**: Gol en Ambas Partes

---

## 📊 Estadísticas Disponibles

El sistema tiene acceso a las siguientes estadísticas por partido:

```typescript
interface MatchStatistics {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  status: string;
  
  // Goles
  homeGoals: number;
  awayGoals: number;
  homeGoalsHalftime: number;
  awayGoalsHalftime: number;
  
  // Corners
  homeCorners: number;
  awayCorners: number;
  
  // Tarjetas
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  
  // Tiros
  homeShotsOnGoal: number;
  awayShotsOnGoal: number;
  
  // Posesión
  homePossession: number;
  awayPossession: number;
}
```

---

## 🔧 Cómo Añadir Nuevos Tipos

Para añadir evaluación de un nuevo tipo de apuesta:

1. **Identificar el betType** en `betOptionsGenerator.ts`
2. **Añadir bloque de evaluación** en `betEvaluation.service.ts` función `evaluateBet`
3. **Usar los datos disponibles** en `MatchStatistics`
4. **Testear** con el script `npm run reevaluate-bets`

Ejemplo de estructura:

```typescript
if (betType.toLowerCase().includes('tu_tipo')) {
  // 1. Obtener datos necesarios
  const value = stats.someField;
  
  // 2. Interpretar la predicción del label
  const prediction = betLabel.toLowerCase().includes('over') ? 'over' : 'under';
  
  // 3. Calcular resultado real
  const threshold = parseFloat(betLabel.match(/\d+\.?\d*/)?.[0] || '0');
  const won = value > threshold;
  
  // 4. Retornar resultado
  return {
    won,
    actualResult: `Descripción del resultado`
  };
}
```

---

## 📈 Cobertura Actual

- **Tipos implementados**: 23 tipos
- **Tipos sin implementar**: 78 tipos
- **Cobertura**: ~23% de todos los tipos posibles
- **Cobertura de tipos comunes**: ~90% (los 23 tipos más usados en apuestas deportivas)

---

## 🎯 Prioridad de Implementación

### Muy Alta (Comunes)
✅ Todos implementados

### Alta (Menos comunes pero útiles)
- [ ] Multigoles (Multigoals)
- [ ] Marcar en ambas partes (Score In Both Halves)
- [ ] Ganar alguna/ambas partes (Win Either/Both Halves)

### Media (Requieren hándicap)
- [ ] Asian Handicap
- [ ] European Handicap

### Baja (Requieren datos adicionales)
- [ ] Goleadores específicos
- [ ] Resultado exacto
- [ ] Timing de eventos
