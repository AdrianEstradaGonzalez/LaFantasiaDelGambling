# Sistema de Evaluación Automática de Apuestas

## 📋 Descripción

Sistema completo para evaluar apuestas deportivas usando datos reales de la API de Football. Consulta los resultados de los partidos y marca automáticamente las apuestas como ganadas o perdidas.

## 🏗️ Arquitectura

### Backend

#### 1. **Servicio de Evaluación** (`backend/src/services/betEvaluation.service.ts`)

Funcionalidades principales:
- ✅ Obtiene estadísticas completas de partidos terminados desde API-Football
- ✅ Evalúa cada tipo de apuesta contra los datos reales
- ✅ Actualiza el estado de las apuestas en la base de datos
- ✅ Guarda el resultado real para referencia futura

#### 2. **Endpoint de Admin** (`POST /api/admin/leagues/:leagueId/evaluate-bets`)

- **Requiere:** Autenticación + permisos de administrador
- **Procesa:** Todas las apuestas pendientes de una liga
- **Retorna:** Estadísticas de evaluación (evaluadas, ganadas, perdidas, errores)

### Frontend

#### 1. **Servicio BetService** (`frontend/services/BetService.ts`)

Método añadido:
```typescript
static async evaluateBets(leagueId: string)
```

#### 2. **Botón en AdminPanel** (`frontend/pages/admin/AdminPanel.tsx`)

- 🎯 Botón "Evaluar Apuestas" en el panel de administración
- ⚠️ Confirmación antes de ejecutar
- 📊 Muestra resultados detallados al finalizar

## 🎲 Tipos de Apuestas Soportados

### 1. **Goles Totales**
- ✅ Más de X goles
- ✅ Menos de X goles
- ✅ Exactamente X goles

**Ejemplo:**
- Apuesta: "Más de 2.5 goles"
- Resultado: 3 goles (Barcelona 2-1 Real Madrid)
- Estado: ✅ GANADA

### 2. **Córners**
- ✅ Más de X córners
- ✅ Menos de X córners

**Ejemplo:**
- Apuesta: "Más de 9.5 córners"
- Resultado: 11 córners totales
- Estado: ✅ GANADA

### 3. **Tarjetas**
- ✅ Más de X tarjetas
- ✅ Menos de X tarjetas
- ⚠️ Cuenta amarillas + rojas

**Ejemplo:**
- Apuesta: "Más de 4.5 tarjetas"
- Resultado: 6 tarjetas (5 amarillas, 1 roja)
- Estado: ✅ GANADA

### 4. **Resultado (1X2)**
- ✅ Victoria local
- ✅ Empate
- ✅ Victoria visitante

**Ejemplo:**
- Apuesta: "Gana el local"
- Resultado: Barcelona 3-1 Sevilla
- Estado: ✅ GANADA

### 5. **Ambos Marcan (BTTS)**
- ✅ Sí
- ✅ No

**Ejemplo:**
- Apuesta: "Ambos marcan: Sí"
- Resultado: Real Madrid 2-1 Atlético
- Estado: ✅ GANADA

### 6. **Tiros a Puerta**
- ✅ Más de X tiros
- ✅ Menos de X tiros

**Ejemplo:**
- Apuesta: "Más de 7.5 tiros a puerta"
- Resultado: 9 tiros totales
- Estado: ✅ GANADA

## 🔄 Flujo de Evaluación

```
1. Admin presiona "Evaluar Apuestas"
   ↓
2. Frontend solicita confirmación
   ↓
3. Se envía petición POST a /api/admin/leagues/:leagueId/evaluate-bets
   ↓
4. Backend obtiene todas las apuestas pendientes
   ↓
5. Agrupa apuestas por matchId (minimizar llamadas API)
   ↓
6. Por cada partido:
   ├─ Consulta API-Football (fixture + statistics)
   ├─ Verifica que el partido haya terminado
   ├─ Extrae estadísticas (goles, córners, tarjetas, etc.)
   └─ Evalúa cada apuesta del partido
   ↓
7. Actualiza base de datos:
   ├─ status: 'won' o 'lost'
   ├─ evaluatedAt: timestamp
   └─ apiValue: resultado real
   ↓
8. Retorna resumen al frontend
   ↓
9. Muestra resultados al admin
```

## 📊 Ejemplo de Salida

```json
{
  "success": true,
  "evaluated": 15,
  "won": 8,
  "lost": 7,
  "errors": [],
  "message": "Evaluadas 15 apuestas: 8 ganadas, 7 perdidas"
}
```

## 🔧 Gestión de Errores

### Errores Comunes

1. **Partido no encontrado**
   - Ocurre si el matchId no existe en API-Football
   - Se registra en el array de errores
   - No detiene la evaluación de otros partidos

2. **Partido no terminado**
   - Solo se evalúan partidos con estado: FT, AET, PEN
   - Se ignora y se registra el error
   - La apuesta permanece en estado "pending"

3. **Tipo de apuesta no soportado**
   - Se marca como "lost" por defecto
   - Se guarda mensaje explicativo en apiValue

4. **Error de API**
   - Se captura y registra
   - No afecta otras evaluaciones
   - Se retorna en el array de errores

## 🎯 Uso desde Admin Panel

1. **Acceder al Panel de Admin**
   - Solo usuarios con `isAdmin: true`
   - Navegar a "Gestión DreamLeague"

2. **Evaluar Apuestas**
   ```
   1. Clic en botón "🎯 Evaluar Apuestas"
   2. Confirmar la acción
   3. Esperar evaluación (muestra indicador de carga)
   4. Ver resumen de resultados
   ```

3. **Interpretar Resultados**
   - **Total evaluadas:** Apuestas procesadas
   - **Ganadas:** Predicciones correctas
   - **Perdidas:** Predicciones incorrectas
   - **Errores:** Problemas durante evaluación

## 🔐 Seguridad

- ✅ Requiere autenticación JWT
- ✅ Requiere rol de administrador
- ✅ Solo procesa apuestas en estado "pending"
- ✅ No afecta apuestas ya evaluadas
- ✅ Registra timestamp de evaluación

## 📝 Campos de Base de Datos

### Campos Usados en Evaluación

```prisma
model Bet {
  id           String    // ID único
  matchId      Int       // ID del partido en API-Football
  betType      String    // Tipo de apuesta
  betLabel     String    // Opción específica apostada
  status       String    // pending → won/lost
  evaluatedAt  DateTime? // Timestamp de evaluación
  apiValue     String?   // Resultado real guardado
  // ... otros campos
}
```

## 🚀 Próximas Mejoras

- [ ] Soporte para apuestas combinadas
- [ ] Evaluación automática por cron job
- [ ] Notificaciones push de resultados
- [ ] Dashboard de estadísticas de apuestas
- [ ] Filtros por fecha de evaluación
- [ ] Export de reportes en CSV/PDF

## 📞 Soporte

Para problemas o preguntas sobre el sistema de evaluación:
1. Revisar logs del backend (`console.log` en betEvaluation.service.ts)
2. Verificar que los matchId correspondan a partidos reales
3. Confirmar que los partidos hayan terminado
4. Revisar formato de betType y betLabel

---

**Última actualización:** 2025-10-20
**Versión:** 1.0.0
