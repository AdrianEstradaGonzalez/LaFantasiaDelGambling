import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanPlayerStats() {
  try {
    console.log('🗑️  Iniciando limpieza de PlayerStats...');

    const result = await prisma.playerStats.deleteMany({});

    console.log(`✅ ${result.count} registros eliminados de PlayerStats`);
    console.log('✅ Tabla PlayerStats limpiada correctamente');

  } catch (error) {
    console.error('❌ Error al limpiar PlayerStats:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanPlayerStats();
