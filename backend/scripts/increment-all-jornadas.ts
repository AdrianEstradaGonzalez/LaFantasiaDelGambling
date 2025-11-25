import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function incrementAllJornadas() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('⏭️  INCREMENTANDO JORNADAS DE TODAS LAS LIGAS');
    console.log('═'.repeat(70) + '\n');

    const leagues = await prisma.league.findMany();

    for (const league of leagues) {
      const oldJornada = league.currentJornada;
      const newJornada = oldJornada + 1;

      await prisma.league.update({
        where: { id: league.id },
        data: { currentJornada: newJornada }
      });

      console.log(`✅ ${league.name}: J${oldJornada} → J${newJornada}`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ ${leagues.length} ligas actualizadas`);
    console.log('═'.repeat(70) + '\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

incrementAllJornadas();
