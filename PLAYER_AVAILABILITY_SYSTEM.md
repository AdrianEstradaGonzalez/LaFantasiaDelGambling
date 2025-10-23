# Sistema de Estado de Disponibilidad de Jugadores

Este sistema permite rastrear y mostrar el estado actual de disponibilidad de cada jugador (disponible, lesionado o sancionado).

## 🎯 Características

- **Detección de Lesiones**: Consulta la API de API-Football para verificar si un jugador está lesionado
- **Detección de Suspensiones**: Analiza tarjetas rojas y acumulación de amarillas para detectar sanciones
- **Actualización Automática**: Sistema preparado para sincronización periódica
- **UI Moderna**: Indicadores visuales profesionales con iconos y colores distintivos

## 📊 Estados de Disponibilidad

### AVAILABLE (Disponible)
- ✅ Icono: Círculo verde con check (Ionicons: checkmark-circle)
- Color: Verde (#16a34a)
- Indica que el jugador puede jugar sin restricciones

### INJURED (Lesionado)
- 🏥 Icono: Cruz médica (MaterialCommunityIcons: hospital-box)
- Color: Rojo (#dc2626)
- Se obtiene del campo `injured` de la API de API-Football

### SUSPENDED (Sancionado)
- 🟥 Icono: Tarjeta roja (Ionicons: card)
- Color: Rojo/Amarillo (#b91c1c)
- Se detecta por:
  - Tarjeta roja en el último partido jugado
  - Acumulación de 5+ tarjetas amarillas en los últimos 5 partidos

## 🚀 Uso

### Sincronización Inicial

Para poblar el estado de todos los jugadores:

\`\`\`bash
cd backend
npx tsx scripts/sync-player-status.ts 2024
\`\`\`

Este script:
1. Consulta el estado de cada jugador en la API
2. Actualiza la base de datos con el estado actual
3. Muestra un resumen de disponibles/lesionados/sancionados

**⚠️ Importante**: La sincronización tarda aproximadamente 2-3 minutos debido a los límites de rate de la API (400ms entre peticiones).

### API Endpoints

#### Obtener estado de todos los jugadores
\`\`\`
GET /players/status
\`\`\`

Respuesta:
\`\`\`json
[
  {
    "id": 278,
    "name": "Kylian Mbappé",
    "position": "Attacker",
    "teamName": "Real Madrid",
    "availabilityStatus": "AVAILABLE",
    "availabilityInfo": null,
    "price": 10,
    "photo": "https://..."
  },
  {
    "id": 505,
    "name": "D. Alaba",
    "position": "Defender",
    "teamName": "Real Madrid",
    "availabilityStatus": "INJURED",
    "availabilityInfo": "Lesionado",
    "price": 5,
    "photo": "https://..."
  }
]
\`\`\`

#### Sincronizar todos los jugadores (Admin)
\`\`\`
POST /players/status/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "season": 2024
}
\`\`\`

#### Sincronizar un jugador específico (Admin)
\`\`\`
POST /players/:id/status/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "season": 2024
}
\`\`\`

## 🎨 Componente de UI

### PlayerAvailabilityBadge

Componente React Native que muestra el estado de disponibilidad:

\`\`\`tsx
import { PlayerAvailabilityBadge } from '../components/PlayerAvailabilityBadge';

<PlayerAvailabilityBadge 
  status="INJURED"
  info="Lesionado"
  size="small" // o "medium"
/>
\`\`\`

**Props**:
- `status`: 'AVAILABLE' | 'INJURED' | 'SUSPENDED' (default: 'AVAILABLE')
- `info`: string opcional con información adicional
- `size`: 'small' | 'medium' (default: 'small')

## 🔄 Actualización Periódica

### Opción 1: Cron Job Manual

Agregar al crontab del servidor:

\`\`\`bash
# Sincronizar estado cada 6 horas
0 */6 * * * cd /path/to/backend && npx tsx scripts/sync-player-status.ts 2024
\`\`\`

### Opción 2: node-cron (Recomendado)

1. Instalar node-cron:
\`\`\`bash
cd backend
npm install node-cron
npm install --save-dev @types/node-cron
\`\`\`

2. Agregar al inicio del servidor (`src/index.ts`):
\`\`\`typescript
import cron from 'node-cron';
import { updateAllPlayersAvailability } from './services/playerStatus.service.js';

// Ejecutar cada 6 horas
cron.schedule('0 */6 * * *', async () => {
  console.log('⏰ Iniciando sincronización programada de estado de jugadores...');
  try {
    await updateAllPlayersAvailability(2024);
    console.log('✅ Sincronización programada completada');
  } catch (error) {
    console.error('❌ Error en sincronización programada:', error);
  }
});
\`\`\`

### Opción 3: Webhook desde Panel de Admin

Agregar botón en el panel de administración que llame a:
\`\`\`typescript
POST /players/status/sync
\`\`\`

## 📝 Base de Datos

### Schema

La tabla `Player` incluye los siguientes campos nuevos:

\`\`\`prisma
model Player {
  // ... otros campos
  availabilityStatus  String   @default("AVAILABLE") // AVAILABLE, INJURED, SUSPENDED
  availabilityInfo    String?  // Información adicional
}
\`\`\`

### Migraciones

Si necesitas recrear la migración:

\`\`\`bash
cd backend
npx prisma migrate dev --name add_player_availability
\`\`\`

O simplemente aplicar cambios directamente:

\`\`\`bash
npx prisma db push
npx prisma generate
\`\`\`

## 🐛 Troubleshooting

### Error: "No se encontraron datos para la temporada 2025"

La API de API-Football puede no tener datos completos para temporadas futuras. Usa la temporada 2024:

\`\`\`bash
npx tsx scripts/sync-player-status.ts 2024
\`\`\`

### Error: "Too Many Requests" (429)

Si recibes errores de rate limiting, el script ya incluye delays de 400ms entre peticiones. Si persiste, aumenta el delay en `playerStatus.service.ts`:

\`\`\`typescript
await delay(600); // Aumentar de 400 a 600ms
\`\`\`

### Los jugadores no muestran el badge

1. Verifica que los datos lleguen al frontend:
\`\`\`typescript
console.log('Player data:', player);
\`\`\`

2. Asegúrate de que el backend incluya los campos en la respuesta del endpoint `/players`

3. Verifica que PlayerService incluya los campos en la interfaz `PlayerWithPrice`

## 🔐 Permisos

- **Consultar estado**: Público (cualquier usuario puede ver `/players/status`)
- **Sincronizar estado**: Solo administradores (requiere token JWT con `isAdmin: true`)

## 📈 Próximas Mejoras

- [ ] Mostrar fecha estimada de retorno para lesiones
- [ ] Histórico de lesiones/sanciones
- [ ] Notificaciones push cuando un jugador de tu plantilla se lesiona
- [ ] Filtros en el mercado por disponibilidad
- [ ] Estadísticas de tiempo fuera por lesión
