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

ALTER TABLE "league_member" ADD COLUMN IF NOT EXISTS "availableTickets" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "league_member" ADD COLUMN IF NOT EXISTS "ticketsEarnedThisJornada" INTEGER NOT NULL DEFAULT 0;

-- COMMENT: 
-- availableTickets = MIN(3 + floor(wonBets / 2), 10)
-- budget = 500 + (wonBets × 80) + squadPoints
