import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function addIsPremiumColumn() {
    try {
        console.log('📊 Adding isPremium column to league table...');
        // Execute the SQL directly
        await prisma.$executeRawUnsafe(`
      ALTER TABLE league ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;
    `);
        console.log('✅ Column added successfully');
        // Update existing leagues
        console.log('🔄 Updating existing leagues...');
        await prisma.$executeRawUnsafe(`
      UPDATE league SET "isPremium" = true WHERE division = 'segunda';
    `);
        console.log('✅ Existing leagues updated');
        // Verify
        const leagues = await prisma.$queryRawUnsafe(`
      SELECT id, name, division, "isPremium" FROM league LIMIT 10;
    `);
        console.log('📋 Sample leagues:', leagues);
        console.log('✅ Migration completed successfully');
    }
    catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
addIsPremiumColumn();
