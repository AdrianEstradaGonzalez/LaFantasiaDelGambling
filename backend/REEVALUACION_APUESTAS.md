# Sistema de Reevaluación de Apuestas

## 📋 Descripción

Sistema automático para reevaluar todas las apuestas pendientes de todas las ligas y divisiones (Primera, Segunda y Premier League). Diseñado para ser ejecutado por cronjobs y detectar errores en la evaluación de apuestas en tiempo real.

## 🎯 Componentes

### 1. Script de Reevaluación
**Archivo:** `backend/scripts/reevaluate-all-bets.ts`

Script independiente que puede ejecutarse manualmente para depurar el sistema de apuestas.

#### Ejecución Manual
```bash
cd backend
npm run tsx scripts/reevaluate-all-bets.ts
```

#### Funcionalidad
- ✅ Busca todas las ligas con apuestas pendientes
- ✅ Agrupa ligas por división (Primera, Segunda, Premier)
- ✅ Evalúa todas las apuestas pendientes de cada liga
- ✅ Consulta la API de Football para obtener resultados
- ✅ Actualiza el estado de las apuestas (won/lost)
- ✅ Genera reporte detallado con estadísticas

#### Salida del Script
```
═══════════════════════════════════════════════════════════════════
🔄 INICIANDO REEVALUACIÓN DE TODAS LAS APUESTAS
═══════════════════════════════════════════════════════════════════
⏰ 23/11/2025, 14:30:00

📊 Total de ligas con apuestas pendientes: 5

📋 Ligas por división:
   - Primera División: 2 ligas
   - Segunda División: 2 ligas
   - Premier League: 1 ligas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Procesando ligas...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 Evaluando liga: Mi Liga de Amigos (primera)
   ID: clxxx...
   Jornada actual: 14
   Miembros: 8
   📊 Resumen:
      ✅ Ganadas: 5
      ❌ Perdidas: 12
      Total evaluadas: 17

═══════════════════════════════════════════════════════════════════
📊 RESUMEN FINAL DE REEVALUACIÓN
═══════════════════════════════════════════════════════════════════
Total de ligas procesadas: 5
   ✅ Apuestas ganadas: 23
   ❌ Apuestas perdidas: 45
   📊 Total evaluadas: 68
═══════════════════════════════════════════════════════════════════
```

### 2. Endpoint para Cronjob
**Ruta:** `POST/GET /api/player-stats/reevaluate-all-bets`
**Autenticación:** Requiere token de cron (CRON_SECRET)

#### Uso desde Cronjob

##### Render.com (Cron Job)
```yaml
# render.yaml
jobs:
  - type: cron
    name: reevaluate-bets
    schedule: "0 */6 * * *"  # Cada 6 horas
    plan: starter
    command: curl -X POST https://tu-api.onrender.com/api/player-stats/reevaluate-all-bets?token=TU_CRON_SECRET
```

##### cron-job.org
1. Crear nuevo cronjob
2. URL: `https://tu-api.onrender.com/api/player-stats/reevaluate-all-bets?token=TU_CRON_SECRET`
3. Método: POST o GET (ambos funcionan)
4. Frecuencia: Cada 6 horas
5. Timeout: 300 segundos (5 minutos)

##### Easy Cron
1. URL: `https://tu-api.onrender.com/api/player-stats/reevaluate-all-bets?token=TU_CRON_SECRET`
2. Método HTTP: POST
3. Intervalo: Every 6 hours
4. Timezone: Europe/Madrid

#### Variables de Entorno Necesarias
```env
CRON_SECRET=tu_secret_aleatorio_aqui
FOOTBALL_API_KEY=tu_api_key_de_football
DATABASE_URL=postgresql://...
```

#### Respuesta del Endpoint

**Éxito (200 OK):**
```json
{
  "success": true,
  "message": "Reevaluación completada: 68 apuestas evaluadas",
  "data": {
    "leagues": 5,
    "evaluated": 68,
    "won": 23,
    "lost": 45,
    "errors": []
  }
}
```

**Sin apuestas pendientes (200 OK):**
```json
{
  "success": true,
  "message": "No hay apuestas pendientes para evaluar",
  "data": {
    "leagues": 0,
    "evaluated": 0,
    "won": 0,
    "lost": 0,
    "errors": []
  }
}
```

**Error (500):**
```json
{
  "success": false,
  "message": "Error al reevaluar apuestas",
  "error": "Details..."
}
```

## 🔧 Configuración del Cronjob

### Opción 1: Render.com (Recomendado)

1. **Crear archivo `render.yaml` en el backend:**
```yaml
services:
  - type: web
    name: fantasiadelgambling-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    
jobs:
  - type: cron
    name: reevaluate-bets
    schedule: "0 */6 * * *"  # Cada 6 horas
    plan: starter
    buildCommand: npm install
    command: curl -X POST $API_URL/api/player-stats/reevaluate-all-bets?token=$CRON_SECRET
    env:
      - key: CRON_SECRET
        sync: false
      - key: API_URL
        sync: false
```

2. **Configurar variables de entorno en Render:**
   - `CRON_SECRET`: Token secreto para autenticar el cron
   - `API_URL`: URL de tu API (ej: https://tu-api.onrender.com)

3. **Deploy:** Render detectará automáticamente el archivo y creará el cronjob

### Opción 2: Servicios Externos

#### cron-job.org
1. Registro en https://cron-job.org
2. Create Cronjob → URL: `https://tu-api.onrender.com/api/player-stats/reevaluate-all-bets?token=TU_CRON_SECRET`
3. Schedule: `0 */6 * * *` (cada 6 horas)
4. Request method: POST
5. Save & Enable

#### EasyCron
1. Registro en https://www.easycron.com
2. Create Cron Job
3. URL: Tu endpoint con token
4. Cron Expression: `0 */6 * * *`
5. Enable

## 📊 Logs y Monitoreo

El endpoint genera logs detallados en la consola del servidor:

```
═══════════════════════════════════════════════════════════════════
🔄 CRONJOB: Iniciando reevaluación de apuestas
═══════════════════════════════════════════════════════════════════
⏰ 23/11/2025, 14:30:00

📊 Ligas con apuestas pendientes: 5
📋 Por división:
   - Primera: 2
   - Segunda: 2
   - Premier: 1

🏆 Evaluando: Mi Liga (primera)
   ✅ 5 ganadas, ❌ 12 perdidas

═══════════════════════════════════════════════════════════════════
📊 RESUMEN FINAL
═══════════════════════════════════════════════════════════════════
Ligas procesadas: 5
✅ Ganadas: 23
❌ Perdidas: 45
📊 Total: 68
═══════════════════════════════════════════════════════════════════
```

## 🔒 Seguridad

### Autenticación con Token de Cron
El endpoint utiliza middleware `cronAuth` que verifica:

1. **Token en query string:** `?token=CRON_SECRET`
2. **Token en header:** `Authorization: Bearer CRON_SECRET`
3. **Token en header custom:** `X-Cron-Token: CRON_SECRET`

### Generación de Token Seguro
```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 🧪 Testing

### Test Manual del Endpoint
```bash
# Con curl
curl -X POST "http://localhost:3000/api/player-stats/reevaluate-all-bets?token=TU_CRON_SECRET"

# Con httpie
http POST localhost:3000/api/player-stats/reevaluate-all-bets token==TU_CRON_SECRET

# Con Postman
POST http://localhost:3000/api/player-stats/reevaluate-all-bets?token=TU_CRON_SECRET
```

### Test del Script
```bash
cd backend
npm run tsx scripts/reevaluate-all-bets.ts
```

## 📝 Frecuencia Recomendada

- **Durante jornada activa:** Cada 2-3 horas
- **Días sin partidos:** Cada 12 horas
- **Después del cierre de jornada:** Inmediatamente (trigger manual)

### Configuración por Escenario

**Jornada en curso (Viernes-Domingo):**
```
*/3 * * * *  # Cada 3 horas
```

**Entre semana:**
```
0 */12 * * *  # Cada 12 horas
```

**Flexible (Recomendado):**
```
0 */6 * * *  # Cada 6 horas (equilibrio entre frecuencia y uso de API)
```

## 🎯 Casos de Uso

### 1. Depuración de Evaluaciones Incorrectas
```bash
# Ejecutar script manualmente para ver logs detallados
npm run tsx scripts/reevaluate-all-bets.ts
```

### 2. Reevaluación Automática Post-Jornada
Configurar cronjob para ejecutarse 24h después del último partido de la jornada.

### 3. Verificación Periódica
Cronjob cada 6 horas para asegurar que todas las apuestas se evalúen correctamente.

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
cd backend
npm install
npm run build
```

### Error: "No database connection"
Verificar variable de entorno `DATABASE_URL` en el servidor.

### Error: "API rate limit exceeded"
- Reducir frecuencia del cronjob
- Verificar múltiples cronjobs no estén corriendo simultáneamente
- Revisar límites de la API de Football

### Apuestas no se evalúan
1. Verificar que los partidos estén finalizados (status: 'FT')
2. Revisar logs del endpoint para ver errores específicos
3. Ejecutar script manual para debugging
4. Verificar API key de Football API

## 📚 Referencias

- **Servicio de Evaluación:** `backend/src/services/betEvaluation.service.ts`
- **Controlador:** `backend/src/controllers/playerStats.controller.ts`
- **Rutas:** `backend/src/routes/playerStats.routes.ts`
- **Middleware Auth:** `backend/src/middleware/cronAuth.ts`

## ✅ Checklist de Implementación

- [x] ✅ Script de reevaluación creado
- [x] ✅ Endpoint para cronjob implementado
- [x] ✅ Rutas GET y POST configuradas
- [x] ✅ Autenticación con token de cron
- [x] ✅ Logs detallados implementados
- [x] ✅ Soporte para todas las divisiones
- [ ] ⏳ Configurar cronjob en Render/servicio externo
- [ ] ⏳ Configurar variable CRON_SECRET en producción
- [ ] ⏳ Monitorear logs después de primera ejecución

---

**Última actualización:** 23 de Noviembre, 2025
