# RESTRICCIONES DE BET_OPTION - DOCUMENTACIÓN COMPLETA

## 📋 Regla de Negocio

Para cada combinación única de `(leagueId, matchId)` en la tabla `bet_option`:

```
✅ betType = "Resultado"  → Máximo 3 registros
✅ betType = cualquier otro → Máximo 2 registros
```

### Ejemplos

#### ✅ VÁLIDO
```
Liga 1, Match 105:
- betType: "Resultado", betLabel: "Ganará Real Madrid"
- betType: "Resultado", betLabel: "Empate"
- betType: "Resultado", betLabel: "Ganará Barcelona"
- betType: "Goles totales", betLabel: "Más de 2.5 goles"
- betType: "Goles totales", betLabel: "Menos de 2.5 goles"
- betType: "Córners", betLabel: "Más de 9.5 córners"
- betType: "Córners", betLabel: "Menos de 9.5 córners"
```

#### ❌ INVÁLIDO
```
Liga 1, Match 105:
- betType: "Resultado", betLabel: "Ganará Real Madrid"
- betType: "Resultado", betLabel: "Empate"
- betType: "Resultado", betLabel: "Ganará Barcelona"
- betType: "Resultado", betLabel: "Gana o empata Real Madrid"  ❌ 4ta opción!

Liga 1, Match 106:
- betType: "Goles totales", betLabel: "Más de 1.5 goles"
- betType: "Goles totales", betLabel: "Más de 2.5 goles"
- betType: "Goles totales", betLabel: "Más de 3.5 goles"  ❌ 3ra opción!
```

---

## 🛡️ Implementación en 3 Capas

### **CAPA 1: Frontend (FutbolService.ts)**

Ubicación: `frontend/services/FutbolService.ts` líneas ~1227-1290

**Qué hace:**
1. Genera apuestas desde la API de fútbol
2. **Deduplica** por `(matchId, type, label)`
3. **Agrupa** por `(matchId, type)`
4. **Limita** automáticamente:
   - `type === 'Resultado'` → primeras 3 opciones
   - `type !== 'Resultado'` → primeras 2 opciones
5. Envía solo las opciones válidas al backend

**Logs:**
```
🔍 Aplicando límites por tipo de apuesta...
🔄 Eliminadas 5 apuestas duplicadas
⚠️  Match 1149380 - Tipo "Resultado": 4 opciones, límite: 3. Descartando 1.
   ✅ Manteniendo: Ganará Villarreal, Empate, Ganará Girona
   ❌ Descartando: Villarreal o Empate
📉 Total de apuestas limitadas: 8
✅ Apuestas finales después de validación: 42
```

---

### **CAPA 2: Backend (betOption.service.ts)**

Ubicación: `backend/src/services/betOption.service.ts` líneas ~29-180

**Qué hace:**
1. Recibe opciones del frontend
2. **Filtra** "Doble oportunidad" (tipo prohibido)
3. **Deduplica** por `(matchId, betType, betLabel)`
4. **Agrupa** por `(leagueId, matchId, betType)`
5. **Limita** automáticamente:
   - `betType === 'Resultado'` → primeras 3 opciones
   - `betType !== 'Resultado'` → primeras 2 opciones
6. **Valida** antes de guardar y descarta opciones excedentes
7. **NO lanza errores** - la app continúa funcionando normalmente

**Logs:**
```
🔍 Iniciando validación de 45 opciones para liga abc123, jornada 15
⚠️  Filtradas 3 opciones de "Doble oportunidad"
🔄 Deduplicadas 2 opciones idénticas
⚠️  Liga abc123, Match 1149380, Tipo "Resultado": 4 opciones encontradas, límite: 3. Descartando 1 opciones.
   ✅ Manteniendo: Ganará Villarreal, Empate, Ganará Girona
   ❌ Descartando: Villarreal o Empate
📉 Total de opciones descartadas por límites: 3
⚠️  Opción descartada por límite: Liga abc123, Match 1149380, Tipo "Resultado", Label "Doble oportunidad" (ya hay 3 opciones)
✅ 40 opciones validadas y listas para guardar
🗑️  Eliminadas 38 opciones antiguas
✅ Guardadas 40 opciones de apuesta validadas
```

**Comportamiento:** El backend **NO lanza errores**. Si detecta opciones que exceden los límites, simplemente las descarta y continúa guardando las válidas.

---

### **CAPA 3: Base de Datos (Prisma)**

**ID Único:**
```typescript
id: `${leagueId}_${jornada}_${matchId}_${betType}_${betLabel}`.replace(/\s+/g, '_')
```

Esto garantiza que no puede haber dos registros idénticos con el mismo:
- `leagueId`
- `jornada`
- `matchId`
- `betType`
- `betLabel`

---

## 🔍 Verificación

### **1. Verificar violaciones actuales**

```bash
cd backend
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Violaciones de Resultado (>3)
  const resultado = await prisma.\$queryRaw\`
    SELECT \"leagueId\", \"matchId\", \"betType\", COUNT(*) as cnt
    FROM bet_option
    WHERE \"betType\" = 'Resultado'
    GROUP BY \"leagueId\", \"matchId\", \"betType\"
    HAVING COUNT(*) > 3
  \`;
  
  // Violaciones de otros tipos (>2)
  const otros = await prisma.\$queryRaw\`
    SELECT \"leagueId\", \"matchId\", \"betType\", COUNT(*) as cnt
    FROM bet_option
    WHERE \"betType\" != 'Resultado'
    GROUP BY \"leagueId\", \"matchId\", \"betType\"
    HAVING COUNT(*) > 2
  \`;
  
  console.log('❌ Violaciones de Resultado:', resultado.length);
  console.log('❌ Violaciones de otros tipos:', otros.length);
  
  if (resultado.length > 0) console.log(resultado);
  if (otros.length > 0) console.log(otros);
  
  await prisma.\$disconnect();
}

check();
"
```

### **2. Consulta SQL directa**

```sql
-- Ver resumen por partido
SELECT 
  "leagueId",
  "matchId",
  "betType",
  COUNT(*) as total,
  CASE 
    WHEN "betType" = 'Resultado' AND COUNT(*) > 3 THEN '❌ VIOLACIÓN'
    WHEN "betType" != 'Resultado' AND COUNT(*) > 2 THEN '❌ VIOLACIÓN'
    ELSE '✅ OK'
  END as estado
FROM bet_option
GROUP BY "leagueId", "matchId", "betType"
ORDER BY "leagueId", "matchId";
```

Ver script completo: `backend/scripts/verify-bet-constraints.sql`

---

## 🧪 Testing

### **Test 1: Generar apuestas con límites**

1. Ir al panel admin de una liga
2. Clic en "Generar apuestas jornada"
3. Observar logs en consola del frontend
4. Verificar que los logs muestren limitación automática

### **Test 2: Verificar en base de datos**

```sql
-- Debe devolver 0 filas
SELECT * FROM bet_option
WHERE "leagueId" = 'TU_LIGA_ID'
  AND "jornada" = 15
  AND (
    ("betType" = 'Resultado' AND id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "matchId", "betType" ORDER BY "createdAt") as rn
        FROM bet_option
        WHERE "leagueId" = 'TU_LIGA_ID' AND "jornada" = 15 AND "betType" = 'Resultado'
      ) t WHERE rn > 3
    ))
    OR
    ("betType" != 'Resultado' AND id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "matchId", "betType" ORDER BY "createdAt") as rn
        FROM bet_option
        WHERE "leagueId" = 'TU_LIGA_ID' AND "jornada" = 15 AND "betType" != 'Resultado'
      ) t WHERE rn > 2
    ))
  );
```

---

## 🐛 Troubleshooting

### Problema: "Violaciones encontradas después de implementación"

**Causa:** Registros antiguos creados antes de implementar la restricción

**Solución:**
```sql
-- 1. Backup de la tabla
CREATE TABLE bet_option_backup AS SELECT * FROM bet_option;

-- 2. Eliminar excedentes de "Resultado" (mantener primeros 3)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "leagueId", "matchId", "betType" 
    ORDER BY "createdAt"
  ) as rn
  FROM bet_option WHERE "betType" = 'Resultado'
)
DELETE FROM bet_option WHERE id IN (
  SELECT id FROM ranked WHERE rn > 3
);

-- 3. Eliminar excedentes de otros tipos (mantener primeros 2)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "leagueId", "matchId", "betType" 
    ORDER BY "createdAt"
  ) as rn
  FROM bet_option WHERE "betType" != 'Resultado'
)
DELETE FROM bet_option WHERE id IN (
  SELECT id FROM ranked WHERE rn > 2
);
```

### Problema: "Error BET_LIMIT_EXCEEDED al guardar"

**Causa:** El frontend envió datos que violan la restricción (no debería pasar)

**Solución:**
1. Verificar que el código del frontend esté actualizado
2. Limpiar caché del navegador/app
3. Ver logs del frontend para entender qué se está enviando

---

## 📝 Changelog

### 2025-10-21 - Implementación completa
- ✅ Filtrado y limitación en frontend (`FutbolService.ts`)
- ✅ Validación y limitación en backend (`betOption.service.ts`)
- ✅ Deduplicación automática en ambas capas
- ✅ Logs detallados para debugging
- ✅ Script SQL de verificación (`verify-bet-constraints.sql`)
- ✅ Documentación completa

---

## 🎯 Resumen

**Garantías del sistema:**

1. ✅ **Frontend filtra** antes de enviar → reduce carga de red
2. ✅ **Backend valida** antes de guardar → garantiza integridad
3. ✅ **ID único** previene duplicados → constraint de DB
4. ✅ **Logs detallados** → fácil debugging
5. ✅ **Script de verificación** → auditoría post-implementación

**Nunca se guardará en la BD:**
- ❌ Más de 3 opciones de "Resultado" por `(leagueId, matchId)`
- ❌ Más de 2 opciones de otros tipos por `(leagueId, matchId, betType)`
- ❌ Apuestas de "Doble oportunidad"
- ❌ Apuestas duplicadas con mismo `(matchId, betType, betLabel)`
