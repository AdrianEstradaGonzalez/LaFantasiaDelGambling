import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanPremierStats() {
  try {
    console.log('🗑️  Vaciando tabla player_premier_stats...\n');

    const result = await (prisma as any).playerPremierStats.deleteMany({});

    console.log(`✅ Tabla player_premier_stats vaciada exitosamente`);
    console.log(`📊 Registros eliminados: ${result.count}\n`);

  } catch (error) {
    console.error('❌ Error al vaciar la tabla:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanPremierStats()
  .then(() => {
    console.log('✨ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
