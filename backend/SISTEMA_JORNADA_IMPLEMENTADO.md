# ✅ Sistema de Cambio de Jornada - IMPLEMENTADO

## 🎯 Resumen

El sistema completo de cambio de jornada ha sido **implementado exitosamente**. Ahora cada vez que cambia la jornada:

1. ✅ Se evalúan automáticamente todas las apuestas
2. ✅ Se calculan ganancias/pérdidas por usuario
3. ✅ Se resetea el presupuesto de fichajes a **500M + ganancias/pérdidas de apuestas**
4. ✅ Se resetea el presupuesto de apuestas a **250M**

## 📁 Archivos Creados

### Backend

1. **`src/services/jornada.service.ts`**
   - Servicio principal con toda la lógica
   - Evaluación de apuestas usando API de LaLiga
   - Cálculo de balances
   - Reseteo de presupuestos

2. **`src/controllers/jornada.controller.ts`**
   - Controladores para los endpoints
   - Manejo de requests/responses

3. **`src/routes/jornada.routes.ts`**
   - Rutas del API
   - `/jornada/reset/:leagueId` - Resetear una liga
   - `/jornada/reset-all` - Resetear todas las ligas
   - `/jornada/evaluate/:leagueId` - Evaluar sin aplicar cambios (testing)

4. **`scripts/cambiar-jornada.ts`**
   - Script de consola para ejecutar cambios manualmente
   - Soporta liga específica o todas las ligas

5. **`CAMBIO_JORNADA_README.md`**
   - Documentación completa del sistema

### Modificaciones

1. **`src/app.ts`**
   - Registradas las rutas de jornada

## 🚀 Cómo Usar

### Opción 1: Script de Consola (Recomendado)

```bash
cd backend

# Cambiar jornada para una liga específica
npx tsx scripts/cambiar-jornada.ts <leagueId> <jornada>

# Cambiar jornada para TODAS las ligas
npx tsx scripts/cambiar-jornada.ts all <jornada>
```

**Ejemplo:**
```bash
# Liga específica
npx tsx scripts/cambiar-jornada.ts cm2abc123xyz 11

# Todas las ligas
npx tsx scripts/cambiar-jornada.ts all 11
```

### Opción 2: API REST

```bash
# Liga específica
curl -X POST http://localhost:3000/api/jornada/reset/<leagueId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"jornada": 11}'

# Todas las ligas
curl -X POST http://localhost:3000/api/jornada/reset-all \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"jornada": 11}'
```

## 💡 Ejemplo de Funcionamiento

### Estado Inicial (Jornada 10)
```
Usuario A:
  - Presupuesto fichajes: 450M (gastó 50M en jugadores)
  - Presupuesto apuestas: 0M (usó todo)
  - Apuestas pendientes:
    * 50M × 2.5 en "Más de 2.5 goles" ✅ GANADA
    * 30M × 1.8 en "Ganará Barcelona" ❌ PERDIDA
```

### Proceso de Cambio a Jornada 11
```
1. Evaluación de apuestas:
   - Apuesta 1: GANADA → +75M de ganancia neta
   - Apuesta 2: PERDIDA → -30M de pérdida
   
2. Balance total: +75M - 30M = +45M

3. Nuevos presupuestos:
   - Fichajes: 500M + 45M = 545M ✅
   - Apuestas: 250M (reseteo) ✅
```

### Estado Final (Jornada 11)
```
Usuario A:
  - Presupuesto fichajes: 545M 🎉
  - Presupuesto apuestas: 250M ✅
  - Apuestas anteriores: marcadas como won/lost
```

## 🔍 Tipos de Apuestas Soportadas

El sistema evalúa automáticamente:

- ✅ **Goles totales** (más de / menos de X goles)
- ✅ **Goles exactos** (exactamente X goles)
- ✅ **Córners** (más de / menos de / exactos / par/impar)
- ✅ **Tarjetas** (más de / menos de / exactas / par/impar)
- ✅ **Resultado** (ganará equipo X / empate)
- ✅ **Ambos marcan** (sí / no)
- ✅ **Par/Impar** (goles totales)
- ✅ **Doble oportunidad** (1X / X2 / 12)

## 📊 Flujo del Sistema

```
Nueva Jornada
    ↓
Obtener apuestas pendientes
    ↓
Consultar resultados reales (API LaLiga)
    ↓
Evaluar cada apuesta → won / lost
    ↓
Calcular balance por usuario
    ↓
RESETEAR PRESUPUESTOS:
  • Fichajes: 500M + balance
  • Apuestas: 250M
    ↓
¡Listo para nueva jornada!
```

## 🎮 API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/jornada/reset/:leagueId` | POST | Resetear una liga específica |
| `/api/jornada/reset-all` | POST | Resetear todas las ligas |
| `/api/jornada/evaluate/:leagueId` | POST | Evaluar apuestas (solo testing) |

## ✨ Características

- ✅ **Evaluación automática** de apuestas usando datos reales
- ✅ **Cálculo preciso** de ganancias/pérdidas
- ✅ **Reseteo inteligente** de presupuestos
- ✅ **Logs detallados** de todo el proceso
- ✅ **Manejo de errores** robusto
- ✅ **Rate limiting** para API externa
- ✅ **Soporte multi-liga**
- ✅ **Script de consola** fácil de usar

## 🔐 Seguridad

- Requiere autenticación JWT
- Solo usuarios autenticados pueden ejecutar
- Logs de auditoría completos
- Validación de datos de entrada

## 📝 Notas Importantes

1. **Partidos no finalizados**: Las apuestas de partidos que aún no terminaron permanecen como `pending` hasta la próxima ejecución

2. **Usuarios sin apuestas**: Reciben el presupuesto base de 500M para fichajes y 250M para apuestas

3. **API de LaLiga**: El sistema usa la API configurada en `FOOTBALL_API_KEY` del archivo `.env`

4. **Ejecución manual**: Por ahora se ejecuta manualmente, pero se puede automatizar con cron jobs o webhooks

## 🎯 Próximos Pasos (Opcional)

- [ ] Interfaz de administración en el frontend
- [ ] Automatización con cron jobs
- [ ] Notificaciones a usuarios (email/push)
- [ ] Historial de balances por jornada
- [ ] Dashboard de estadísticas

## 📚 Documentación Completa

Ver `CAMBIO_JORNADA_README.md` para:
- Documentación técnica detallada
- Ejemplos de uso
- Estructura de datos
- Diagramas de flujo
- Casos especiales y errores

---

## 🎉 ¡Sistema Listo para Usar!

El sistema está completamente funcional y probado. Puedes ejecutar el cambio de jornada en cualquier momento usando el script o el API.

**Para probarlo:**
```bash
cd backend
npx tsx scripts/cambiar-jornada.ts all 11
```
