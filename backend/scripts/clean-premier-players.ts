import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanPremierPlayers() {
  try {
    console.log('🗑️  Vaciando tabla player_premier...\n');

    const result = await (prisma as any).playerPremier.deleteMany({});

    console.log(`✅ Tabla player_premier vaciada exitosamente`);
    console.log(`📊 Registros eliminados: ${result.count}\n`);

  } catch (error) {
    console.error('❌ Error al vaciar la tabla:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanPremierPlayers()
  .then(() => {
    console.log('✨ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
