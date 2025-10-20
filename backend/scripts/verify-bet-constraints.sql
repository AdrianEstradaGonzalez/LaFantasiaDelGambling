-- Script para verificar las restricciones de bet_option
-- REGLA: Para cada (leagueId, matchId):
--   - Máximo 3 registros con betType = 'Resultado'
--   - Máximo 2 registros para cualquier otro betType

-- ======================================
-- 1. VERIFICAR VIOLACIONES DE "RESULTADO"
-- ======================================
SELECT 
  "leagueId",
  "matchId",
  "betType",
  COUNT(*) as cantidad,
  STRING_AGG("betLabel", ' | ') as labels
FROM bet_option
WHERE "betType" = 'Resultado'
GROUP BY "leagueId", "matchId", "betType"
HAVING COUNT(*) > 3
ORDER BY cantidad DESC;

-- Si este query devuelve filas, HAY VIOLACIONES (más de 3 "Resultado" por match)

-- ======================================
-- 2. VERIFICAR VIOLACIONES DE OTROS TIPOS
-- ======================================
SELECT 
  "leagueId",
  "matchId",
  "betType",
  COUNT(*) as cantidad,
  STRING_AGG("betLabel", ' | ') as labels
FROM bet_option
WHERE "betType" != 'Resultado'
GROUP BY "leagueId", "matchId", "betType"
HAVING COUNT(*) > 2
ORDER BY cantidad DESC;

-- Si este query devuelve filas, HAY VIOLACIONES (más de 2 opciones de otros tipos por match)

-- ======================================
-- 3. RESUMEN GENERAL POR LIGA Y PARTIDO
-- ======================================
SELECT 
  "leagueId",
  "jornada",
  "matchId",
  "homeTeam",
  "awayTeam",
  "betType",
  COUNT(*) as total_opciones,
  CASE 
    WHEN "betType" = 'Resultado' THEN 3
    ELSE 2
  END as limite_permitido,
  CASE 
    WHEN ("betType" = 'Resultado' AND COUNT(*) > 3) THEN '❌ VIOLACIÓN'
    WHEN ("betType" != 'Resultado' AND COUNT(*) > 2) THEN '❌ VIOLACIÓN'
    ELSE '✅ OK'
  END as estado
FROM bet_option
GROUP BY "leagueId", "jornada", "matchId", "homeTeam", "awayTeam", "betType"
ORDER BY "leagueId", "jornada", "matchId", "betType";

-- ======================================
-- 4. CONTAR TOTAL DE VIOLACIONES
-- ======================================
SELECT 
  '❌ Violaciones de Resultado (>3)' as tipo,
  COUNT(*) as total
FROM (
  SELECT "leagueId", "matchId", "betType"
  FROM bet_option
  WHERE "betType" = 'Resultado'
  GROUP BY "leagueId", "matchId", "betType"
  HAVING COUNT(*) > 3
) as violations_resultado

UNION ALL

SELECT 
  '❌ Violaciones de Otros tipos (>2)' as tipo,
  COUNT(*) as total
FROM (
  SELECT "leagueId", "matchId", "betType"
  FROM bet_option
  WHERE "betType" != 'Resultado'
  GROUP BY "leagueId", "matchId", "betType"
  HAVING COUNT(*) > 2
) as violations_otros;

-- ======================================
-- 5. LIMPIAR VIOLACIONES (OPCIONAL - CUIDADO!)
-- ======================================
-- Este query elimina los registros excedentes manteniendo solo los primeros N
-- ¡EJECUTAR CON PRECAUCIÓN!

-- Para "Resultado" (mantener solo 3)
/*
WITH ranked_resultado AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "leagueId", "matchId", "betType" 
      ORDER BY "createdAt" ASC
    ) as rn
  FROM bet_option
  WHERE "betType" = 'Resultado'
)
DELETE FROM bet_option
WHERE id IN (
  SELECT id FROM ranked_resultado WHERE rn > 3
);
*/

-- Para otros tipos (mantener solo 2)
/*
WITH ranked_otros AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "leagueId", "matchId", "betType" 
      ORDER BY "createdAt" ASC
    ) as rn
  FROM bet_option
  WHERE "betType" != 'Resultado'
)
DELETE FROM bet_option
WHERE id IN (
  SELECT id FROM ranked_otros WHERE rn > 2
);
*/
