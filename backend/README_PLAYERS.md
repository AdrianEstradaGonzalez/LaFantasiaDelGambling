# API de Jugadores - Backend

## 📋 Descripción

Sistema completo de gestión de jugadores de LaLiga con precios aleatorios entre 1M y 250M. Los jugadores se sincronizan desde la API de LaLiga y se almacenan en la base de datos con información detallada.

## 🗄️ Estructura de la Base de Datos

### Tabla `Player`

```prisma
model Player {
  id           Int      @id              // ID del jugador de la API de LaLiga
  name         String                    // Nombre completo
  position     String                    // "Goalkeeper", "Defender", "Midfielder", "Attacker"
  teamId       Int                       // ID del equipo
  teamName     String                    // Nombre del equipo
  teamCrest    String?                   // Logo del equipo
  nationality  String?                   // Nacionalidad
  shirtNumber  Int?                      // Número de camiseta
  photo        String?                   // URL de la foto
  price        Int                       // Precio en millones (1-250)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([teamId])
  @@index([position])
  @@index([price])
  @@map("player")
}
```

## 🎯 Rangos de Precios por Posición

- **Goalkeeper**: 1M - 80M
- **Defender**: 1M - 150M
- **Midfielder**: 5M - 200M
- **Attacker**: 10M - 250M

Los precios se generan aleatoriamente dentro de estos rangos durante la sincronización.

## 🚀 Instalación

```bash
# Instalar dependencias
npm install axios

# Generar migración de Prisma
npx prisma migrate dev --name add_players_table

# Generar cliente de Prisma
npx prisma generate

# Sincronizar jugadores desde la API
npm run sync-players
```

## 📡 Endpoints de la API

### Base URL
```
http://localhost:3000/players
```

### 1. Sincronizar Jugadores

Descarga todos los jugadores de LaLiga desde la API y los guarda con precios aleatorios.

**Endpoint:** `POST /players/sync`

**Response:**
```json
{
  "success": true,
  "message": "Sincronización completada",
  "data": {
    "playersAdded": 400,
    "playersUpdated": 0,
    "errors": 0
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3000/players/sync
```

---

### 2. Obtener Todos los Jugadores

Obtiene la lista completa de jugadores con filtros opcionales.

**Endpoint:** `GET /players`

**Query Parameters:**
- `position` (opcional): Filtrar por posición (Goalkeeper, Defender, Midfielder, Attacker)
- `teamId` (opcional): Filtrar por ID de equipo
- `minPrice` (opcional): Precio mínimo
- `maxPrice` (opcional): Precio máximo
- `search` (opcional): Buscar por nombre

**Ejemplos:**

```bash
# Todos los jugadores
GET http://localhost:3000/players

# Solo atacantes
GET http://localhost:3000/players?position=Attacker

# Jugadores de un equipo específico
GET http://localhost:3000/players?teamId=530

# Jugadores en rango de precio
GET http://localhost:3000/players?minPrice=50&maxPrice=150

# Buscar por nombre
GET http://localhost:3000/players?search=benzema

# Combinar filtros
GET http://localhost:3000/players?position=Midfielder&minPrice=100&maxPrice=200
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 154,
      "name": "Karim Benzema",
      "position": "Attacker",
      "teamId": 530,
      "teamName": "Atlético Madrid",
      "teamCrest": "https://...",
      "nationality": "France",
      "shirtNumber": 9,
      "photo": "https://...",
      "price": 185,
      "createdAt": "2025-10-13T23:42:59.000Z",
      "updatedAt": "2025-10-13T23:42:59.000Z"
    }
  ],
  "count": 1
}
```

---

### 3. Obtener Jugador por ID

Obtiene los detalles de un jugador específico.

**Endpoint:** `GET /players/:id`

**Ejemplo:**
```bash
GET http://localhost:3000/players/154
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 154,
    "name": "Karim Benzema",
    "position": "Attacker",
    "teamId": 530,
    "teamName": "Atlético Madrid",
    "teamCrest": "https://...",
    "nationality": "France",
    "shirtNumber": 9,
    "photo": "https://...",
    "price": 185,
    "createdAt": "2025-10-13T23:42:59.000Z",
    "updatedAt": "2025-10-13T23:42:59.000Z"
  }
}
```

---

### 4. Obtener Estadísticas

Obtiene estadísticas globales de precios.

**Endpoint:** `GET /players/stats`

**Ejemplo:**
```bash
GET http://localhost:3000/players/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "average": 92,
    "min": 1,
    "max": 250,
    "total": 400
  }
}
```

---

### 5. Actualizar Precio de un Jugador

Actualiza el precio de un jugador específico (Admin).

**Endpoint:** `PATCH /players/:id/price`

**Body:**
```json
{
  "price": 120
}
```

**Validación:**
- El precio debe ser un número entero
- Debe estar entre 1 y 250

**Ejemplo:**
```bash
curl -X PATCH http://localhost:3000/players/154/price \
  -H "Content-Type: application/json" \
  -d '{"price": 120}'
```

**Response:**
```json
{
  "success": true,
  "message": "Precio actualizado correctamente",
  "data": {
    "id": 154,
    "name": "Karim Benzema",
    "price": 120,
    "updatedAt": "2025-10-13T23:50:00.000Z"
  }
}
```

---

## 🏗️ Arquitectura del Código

```
backend/src/
├── repositories/
│   └── player.repo.ts        # Lógica de acceso a datos (Prisma)
├── services/
│   └── player.service.ts     # Lógica de negocio
├── controllers/
│   └── player.controller.ts  # Manejo de requests/responses
├── routes/
│   └── player.routes.ts      # Definición de endpoints
├── schemas/
│   └── player.schema.ts      # Validación con Zod
└── scripts/
    └── sync-players.ts       # Script de sincronización
```

## 🔧 Métodos del Repositorio

### `PlayerRepository`

- `upsertPlayer(data)` - Crear o actualizar un jugador
- `upsertMany(players)` - Crear o actualizar múltiples jugadores
- `getAllPlayers()` - Obtener todos los jugadores
- `getPlayerById(id)` - Obtener jugador por ID
- `getPlayersByTeam(teamId)` - Obtener jugadores por equipo
- `getPlayersByPosition(position)` - Obtener jugadores por posición
- `getPlayersByPriceRange(min, max)` - Obtener jugadores por rango de precio
- `searchPlayers(query)` - Buscar jugadores por nombre
- `updatePlayerPrice(id, price)` - Actualizar precio de un jugador
- `deletePlayer(id)` - Eliminar un jugador
- `deleteAllPlayers()` - Eliminar todos los jugadores
- `countPlayers()` - Contar jugadores totales
- `getPriceStats()` - Obtener estadísticas de precios

## 📊 Ejemplos de Uso

### Sincronizar jugadores manualmente

```bash
npm run sync-players
```

### Probar endpoints con cURL

```bash
# Obtener todos los atacantes caros
curl "http://localhost:3000/players?position=Attacker&minPrice=150"

# Buscar jugadores por nombre
curl "http://localhost:3000/players?search=messi"

# Actualizar precio
curl -X PATCH http://localhost:3000/players/154/price \
  -H "Content-Type: application/json" \
  -d '{"price": 200}'
```

## 🔄 Resincronización

Para resincronizar los jugadores (actualizar datos y precios):

```bash
npm run sync-players
```

Esto actualizará los jugadores existentes y añadirá nuevos si los hay.

## 📝 Notas Importantes

1. **Rate Limiting**: La API de LaLiga tiene límites de tasa. El script incluye delays entre peticiones.
2. **Precios**: Los precios son aleatorios y se generan en cada sincronización.
3. **Actualización**: Los precios NO se actualizan automáticamente, solo con sincronización manual.
4. **Índices**: La tabla tiene índices en `teamId`, `position` y `price` para consultas rápidas.

## 🎯 Próximos Pasos

Para integrar con el frontend, puedes:

1. Reemplazar `FootballService.getAllLeaguePlayers()` con una llamada a `/players`
2. Usar los precios de la base de datos en lugar de calcularlos en el frontend
3. Implementar un sistema de mercado con compra/venta de jugadores
4. Añadir autenticación a los endpoints de modificación

## 🐛 Troubleshooting

### Error: "Property 'player' does not exist on type 'PrismaClient'"

Ejecutar:
```bash
npx prisma generate
```

### Error: "axios not found"

Ejecutar:
```bash
npm install axios
```

### La sincronización se detiene a mitad

Esto es normal si se alcanza el rate limit de la API. Volver a ejecutar el script sincronizará los jugadores restantes.
