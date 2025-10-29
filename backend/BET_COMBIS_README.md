# Sistema de Apuestas Combinadas (Combis)

## Descripción
Sistema que permite a los usuarios crear apuestas combinadas, donde se seleccionan múltiples apuestas individuales y sus cuotas se multiplican para obtener un pago potencial mayor. Todas las selecciones deben ganar para que la combi sea ganadora.

## Características Principales

### Límites y Restricciones
- **Mínimo de selecciones**: 2 apuestas
- **Máximo de apuesta**: 50.000.000 (50M)
- **Cálculo de cuota total**: Multiplicación de todas las cuotas individuales
- **Condición de victoria**: TODAS las selecciones deben ganar

### Fórmulas
```
totalOdd = odd1 × odd2 × odd3 × ... × oddN
potentialWin = amount × totalOdd
```

## Estructura de Base de Datos

### Tabla `bet_combi`
```sql
CREATE TABLE bet_combi (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  jornada INTEGER NOT NULL,
  total_odd DOUBLE PRECISION NOT NULL,
  amount INTEGER NOT NULL,
  potential_win INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (league_id) REFERENCES League(id),
  FOREIGN KEY (user_id) REFERENCES User(id)
);
```

### Relación con `bet`
- Tabla `bet` tiene campo `combiId` (nullable)
- Si `combiId` está presente, la apuesta es parte de una combi
- Las apuestas individuales dentro de una combi no afectan el bettingBudget individualmente

## Endpoints de API

### 1. Crear Combi
```
POST /bet-combis/:leagueId
Authorization: Bearer <token>

Body:
{
  "jornada": 10,
  "selections": [
    {
      "matchId": 123,
      "betType": "resultado",
      "betLabel": "Victoria Local",
      "odd": 2.5,
      "homeTeam": "Real Madrid",
      "awayTeam": "Barcelona",
      "apiBetId": 1,
      "apiEndpoint": "/matches/123/odds",
      "apiOperator": "home_win",
      "apiStatKey": "winner",
      "apiValue": "home"
    },
    {
      "matchId": 124,
      "betType": "goles",
      "betLabel": "Más de 2.5 goles",
      "odd": 1.8,
      "homeTeam": "Sevilla",
      "awayTeam": "Valencia",
      "apiBetId": 2,
      "apiEndpoint": "/matches/124/odds",
      "apiOperator": "over_2.5",
      "apiStatKey": "total_goals",
      "apiValue": "over_2.5"
    }
  ],
  "amount": 10000000
}

Response 201:
{
  "id": "ckl123...",
  "leagueId": "league123",
  "userId": "user456",
  "jornada": 10,
  "totalOdd": 4.5,  // 2.5 × 1.8
  "amount": 10000000,
  "potentialWin": 45000000,  // 10M × 4.5
  "status": "pending",
  "selections": [...]
}
```

### 2. Obtener Combis del Usuario
```
GET /bet-combis/:leagueId?jornada=10
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "ckl123...",
    "jornada": 10,
    "totalOdd": 4.5,
    "amount": 10000000,
    "potentialWin": 45000000,
    "status": "pending",
    "selections": [...]
  }
]
```

### 3. Evaluar Combi Específica
```
POST /bet-combis/evaluate/:combiId
Authorization: Bearer <token>

Response 200:
{
  "id": "ckl123...",
  "status": "won",  // "won" | "lost" | "pending"
  "potentialWin": 45000000
}
```

### 4. Evaluar Combis de una Jornada
```
POST /bet-combis/evaluate-jornada
Authorization: Bearer <token>

Body:
{
  "leagueId": "league123",
  "jornada": 10
}

Response 200:
{
  "evaluated": 5,
  "won": 2,
  "lost": 3
}
```

## Lógica de Evaluación

### Estados de Combi
1. **pending**: Al menos una apuesta sin resolver
2. **won**: TODAS las apuestas ganadas → se acredita `potentialWin`
3. **lost**: AL MENOS UNA apuesta perdida → combi pierde

### Proceso de Evaluación
```typescript
1. Obtener todas las apuestas de la combi
2. Si alguna está "pending" → Combi sigue "pending"
3. Si alguna está "lost" → Combi pasa a "lost"
4. Si TODAS están "won" → Combi pasa a "won" y se acredita dinero
```

### Acreditación de Ganancias
```typescript
// Cuando combi pasa a "won"
await prisma.leagueMember.update({
  where: { id: membershipId },
  data: {
    bettingBudget: {
      increment: combi.potentialWin
    }
  }
});
```

## Validaciones

### En Creación
- ✅ Mínimo 2 selecciones
- ✅ Máximo 50M de apuesta
- ✅ Usuario tiene suficiente bettingBudget
- ✅ Todas las apuestas son de la misma jornada
- ✅ No hay apuestas duplicadas (mismo match + betType)

### En Evaluación
- ✅ Combi existe
- ✅ Combi está en estado "pending"
- ✅ Todas las apuestas individuales están evaluadas

## Integración con Sistema Existente

### 1. Scripts de Evaluación
Agregar llamada en el script de evaluación de jornada:
```typescript
// En scripts/evaluate-jornada.ts
import { BetCombiService } from '../services/betCombi.service';

// Después de evaluar apuestas individuales
await BetCombiService.evaluateJornadaCombis(leagueId, jornada);
```

### 2. Cron Job
Si hay automatización, agregar evaluación de combis:
```typescript
// Después de evaluar apuestas normales
cron.schedule('0 * * * *', async () => {
  const activeLeagues = await getActiveLeagues();
  for (const league of activeLeagues) {
    await evaluateBets(league.id, league.currentJornada);
    await BetCombiService.evaluateJornadaCombis(league.id, league.currentJornada);
  }
});
```

## Frontend - Tareas Pendientes

### 1. Pantalla de Creación de Combis
```tsx
// components/CombiBuilder.tsx
- Lista de bet options disponibles
- Selección múltiple con checkboxes
- Cálculo en tiempo real de:
  * Cuota total (multiplicada)
  * Ganancia potencial
  * Validación de 50M máximo
- Botón "Crear Combi"
```

### 2. Historial de Combis
```tsx
// pages/HistorialCombis.tsx
- Lista de combis del usuario
- Filtro por jornada
- Estado visual (pending/won/lost)
- Detalle expandible con todas las selecciones
- Mostrar cuota total y ganancia potencial
```

### 3. Widget de Combi en Progreso
```tsx
// components/CombiStatus.tsx
- Badge con número de combis pending
- Resumen rápido de combis activas
- Link a historial completo
```

## Ejemplos de Uso

### Ejemplo 1: Combi Simple (2 apuestas)
```
Apuesta 1: Real Madrid gana (2.0)
Apuesta 2: Barcelona gana (1.5)
Monto: 10M

Cuota total: 2.0 × 1.5 = 3.0
Ganancia potencial: 10M × 3.0 = 30M

Si AMBAS ganan → +30M
Si UNA pierde → -10M
```

### Ejemplo 2: Combi Triple (3 apuestas)
```
Apuesta 1: Sevilla empata (3.0)
Apuesta 2: Más de 2.5 goles en Atlético vs Valencia (1.8)
Apuesta 3: Betis gana (2.2)
Monto: 20M

Cuota total: 3.0 × 1.8 × 2.2 = 11.88
Ganancia potencial: 20M × 11.88 = 237.6M

Si LAS 3 ganan → +237.6M
Si 1 o más pierden → -20M
```

## Testing

### Test Cases
1. ✅ Crear combi con 2 selecciones válidas
2. ✅ Rechazar combi con 1 selección
3. ✅ Rechazar combi con más de 50M
4. ✅ Verificar deducción de bettingBudget
5. ✅ Evaluar combi con todas ganadas
6. ✅ Evaluar combi con una perdida
7. ✅ Evaluar combi con apuestas pending
8. ✅ Verificar acreditación de ganancias

## Notas Técnicas

### Transacciones
Todo el proceso de creación y evaluación usa transacciones de Prisma para garantizar consistencia:
```typescript
await prisma.$transaction(async (tx: any) => {
  // Crear combi
  // Crear apuestas individuales
  // Actualizar bettingBudget
});
```

### Workarounds
Debido al cache de Prisma client, hay `as any` en algunas operaciones:
```typescript
const combi = await (prisma as any).betCombi.create({...});
```

Esto se resolverá cuando Prisma regenere el cliente completamente.

## Estado Actual
- ✅ Base de datos: Tablas creadas
- ✅ Backend: Service completo
- ✅ Backend: Controller con Fastify
- ✅ Backend: Rutas registradas en app.ts
- ⏳ Frontend: Por implementar
- ⏳ Integración: Agregar a scripts de evaluación
