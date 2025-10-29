import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addBetCombiTables() {
  try {
    console.log('📊 Adding bet_combi table and combiId to bet...');
    
    // Add combiId column to bet
    await prisma.$executeRawUnsafe(`
      ALTER TABLE bet ADD COLUMN IF NOT EXISTS "combiId" TEXT;
    `);
    
    console.log('✅ combiId column added to bet');
    
    // Create bet_combi table
    await prisma.$executeRawUnsafe(`
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
        CONSTRAINT "bet_combi_leagueId_userId_fkey" 
          FOREIGN KEY ("leagueId", "userId") 
          REFERENCES "LeagueMember"("leagueId", "userId") 
          ON DELETE CASCADE
      );
    `);
    
    console.log('✅ bet_combi table created');
    
    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS bet_combi_leagueId_userId_idx ON bet_combi("leagueId", "userId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS bet_combi_jornada_idx ON bet_combi(jornada);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS bet_combi_status_idx ON bet_combi(status);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS bet_combiId_idx ON bet("combiId");
    `);
    
    console.log('✅ Indexes created');
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addBetCombiTables();
