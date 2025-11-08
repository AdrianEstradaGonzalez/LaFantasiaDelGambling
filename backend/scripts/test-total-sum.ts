import { PrismaClient } from '@prisma/client';
import { LeagueService } from '../src/services/league.service.js';

(async function main(){
  const prisma = new PrismaClient();
  try {
    const league = await prisma.league.findFirst({ 
      where: { name: 'CBO' },
      include: { members: true }
    });

    if (!league) {
      console.log('Liga CBO no encontrada');
      process.exit(0);
    }

    console.log(`\n🔍 Testing league: ${league.name}`);
    console.log(`   Jornada: ${league.currentJornada}, Estado: ${league.jornadaStatus}\n`);

    const result = await LeagueService.getAllClassifications(league.id);

    console.log('\n=== VERIFICACIÓN TOTAL vs (HISTÓRICO + JORNADA ACTUAL) ===\n');

    for (const member of league.members.slice(0, 8)) {
      const user = await prisma.user.findUnique({ where: { id: member.userId }, select: { name: true } });
      const userName = user?.name || 'Usuario';
      
      const historico = member.points || 0;
      const jornadaActual = result.classifications[league.currentJornada || 12].find((m: any) => m.userId === member.userId)?.points || 0;
      const totalMostrado = result.classifications.Total.find((m: any) => m.userId === member.userId)?.points || 0;
      const esperado = historico + jornadaActual;
      
      const ok = totalMostrado === esperado ? '✅' : '❌';
      console.log(`${ok} ${userName}:`);
      console.log(`   Histórico: ${historico}`);
      console.log(`   J${league.currentJornada}: ${jornadaActual}`);
      console.log(`   Total: ${totalMostrado} (esperado: ${esperado})`);
      console.log();
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
