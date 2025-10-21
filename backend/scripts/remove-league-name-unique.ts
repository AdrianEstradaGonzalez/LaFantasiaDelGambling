import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Removing unique constraint from League.name...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "League" DROP CONSTRAINT IF EXISTS "League_name_key";
    `);
    
    console.log('✅ Unique constraint removed successfully!');
    console.log('Now multiple leagues can have the same name.');
    console.log('Only the code field remains unique for each league.');
  } catch (error) {
    console.error('❌ Error removing constraint:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
