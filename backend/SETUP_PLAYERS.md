# Setup de la tabla de jugadores

## 1. Instalar dependencia axios

```bash
npm install axios
```

## 2. Generar migración de Prisma

```bash
npx prisma migrate dev --name add_players_table
```

## 3. Generar cliente de Prisma

```bash
npx prisma generate
```

## 4. Iniciar el servidor

```bash
npm run dev
```

## 5. Sincronizar jugadores desde la API

Hacer una petición POST a:

```bash
curl -X POST http://localhost:3000/players/sync
```

O desde tu cliente HTTP favorito (Postman, Thunder Client, etc.)

## Endpoints disponibles

### Sincronizar jugadores
- **POST** `/players/sync`
- Descarga todos los jugadores de LaLiga desde la API y los guarda con precios aleatorios entre 1M y 250M

### Obtener todos los jugadores
- **GET** `/players`
- Query params opcionales:
  - `position`: Filtrar por posición (Goalkeeper, Defender, Midfielder, Attacker)
  - `teamId`: Filtrar por ID de equipo
  - `minPrice`: Precio mínimo
  - `maxPrice`: Precio máximo
  - `search`: Buscar por nombre

Ejemplos:
```bash
GET /players
GET /players?position=Attacker
GET /players?teamId=530
GET /players?minPrice=50&maxPrice=150
GET /players?search=messi
```

### Obtener jugador por ID
- **GET** `/players/:id`

Ejemplo:
```bash
GET /players/154
```

### Obtener estadísticas
- **GET** `/players/stats`
- Devuelve precio promedio, mínimo, máximo y total de jugadores

### Actualizar precio de un jugador
- **PATCH** `/players/:id/price`
- Body: `{ "price": 120 }`

Ejemplo:
```bash
PATCH /players/154/price
Body: { "price": 120 }
```

## Rangos de precios por posición

- **Goalkeeper**: 1M - 80M
- **Defender**: 1M - 150M
- **Midfielder**: 5M - 200M
- **Attacker**: 10M - 250M

Los precios se generan aleatoriamente dentro de estos rangos al sincronizar.
