-- Sistema de Tickets + Recompensa Fija
-- ======================================
-- TICKETS:
--   - 3 tickets base por jornada
--   - +1 ticket por cada 2 apuestas acertadas
--   - Máximo 10 tickets
-- PRESUPUESTO:
--   - 500M base
--   - +80M por cada apuesta ganada (fijo, no cuota)
--   - + puntos de plantilla
-- ======================================

-- Añadir nuevas columnas con valores por defecto (sin perder datos)
DO $$ 
BEGIN
  -- Añadir availableTickets si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'league_member' AND column_name = 'availableTickets'
  ) THEN
    ALTER TABLE "league_member" ADD COLUMN "availableTickets" INTEGER NOT NULL DEFAULT 3;
    
    -- Inicializar con 3 tickets para todos los usuarios existentes
    RAISE NOTICE 'Columna availableTickets creada. Todos los usuarios tienen 3 tickets.';
  END IF;

  -- Añadir ticketsEarnedThisJornada si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'league_member' AND column_name = 'ticketsEarnedThisJornada'
  ) THEN
    ALTER TABLE "league_member" ADD COLUMN "ticketsEarnedThisJornada" INTEGER NOT NULL DEFAULT 0;
    
    RAISE NOTICE 'Columna ticketsEarnedThisJornada creada. Inicializada en 0.';
  END IF;
END $$;

-- Verificación final
COMMENT ON COLUMN "league_member"."availableTickets" IS 'Tickets disponibles: MIN(3 + floor(wonBets / 2), 10)';
COMMENT ON COLUMN "league_member"."ticketsEarnedThisJornada" IS 'Bonus ganados esta jornada: floor(wonBets / 2)';
COMMENT ON COLUMN "league_member"."budget" IS 'Presupuesto: 500 + (wonBets × 80) + squadPoints';
