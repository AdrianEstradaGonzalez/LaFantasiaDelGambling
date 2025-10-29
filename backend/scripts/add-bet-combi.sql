-- Add combiId to bet table
ALTER TABLE bet ADD COLUMN IF NOT EXISTS "combiId" TEXT;

-- Create bet_combi table
CREATE TABLE IF NOT EXISTS bet_combi (
  id TEXT PRIMARY KEY,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  jornada INTEGER NOT NULL,
  "totalOdd" DOUBLE PRECISION NOT NULL,
  amount INTEGER NOT NULL,
  "potentialWin" INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evaluatedAt" TIMESTAMP(6),
  FOREIGN KEY ("leagueId", "userId") REFERENCES league_member("leagueId", "userId") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS bet_combi_leagueId_userId_idx ON bet_combi("leagueId", "userId");
CREATE INDEX IF NOT EXISTS bet_combi_jornada_idx ON bet_combi(jornada);
CREATE INDEX IF NOT EXISTS bet_combi_status_idx ON bet_combi(status);
CREATE INDEX IF NOT EXISTS bet_combiId_idx ON bet("combiId");

-- Add foreign key for combiId
ALTER TABLE bet ADD CONSTRAINT IF NOT EXISTS bet_combiId_fkey 
  FOREIGN KEY ("combiId") REFERENCES bet_combi(id) ON DELETE CASCADE;
