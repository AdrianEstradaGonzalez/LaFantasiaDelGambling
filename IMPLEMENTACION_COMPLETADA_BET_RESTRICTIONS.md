# 🎯 IMPLEMENTACIÓN DE RESTRICCIONES BET_OPTION

## ✅ COMPLETADO

### 📦 Archivos Modificados

1. **Backend - Validación**
   - `backend/src/services/betOption.service.ts`
   - Líneas: 29-180 (función `saveBetOptions`)
   - ✅ Filtra "Doble oportunidad"
   - ✅ Deduplica por (matchId, betType, betLabel)
   - ✅ Agrupa por (leagueId, matchId, betType)
   - ✅ Limita: Resultado=3, Otros=2
   - ✅ Valida antes de guardar
   - ✅ Logs detallados

2. **Frontend - Filtrado**
   - `frontend/services/FutbolService.ts`
   - Líneas: 1227-1290 (antes de `saveBetOptions`)
   - ✅ Deduplica apuestas generadas
   - ✅ Agrupa por (matchId, type)
   - ✅ Limita: Resultado=3, Otros=2
   - ✅ Logs detallados
   - ✅ Envía solo opciones válidas

3. **Scripts de Verificación**
   - `backend/scripts/verify-bet-constraints.sql`
   - ✅ Queries para detectar violaciones
   - ✅ Resumen por liga/partido
   - ✅ Contador de violaciones
   - ✅ Scripts de limpieza (comentados)

4. **Documentación**
   - `RESTRICCIONES_BET_OPTION.md`
   - ✅ Regla de negocio explicada
   - ✅ Ejemplos válidos e inválidos
   - ✅ Implementación en 3 capas
   - ✅ Guías de verificación
   - ✅ Testing y troubleshooting

---

## 🔒 Restricción Implementada

```
Para cada (leagueId, matchId):

✅ betType = "Resultado"  → MÁXIMO 3 opciones
   Ejemplo: "Ganará Local", "Empate", "Ganará Visitante"

✅ betType = cualquier otro → MÁXIMO 2 opciones
   Ejemplo: "Más de 2.5 goles", "Menos de 2.5 goles"
```

---

## 🛡️ 3 Capas de Protección

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (FutbolService.ts)                        │
│  ✅ Genera apuestas                                 │
│  ✅ Deduplica                                       │
│  ✅ Limita por (matchId, type)                     │
│  ✅ Envía solo válidas                             │
└────────────────────┬────────────────────────────────┘
                     │ HTTP POST
                     ▼
┌─────────────────────────────────────────────────────┐
│  BACKEND (betOption.service.ts)                     │
│  ✅ Recibe opciones                                 │
│  ✅ Filtra "Doble oportunidad"                     │
│  ✅ Deduplica por si acaso                         │
│  ✅ Limita por (leagueId, matchId, betType)        │
│  ✅ VALIDA antes de guardar                        │
│  ❌ Lanza error si hay violaciones                 │
└────────────────────┬────────────────────────────────┘
                     │ Prisma INSERT
                     ▼
┌─────────────────────────────────────────────────────┐
│  BASE DE DATOS (bet_option)                         │
│  ✅ ID único por (league, jornada, match, type,    │
│     label) previene duplicados exactos             │
│  ✅ skipDuplicates: true en createMany             │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Logs Esperados

### Frontend
```
🔍 Aplicando límites por tipo de apuesta...
🔄 Eliminadas 3 apuestas duplicadas
⚠️  Match 1149380 - Tipo "Resultado": 4 opciones, límite: 3. Descartando 1.
   ✅ Manteniendo: Ganará Villarreal, Empate, Ganará Girona
   ❌ Descartando: Villarreal o Empate
⚠️  Match 1149381 - Tipo "Goles totales": 3 opciones, límite: 2. Descartando 1.
   ✅ Manteniendo: Más de 2.5 goles, Menos de 2.5 goles
   ❌ Descartando: Más de 3.5 goles
📉 Total de apuestas limitadas: 5
✅ Apuestas finales después de validación: 38
💾 Guardando 38 opciones validadas en BD para liga abc123, jornada 15
```

### Backend
```
🔍 Iniciando validación de 38 opciones para liga abc123, jornada 15
⚠️  Filtradas 0 opciones de "Doble oportunidad"
🔄 Deduplicadas 0 opciones idénticas
🗑️  Eliminadas 35 opciones antiguas de liga abc123, jornada 15
✅ Guardadas 38 opciones de apuesta validadas
```

---

## 🧪 Testing

### 1. Probar generación de apuestas
```
1. Abrir app en modo admin
2. Seleccionar una liga
3. Clic en "Generar apuestas jornada"
4. Observar logs en consola
5. Verificar que muestra limitación automática
```

### 2. Verificar en base de datos
```bash
cd backend
npm run ts-node scripts/verify-bet-constraints.sql
```

O consulta SQL directa:
```sql
-- Debe devolver 0 violaciones
SELECT 
  "leagueId", "matchId", "betType", COUNT(*) as cnt
FROM bet_option
GROUP BY "leagueId", "matchId", "betType"
HAVING 
  ("betType" = 'Resultado' AND COUNT(*) > 3) OR
  ("betType" != 'Resultado' AND COUNT(*) > 2);
```

---

## 🎯 Casos de Uso

### ✅ Caso 1: Resultado (3 opciones)
```
Liga: abc123, Match: 1149380
✅ "Ganará Real Madrid"     (Resultado)
✅ "Empate"                 (Resultado)
✅ "Ganará Barcelona"       (Resultado)
❌ "Madrid o Empate"        (se descarta - 4ta opción)
```

### ✅ Caso 2: Goles totales (2 opciones)
```
Liga: abc123, Match: 1149380
✅ "Más de 2.5 goles"       (Goles totales)
✅ "Menos de 2.5 goles"     (Goles totales)
❌ "Más de 3.5 goles"       (se descarta - 3ra opción)
```

### ✅ Caso 3: Múltiples tipos en mismo match
```
Liga: abc123, Match: 1149380
✅ "Ganará Real Madrid"     (Resultado) - 1 de 3
✅ "Empate"                 (Resultado) - 2 de 3
✅ "Ganará Barcelona"       (Resultado) - 3 de 3
✅ "Más de 2.5 goles"       (Goles totales) - 1 de 2
✅ "Menos de 2.5 goles"     (Goles totales) - 2 de 2
✅ "Más de 9.5 córners"     (Córners) - 1 de 2
✅ "Menos de 9.5 córners"   (Córners) - 2 de 2
```

### ✅ Caso 4: Misma apuesta en diferentes matches
```
Liga: abc123, Match: 1149380
✅ "Más de 2.5 goles"       (Goles totales)
✅ "Menos de 2.5 goles"     (Goles totales)

Liga: abc123, Match: 1149381  ← Match diferente, restricción independiente
✅ "Más de 2.5 goles"       (Goles totales)
✅ "Menos de 2.5 goles"     (Goles totales)
```

### ✅ Caso 5: Misma apuesta en diferentes ligas
```
Liga: abc123, Match: 1149380
✅ "Ganará Real Madrid"     (Resultado)
✅ "Empate"                 (Resultado)
✅ "Ganará Barcelona"       (Resultado)

Liga: xyz789, Match: 1149380  ← Liga diferente, restricción independiente
✅ "Ganará Real Madrid"     (Resultado)
✅ "Empate"                 (Resultado)
✅ "Ganará Barcelona"       (Resultado)
```

---

## ✅ Comportamiento del Sistema

### **La aplicación NUNCA se rompe**

El sistema está diseñado para ser **tolerante a fallos**:

1. ✅ **Frontend filtra** antes de enviar → reduce carga
2. ✅ **Backend valida** antes de guardar → garantiza integridad
3. ✅ **Si hay violaciones**: Las descarta silenciosamente y continúa
4. ✅ **Logs detallados**: Muestra qué se descartó y por qué
5. ✅ **Sin errores**: La app nunca muestra errores al usuario por límites de apuestas

**Ejemplo de log cuando hay excedentes:**
```
⚠️  Opción descartada por límite: Liga abc123, Match 1149380, Tipo "Resultado", Label "Doble oportunidad" (ya hay 3 opciones)
✅ 38 opciones validadas y listas para guardar
✅ Guardadas 38 opciones de apuesta validadas
```

---

## 📝 Notas Importantes

1. **La restricción se aplica por (leagueId, matchId)**
   - No es global, es por combinación de liga y partido
   - Mismo partido en diferentes ligas = restricciones independientes

2. **Orden de limitación**
   - Se mantienen las **primeras N opciones** en orden de generación
   - Las opciones descartadas se muestran en logs

3. **Tipos de apuesta prohibidos**
   - ❌ "Doble oportunidad" está completamente prohibido
   - Se filtra automáticamente en backend

4. **Logs detallados**
   - Frontend y backend muestran qué se mantiene y qué se descarta
   - Útil para debugging y auditoría

---

## ✅ Checklist de Verificación

- [x] Código implementado en backend
- [x] Código implementado en frontend
- [x] Script SQL de verificación creado
- [x] Documentación completa creada
- [x] Sin errores de compilación
- [ ] Testing manual completado
- [ ] Verificación en base de datos real
- [ ] Logs revisados y confirmados

---

## 🚀 Siguiente Paso

**Probar la implementación:**

1. Abrir la app en modo admin
2. Generar apuestas para una jornada
3. Observar los logs en consola (frontend y backend)
4. Verificar en base de datos que se cumplan las restricciones
5. Reportar cualquier anomalía

**Comando para verificar DB:**
```bash
cd backend
npx prisma studio
# O ejecutar queries de verify-bet-constraints.sql
```
