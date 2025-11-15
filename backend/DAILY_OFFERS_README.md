# Sistema de Ofertas Diarias del Mercado

Sistema que genera 50 ofertas diarias de jugadores con descuento del 20% en el mercado de fichajes.

## 🎯 Características

- **150 ofertas diarias** (50 por división):
  - 50 jugadores de Primera División
  - 50 jugadores de Segunda División
  - 50 jugadores de Premier League
- Todos con precio > 1M
- **20% de descuento** automático en el precio
- **No repetición**: Un jugador no puede estar en oferta dos días consecutivos
- **Precio de venta fijo**: Cuando vendes un jugador, lo vendes por el precio que lo compraste (no por el precio actual del mercado)

## 📦 Instalación

### 1. Ejecutar la migración de base de datos

```bash
cd backend
npx tsx scripts/add-daily-offers.ts
```

Esto creará las tablas:
- `daily_offer`: Ofertas del día
- `offer_history`: Historial de cuándo cada jugador tuvo oferta

### 2. Generar ofertas iniciales

```bash
npx tsx scripts/generate-daily-offers.ts
```

## 🔄 Automatización

### Configurar cron job diario

El script debe ejecutarse automáticamente cada día. Puedes configurarlo de dos formas:

#### Opción 1: Cron-job.org

1. Ve a https://console.cron-job.org
2. Crea un nuevo job con:
   - **URL**: `https://tudominio.com/admin/generate-daily-offers`
   - **Schedule**: Todos los días a las 00:00 (medianoche)
   - **Method**: GET
   - **Headers**: `X-Cron-Token: TU_TOKEN_DE_CRON`

#### Opción 2: Render.com (Cron Jobs)

1. En el dashboard de Render, crea un nuevo "Cron Job"
2. Configura:
   - **Command**: `npx tsx scripts/generate-daily-offers.ts`
   - **Schedule**: `0 0 * * *` (medianoche cada día)

## 🎮 Uso desde la App

### Endpoints API

#### Obtener ofertas del día
```
GET /daily-offers?division=primera
```

Respuesta:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "date": "2025-11-15",
      "playerId": 123,
      "playerName": "Vinicius Junior",
      "division": "primera",
      "originalPrice": 200,
      "offerPrice": 160,
      "discount": 20
    }
  ],
  "count": 50
}
```

#### Verificar si un jugador está en oferta
```
GET /daily-offers/player/:playerId
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "isOnOffer": true,
    "offerPrice": 160,
    "discount": 20
  }
}
```

## 💰 Lógica de Compra/Venta

### Compra
- Si el jugador está en oferta hoy, se compra al precio de oferta (20% menos)
- El campo `SquadPlayer.pricePaid` guarda el precio exacto pagado
- El presupuesto se descuenta según el precio pagado

### Venta
- **IMPORTANTE**: Cuando vendes un jugador, recuperas el precio que pagaste (`pricePaid`)
- **NO** se usa el precio actual del mercado
- Esto evita que alguien compre barato en oferta y venda caro al día siguiente

### Ejemplo

```
Jugador: Vinicius Jr
Precio normal: 200M

Día 1 (en oferta):
- Precio de oferta: 160M (20% descuento)
- Usuario A lo compra por 160M
- Se guarda pricePaid = 160

Día 2 (sin oferta):
- Precio del mercado vuelve a 200M
- Usuario A decide vender
- Recupera 160M (lo que pagó), NO 200M
```

## 🔧 Mantenimiento

### Limpiar ofertas antiguas (opcional)

Las ofertas se mantienen en la BD. Para limpiar ofertas de más de 7 días:

```bash
npx tsx scripts/clean-old-offers.ts
```

O llamar al endpoint (desde el backend):
```typescript
await DailyOffersService.cleanOldOffers();
```

## 📊 Distribución de Ofertas

El script genera **50 ofertas por cada división**:
- **Primera División**: 50 ofertas
- **Segunda División**: 50 ofertas
- **Premier League**: 50 ofertas

**Total: 150 ofertas diarias**

**Jugadores elegibles:**
- Precio > 1M
- No tuvo oferta ayer

Si una división tiene menos de 50 jugadores elegibles, se generarán todas las ofertas posibles para esa división.

## 🎲 Algoritmo de Selección

1. Obtener todos los jugadores con `precio > 1M` de cada división
2. Excluir jugadores que tuvieron oferta ayer
3. **Por cada división**:
   - Mezclar aleatoriamente (`shuffle`)
   - Seleccionar los primeros 50 jugadores
4. Aplicar 20% de descuento a cada uno
5. Guardar las 150 ofertas en `daily_offer` y actualizar `offer_history`

## 🐛 Debugging

### Ver ofertas de hoy en la BD
```sql
SELECT * FROM daily_offer WHERE date = CURRENT_DATE;
```

### Ver historial de un jugador
```sql
SELECT * FROM offer_history WHERE "playerId" = 123;
```

### Verificar precio pagado por un jugador en plantilla
```sql
SELECT * FROM squad_player WHERE "playerId" = 123;
-- Ver campo pricePaid
```
