import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteJornada16() {
  try {
    console.log('🗑️  Eliminando todas las apuestas y opciones de jornada 15...\n');

    // Eliminar apuestas simples de jornada 15
    const deletedBets = await prisma.bet.deleteMany({
      where: {
        jornada: 15
      }
    });

    console.log(`✅ ${deletedBets.count} apuestas simples eliminadas`);

    // Eliminar combis de jornada 15
    const deletedCombis = await prisma.betCombi.deleteMany({
      where: {
        jornada: 15
      }
    });

    console.log(`✅ ${deletedCombis.count} combis eliminadas`);

    // Eliminar opciones de apuesta de jornada 15
    const deletedOptions = await prisma.bet_option.deleteMany({
      where: {
        jornada: 15
      }
    });

    console.log(`✅ ${deletedOptions.count} opciones de apuesta eliminadas`);

    console.log('\n✨ Limpieza de jornada 15 completada exitosamente');

  } catch (error) {
    console.error('❌ Error al eliminar datos de jornada 15:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteJornada16();
