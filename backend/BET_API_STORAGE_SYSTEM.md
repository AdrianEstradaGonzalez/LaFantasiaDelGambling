# Sistema de Almacenamiento y Evaluación de Apuestas

## 📋 **Resumen**

Este sistema guarda información completa sobre las apuestas para poder evaluarlas posteriormente consultando la API-Football. Cada apuesta almacena los datos necesarios para identificar qué estadística consultar y cómo evaluarla.

---

## 🗄️ **Modelo de Base de Datos**

### **Tabla `Bet` - Campos Agregados**

```prisma
model Bet {
  // ... campos existentes ...
  matchId      Int          // Fixture ID de la API
  homeTeam     String       // Equipo local
  awayTeam     String       // Equipo visitante
  
  // Configuración para evaluación con API-Football
  apiBetId     Int?         // ID del tipo de apuesta en API-Football
  apiEndpoint  String?      // "fixtures", "statistics", "odds"
  apiStatKey   String?      // Clave de estadística a consultar
  apiOperator  String?      // Operador de comparación
  apiValue     String?      // Valor a comparar
  
  status       String       // "pending", "won", "lost"
  evaluatedAt  DateTime?    // Cuándo se evaluó
}
```

---

## 🔧 **Cómo Funciona**

### **1. Al Crear una Apuesta**

El frontend envía:
```typescript
{
  matchId: 123456,
  homeTeam: "Real Madrid",
  awayTeam: "Barcelona",
  betType: "Goles totales",
  betLabel: "Se marcarán más de 2.5 goles",
  odd: 1.8,
  amount: 10
}
```

El backend **automáticamente mapea** a configuración de API:
```typescript
{
  apiBetId: 5,                    // Goals Over/Under
  apiEndpoint: "fixtures",         // Consultar /fixtures
  apiStatKey: "goals.total",       // Campo a leer
  apiOperator: "greater_than",     // Comparación
  apiValue: "2.5"                  // Threshold
}
```

### **2. Para Evaluar la Apuesta** (posteriormente)

1. Consultar API-Football con `matchId`
2. Ir al endpoint especificado en `apiEndpoint`
3. Leer el valor de `apiStatKey`
4. Aplicar `apiOperator` comparando con `apiValue`
5. Actualizar `status` a "won" o "lost"
6. Guardar timestamp en `evaluatedAt`

---

## 📊 **Tipos de Apuestas Soportados**

### ✅ **Resultado (Match Winner)**
- **API Bet ID**: 1
- **Endpoint**: `fixtures`
- **Ejemplos**:
  - "Ganará Real Madrid" → `teams.home.winner = true`
  - "Empate" → `teams.home.winner = null`

### ✅ **Goles Totales (Goals Over/Under)**
- **API Bet ID**: 5
- **Endpoint**: `fixtures`
- **Ejemplos**:
  - "Más de 2.5 goles" → `goals.total > 2.5`
  - "Menos de 1.5 goles" → `goals.total < 1.5`

### ✅ **Goles Exactos (Exact Goals)**
- **API Bet ID**: 29
- **Endpoint**: `fixtures`
- **Ejemplo**: "Exactamente 3 goles" → `goals.total = 3`

### ✅ **Ambos Equipos Marcan (Both Teams Score)**
- **API Bet ID**: 8
- **Endpoint**: `fixtures`
- **Ejemplos**:
  - "Sí" → `score.fulltime.home > 0 AND score.fulltime.away > 0`
  - "No" → `score.fulltime.home = 0 OR score.fulltime.away = 0`

### ✅ **Doble Oportunidad (Double Chance)**
- **API Bet ID**: 12
- **Endpoint**: `fixtures`
- **Ejemplos**:
  - "Local o Empate" → `teams.away.winner != true`
  - "Local o Visitante" → `teams.home.winner = true OR teams.away.winner = true`

### ✅ **Córners (Corners)**
- **API Bet ID**: 61 (Over/Under), 65 (Exact)
- **Endpoint**: `statistics`
- **Ejemplos**:
  - "Más de 9.5 córners" → `Corner Kicks.total > 9.5`
  - "Exactamente 10 córners" → `Corner Kicks.total = 10`
  - "Córners impares" → `Corner Kicks.total % 2 = 1`

### ✅ **Tarjetas (Cards)**
- **API Bet ID**: 52 (Over/Under), 81 (Exact)
- **Endpoint**: `statistics`
- **Ejemplos**:
  - "Más de 4.5 tarjetas" → `Yellow Cards.total + Red Cards.total > 4.5`
  - "Exactamente 5 tarjetas" → `Yellow Cards.total + Red Cards.total = 5`

### ✅ **Par/Impar Goles (Odd/Even)**
- **API Bet ID**: 10
- **Endpoint**: `fixtures`
- **Ejemplos**:
  - "Goles impares" → `goals.total % 2 = 1`
  - "Goles pares" → `goals.total % 2 = 0`

### ✅ **Portería a Cero (Clean Sheet)**
- **API Bet ID**: 26 (Home), 27 (Away)
- **Endpoint**: `fixtures`
- **Ejemplos**:
  - "Real Madrid no recibirá goles" → `goals.away = 0`
  - "Barcelona recibirá al menos un gol" → `goals.home > 0`

### ✅ **Primera/Segunda Parte (Half Goals)**
- **API Bet ID**: 37 (First Half), 38 (Second Half)
- **Endpoint**: `fixtures`
- **Ejemplos**:
  - "Primera parte más de 0.5 goles" → `score.halftime.home + score.halftime.away > 0.5`
  - "Segunda parte menos de 1.5 goles" → `(fulltime - halftime) < 1.5`

### ✅ **Fueras de Juego (Offsides)**
- **API Bet ID**: 126
- **Endpoint**: `statistics`
- **Ejemplo**: "Más de 3.5 fueras de juego" → `Offsides.total > 3.5`

### ✅ **Tiros a Puerta (Shots on Goal)**
- **API Bet ID**: 207
- **Endpoint**: `statistics`
- **Ejemplo**: "Más de 6.5 tiros a puerta" → `Shots on Goal.total > 6.5`

---

## 🔍 **Operadores de Comparación**

| Operador | Descripción | Uso en API |
|----------|-------------|-----------|
| `greater_than` | Mayor que | `value > threshold` |
| `less_than` | Menor que | `value < threshold` |
| `equals` | Igual a | `value === target` |
| `not_equals` | Diferente de | `value !== target` |
| `odd` | Número impar | `value % 2 === 1` |
| `even` | Número par | `value % 2 === 0` |
| `both_greater_zero` | Ambos > 0 | `val1 > 0 AND val2 > 0` |
| `at_least_one_zero` | Al menos uno = 0 | `val1 === 0 OR val2 === 0` |
| `at_least_one_true` | Al menos uno true | `val1 OR val2` |
| `sum_greater_than` | Suma > threshold | `val1 + val2 > threshold` |
| `sum_less_than` | Suma < threshold | `val1 + val2 < threshold` |
| `sum_equals` | Suma = target | `val1 + val2 === target` |
| `sum_odd` | Suma impar | `(val1 + val2) % 2 === 1` |
| `sum_even` | Suma par | `(val1 + val2) % 2 === 0` |
| `second_half_greater_than` | 2ª parte > threshold | `(ft - ht) > threshold` |
| `second_half_less_than` | 2ª parte < threshold | `(ft - ht) < threshold` |

---

## 🚀 **Ejemplos de Consultas a API-Football**

### **Ejemplo 1: Goles Totales**
```json
{
  "apiBetId": 5,
  "apiEndpoint": "fixtures",
  "apiStatKey": "goals.total",
  "apiOperator": "greater_than",
  "apiValue": "2.5"
}
```

**Consulta API**:
```
GET /fixtures?id=123456
Response: { goals: { home: 2, away: 1, total: 3 } }
Evaluación: 3 > 2.5 → WON ✅
```

### **Ejemplo 2: Córners**
```json
{
  "apiBetId": 61,
  "apiEndpoint": "statistics",
  "apiStatKey": "Corner Kicks.total",
  "apiOperator": "less_than",
  "apiValue": "10.5"
}
```

**Consulta API**:
```
GET /fixtures/statistics?fixture=123456
Response: { statistics: [{ type: "Corner Kicks", value: 12 }] }
Evaluación: 12 < 10.5 → LOST ❌
```

### **Ejemplo 3: Tarjetas**
```json
{
  "apiBetId": 52,
  "apiEndpoint": "statistics",
  "apiStatKey": "Yellow Cards.total,Red Cards.total",
  "apiOperator": "sum_greater_than",
  "apiValue": "4.5"
}
```

**Consulta API**:
```
GET /fixtures/statistics?fixture=123456
Response: { 
  statistics: [
    { type: "Yellow Cards", value: 4 },
    { type: "Red Cards", value: 1 }
  ] 
}
Evaluación: (4 + 1) > 4.5 → WON ✅
```

---

## 🔄 **Migración de Base de Datos**

Para aplicar los cambios:

```bash
cd backend
npx prisma migrate dev --name add_api_bet_evaluation
npx prisma generate
```

---

## ✅ **Ventajas del Sistema**

1. **Automático**: El mapeo se hace en el backend sin intervención manual
2. **Auditabilidad**: Cada apuesta tiene toda la info para ser evaluada
3. **Escalable**: Soporta múltiples tipos de apuestas fácilmente
4. **Extensible**: Agregar nuevos tipos es muy simple
5. **Confiable**: Usa datos oficiales de API-Football
6. **Trazable**: Se guarda cuándo se evaluó cada apuesta

---

## 📝 **Agregar Nuevos Tipos de Apuestas**

Edita `backend/src/utils/apiBetMapping.ts`:

```typescript
// Ejemplo: Total Faltas
if (typeNorm.includes('faltas')) {
  const match = betLabel.match(/(\d+\.?\d*)/);
  if (match) {
    const threshold = match[1];
    if (labelNorm.includes('más de')) {
      return {
        apiBetId: null,  // No hay ID específico en API
        apiEndpoint: 'statistics',
        apiStatKey: 'Fouls.total',
        apiOperator: 'greater_than',
        apiValue: threshold
      };
    }
  }
}
```

---

## 🔒 **Seguridad**

- El mapeo se hace **solo en el backend**
- El frontend no puede manipular la configuración de evaluación
- Toda la lógica crítica está protegida server-side
