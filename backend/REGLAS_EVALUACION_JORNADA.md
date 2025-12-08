# Reglas de Evaluación de Jornada

## 📋 Proceso Completo al Ejecutar Cambio de Jornada

Cuando se ejecuta el cambio de jornada (reset), se realizan las siguientes acciones **automáticamente**:

### 1️⃣ Evaluación de Dream Game
- Se evalúan todos los picks de la jornada especificada
- Cada pick se marca como `won` (acertado) o `lost` (fallado)
- **Sistema de Recompensas**:
  - **Pick acertado**: +80M al presupuesto inicial de la siguiente jornada
  - **Pick fallado**: Sin penalización monetaria
- **Sistema de Tickets Bonus**:
  - Por cada 2 picks acertados: +1 ticket adicional para la siguiente jornada (acumulativo)
  - Los tickets bonus se suman a los 5 tickets base
  - Máximo de tickets: 10 (5 base + 5 bonus máximo)

### 2️⃣ Cálculo de Puntos de Plantilla
- Para cada usuario de la liga, se calculan los puntos de su plantilla
- **REGLA IMPORTANTE**: Si el usuario NO tiene 11 jugadores en su plantilla, recibe **0 puntos**
- Si tiene 11+ jugadores:
  - Se obtienen las estadísticas de cada jugador en la jornada desde API-FOOTBALL
  - Se calculan puntos según el sistema DreamLeague
  - Se suman todos los puntos de los jugadores

### 3️⃣ Actualización de Presupuestos
Para cada usuario:
```
Nuevo Budget = 500M (base) + Recompensa Picks + Puntos Plantilla
```

Donde:
- **500M base**: Presupuesto inicial fijo cada jornada
- **Recompensa Picks**: 80M por cada pick acertado (ej: 3 picks acertados = +240M)
- **Puntos Plantilla**: 1 millón por cada punto obtenido

Ejemplo:
```
Budget base: 500M
Picks: 3 acertados × 80M = +240M
Plantilla: 25 puntos = +25M
Nuevo budget: 500 + 240 + 25 = 765M
```

### 4️⃣ Actualización de Puntos Totales
```
Puntos Totales = Puntos Anteriores + Puntos de esta Jornada
```

Estos puntos determinan la clasificación en la liga.

### 5️⃣ Reset de Tickets para Dream Picks
- Los `availableTickets` se calculan para la nueva jornada:
  - **Base**: 5 tickets siempre
  - **Bonus**: +1 ticket por cada 2 picks acertados en la jornada anterior
  - **Máximo**: 10 tickets totales
- Ejemplo: 4 picks acertados = 5 base + 2 bonus = 7 tickets disponibles

### 6️⃣ Vaciado de Plantillas
- **TODAS las plantillas de la liga se vacían** (incluye usuarios que no apostaron)
- Esto obliga a todos los usuarios a crear una nueva plantilla para la siguiente jornada
- Los usuarios recuperan el dinero de los jugadores vendidos

### 7️⃣ Limpieza de Picks
- Todos los picks evaluados (won/lost) se eliminan de la base de datos
- Esto mantiene la base de datos limpia y evita confusiones

---

## 🎯 Reglas Importantes

### ✅ Regla de 11 Jugadores
- **Si un usuario NO tiene 11 jugadores en su plantilla al momento de evaluar la jornada, recibirá 0 puntos**
- No importa si tiene 10 jugadores con 100 puntos cada uno, si no son 11, es 0
- Esto incentiva a los usuarios a tener plantillas completas

### 💰 Sistema de Budget
- **Budget principal**: Para fichar jugadores
  - Base cada jornada: 500M
  - Aumenta: +1M por cada punto de plantilla + 80M por pick acertado
  - Disminuye: Al comprar jugadores
  
### 🎟️ Sistema de Tickets (Dream Picks)
- **Tickets disponibles**: Para hacer picks en partidos
  - Base cada jornada: 5 tickets
  - Bonus: +1 ticket por cada 2 picks acertados (máximo 10 tickets totales)
  - Cada pick (simple o combi) consume 1 ticket
  - Cada pick apuesta automáticamente 50M
  - **Ganancia potencial**: (50M × cuota) - 50M
  - Ejemplo: Pick con cuota 2.5 → Ganancia neta de 75M si acierta

### 🔄 Ciclo de Jornada
1. Usuarios reciben 5 tickets base (+ bonus si los ganaron)
2. Usuarios crean plantilla y hacen picks (1 ticket por pick)
3. Jornada se juega en la vida real
4. Admin ejecuta "Cambio de Jornada"
5. Sistema evalúa picks y plantillas automáticamente
6. Se calculan tickets bonus para siguiente jornada (+1 por cada 2 aciertos)
7. Plantillas se vacían
8. Usuarios reciben nuevo presupuesto (500M + recompensas)
9. Usuarios crean nueva plantilla para siguiente jornada

---

## 📊 Logs del Sistema

Cuando se ejecuta el cambio de jornada, verás logs como:

```
🔄 Iniciando cambio de jornada 7 para liga abc123...

📊 Evaluando 15 picks de la jornada 7...
  ✅ Pick 1: Local gana - Athletic vs Mallorca ✓ Acertado
  ❌ Pick 2: Empate - Real Madrid vs Barcelona ✗ Fallado

✅ 15 picks evaluados

💰 Resultados de picks calculados para 5 usuarios

  ⚽ Usuario user1: 25 puntos de plantilla
  ❌ Usuario user2: Solo 9/11 jugadores - 0 puntos
  ⚽ Usuario user3: 18 puntos de plantilla

✅ Puntos de plantilla calculados

  👤 Usuario user1:
     Picks acertados: 4 de 5
     Recompensa picks: 4 × 80M = +320M
     Plantilla: 25 puntos = +25M
     Nuevo presupuesto: 500M (base) + 320M + 25M = 845M
     Tickets próxima jornada: 5 base + 2 bonus = 7 tickets
     Puntos totales: 50 + 25 = 75

✨ Cambio de jornada completado: 5 miembros actualizados

🗑️  Vaciando todas las plantillas de la liga abc123...
  🗑️  Usuario user1: 11 jugadores eliminados de plantilla
  🗑️  Usuario user2: 9 jugadores eliminados de plantilla

✅ 5 plantillas vaciadas en total

🗑️  15 picks evaluados eliminados
```

---

## 🔧 Uso en el Admin Panel

1. Navega al Admin Panel en la app
2. Ingresa el número de jornada a evaluar (ej: 7)
3. Presiona "Ejecutar Cambio de Jornada"
4. El sistema procesará automáticamente:
   - Evaluar picks jornada 7
   - Calcular puntos plantilla jornada 7
   - Calcular tickets bonus para siguiente jornada
   - Actualizar budgets y puntos
   - Vaciar todas las plantillas
   - Limpiar picks evaluados

---

## ⚠️ Notas Importantes

- **No se puede deshacer**: Una vez ejecutado el cambio, no hay vuelta atrás
- **Orden de jornadas**: Asegúrate de ejecutar las jornadas en orden (7, 8, 9...)
- **Verificación**: Antes de ejecutar, verifica que la jornada esté completada en la vida real
- **Todas las ligas**: El cambio afecta a TODAS las ligas del sistema simultáneamente
