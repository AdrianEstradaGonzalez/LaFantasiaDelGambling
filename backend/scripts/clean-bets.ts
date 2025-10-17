import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanBets() {
  try {
    console.log('🗑️  Iniciando limpieza de apuestas...\n');

    // Contar apuestas antes de limpiar
    const betCount = await prisma.bet.count();
    const betOptionCount = await prisma.bet_option.count();

    console.log(`📊 Estado actual:`);
    console.log(`   - Apuestas (Bet): ${betCount}`);
    console.log(`   - Opciones de apuestas (bet_option): ${betOptionCount}\n`);

    if (betCount === 0 && betOptionCount === 0) {
      console.log('✅ No hay apuestas para limpiar.');
      return;
    }

    // Confirmar antes de borrar
    console.log('⚠️  ADVERTENCIA: Esta acción eliminará TODAS las apuestas y opciones de apuestas.');
    console.log('   Las apuestas de los usuarios se perderán.\n');

    // Eliminar todas las apuestas
    console.log('🗑️  Eliminando apuestas...');
    const deletedBets = await prisma.bet.deleteMany({});
    console.log(`   ✅ ${deletedBets.count} apuestas eliminadas\n`);

    // Eliminar todas las opciones de apuestas
    console.log('🗑️  Eliminando opciones de apuestas...');
    const deletedOptions = await prisma.bet_option.deleteMany({});
    console.log(`   ✅ ${deletedOptions.count} opciones de apuestas eliminadas\n`);

    console.log('🎉 Limpieza completada exitosamente!\n');
    console.log('📊 Estado final:');
    console.log(`   - Apuestas: ${await prisma.bet.count()}`);
    console.log(`   - Opciones de apuestas: ${await prisma.bet_option.count()}\n`);

  } catch (error) {
    console.error('❌ Error limpiando apuestas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
cleanBets()
  .then(() => {
    console.log('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error);
    process.exit(1);
  });
