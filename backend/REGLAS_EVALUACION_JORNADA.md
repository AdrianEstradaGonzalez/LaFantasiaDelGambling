# Reglas de Evaluación de Jornada

## 📋 Proceso Completo al Ejecutar Cambio de Jornada

Cuando se ejecuta el cambio de jornada (reset), se realizan las siguientes acciones **automáticamente**:

### 1️⃣ Evaluación de Apuestas
- Se evalúan todas las apuestas de la jornada especificada
- Cada apuesta se marca como `won` (ganada) o `lost` (perdida)
- Se calcula el profit:
  - **Ganada**: `+amount × odd` (ej: apuesta 50M a cuota 2.0 = +100M)
  - **Perdida**: `-amount` (ej: apuesta 50M = -50M)

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
Nuevo Budget = Budget Actual + Profit Apuestas + Puntos Plantilla
```

Donde:
- **Budget Actual**: El dinero que tenía antes del cambio
- **Profit Apuestas**: Ganancia o pérdida de sus apuestas (+/-)
- **Puntos Plantilla**: 1 millón por cada punto obtenido

Ejemplo:
```
Budget anterior: 500M
Apuestas: +100M (ganó apuestas)
Plantilla: 25 puntos = +25M
Nuevo budget: 500 + 100 + 25 = 625M
```

### 4️⃣ Actualización de Puntos Totales
```
Puntos Totales = Puntos Anteriores + Puntos de esta Jornada
```

Estos puntos determinan la clasificación en la liga.

### 5️⃣ Reset de Presupuesto de Apuestas
- El `bettingBudget` se reinicia a **250M** para todos los usuarios
- Esto es independiente del budget principal

### 6️⃣ Vaciado de Plantillas
- **TODAS las plantillas de la liga se vacían** (incluye usuarios que no apostaron)
- Esto obliga a todos los usuarios a crear una nueva plantilla para la siguiente jornada
- Los usuarios recuperan el dinero de los jugadores vendidos

### 7️⃣ Limpieza de Apuestas
- Todas las apuestas evaluadas (won/lost) se eliminan de la base de datos
- Esto mantiene la base de datos limpia y evita confusiones

---

## 🎯 Reglas Importantes

### ✅ Regla de 11 Jugadores
- **Si un usuario NO tiene 11 jugadores en su plantilla al momento de evaluar la jornada, recibirá 0 puntos**
- No importa si tiene 10 jugadores con 100 puntos cada uno, si no son 11, es 0
- Esto incentiva a los usuarios a tener plantillas completas

### 💰 Sistema de Budget
- **Budget principal**: Para fichar jugadores
  - Aumenta: +1M por cada punto de plantilla + profit de apuestas
  - Disminuye: Al comprar jugadores
  
- **Betting budget**: Para hacer apuestas
  - Siempre se resetea a 250M cada jornada
  - Es independiente del budget principal

### 🔄 Ciclo de Jornada
1. Usuarios crean plantilla y hacen apuestas
2. Jornada se juega en la vida real
3. Admin ejecuta "Cambio de Jornada"
4. Sistema evalúa todo automáticamente
5. Plantillas se vacían
6. Usuarios crean nueva plantilla para siguiente jornada

---

## 📊 Logs del Sistema

Cuando se ejecuta el cambio de jornada, verás logs como:

```
🔄 Iniciando cambio de jornada 7 para liga abc123...

📊 Evaluando 15 apuestas de la jornada 7...
  ✅ Apuesta 1: Local gana - Athletic vs Mallorca (50M × 2.0) = +100M
  ❌ Apuesta 2: Empate - Real Madrid vs Barcelona (30M × 3.5) = -30M

✅ 15 apuestas evaluadas

💰 Balances de apuestas calculados para 5 usuarios

  ⚽ Usuario user1: 25 puntos de plantilla
  ❌ Usuario user2: Solo 9/11 jugadores - 0 puntos
  ⚽ Usuario user3: 18 puntos de plantilla

✅ Puntos de plantilla calculados

  👤 Usuario user1:
     Budget anterior: 500M
     Apuestas: 2W/1L = +140M
     Plantilla: 25 puntos = +25M
     Nuevo presupuesto: 665M
     Puntos totales: 50 + 25 = 75

✨ Cambio de jornada completado: 5 miembros actualizados

🗑️  Vaciando todas las plantillas de la liga abc123...
  🗑️  Usuario user1: 11 jugadores eliminados de plantilla
  🗑️  Usuario user2: 9 jugadores eliminados de plantilla

✅ 5 plantillas vaciadas en total

🗑️  15 apuestas evaluadas eliminadas
```

---

## 🔧 Uso en el Admin Panel

1. Navega al Admin Panel en la app
2. Ingresa el número de jornada a evaluar (ej: 7)
3. Presiona "Ejecutar Cambio de Jornada"
4. El sistema procesará automáticamente:
   - Evaluar apuestas jornada 7
   - Calcular puntos plantilla jornada 7
   - Actualizar budgets y puntos
   - Vaciar todas las plantillas
   - Limpiar apuestas evaluadas

---

## ⚠️ Notas Importantes

- **No se puede deshacer**: Una vez ejecutado el cambio, no hay vuelta atrás
- **Orden de jornadas**: Asegúrate de ejecutar las jornadas en orden (7, 8, 9...)
- **Verificación**: Antes de ejecutar, verifica que la jornada esté completada en la vida real
- **Todas las ligas**: El cambio afecta a TODAS las ligas del sistema simultáneamente
