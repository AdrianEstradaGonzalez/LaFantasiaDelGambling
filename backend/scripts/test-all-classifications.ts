import { PrismaClient } from '@prisma/client';
import { LeagueService } from '../src/services/league.service.js';

const prisma = new PrismaClient();

async function testAllClassifications() {
  console.log('🔍 Testeando clasificaciones: J11, J12 (actual) y Total\n');

  // Obtener liga CBO
  const cboLeague = await prisma.league.findFirst({
    where: { name: 'CBO' }
  });

  if (!cboLeague) {
    console.log('❌ Liga CBO no encontrada');
    return;
  }

  console.log(`🏆 Liga: ${cboLeague.name}`);
  console.log(`   Jornada actual: ${cboLeague.currentJornada}`);
  console.log(`   Estado: ${cboLeague.jornadaStatus}\n`);

  // Obtener todas las clasificaciones
  const result = await LeagueService.getAllClassifications(cboLeague.id);
  const { classifications } = result;

  // Usuarios de interés
  const testUsers = ['F.C.Estrada', 'Valen Team', 'Charro'];

  console.log('═══════════════════════════════════════════════════════════\n');
  
  for (const userName of testUsers) {
    console.log(`\n👤 ${userName}:`);
    
    // Jornada 11
    const j11Data = classifications[11]?.find((m: any) => m.userName === userName);
    const j11Points = j11Data?.points || 0;
    console.log(`   Jornada 11: ${j11Points} pts`);
    
    // Jornada 12 (actual, en tiempo real)
    const j12Data = classifications[12]?.find((m: any) => m.userName === userName);
    const j12Points = j12Data?.points || 0;
    console.log(`   Jornada 12: ${j12Points} pts (en tiempo real)`);
    
    // Total
    const totalData = classifications.Total?.find((m: any) => m.userName === userName);
    const totalPoints = totalData?.points || 0;
    console.log(`   Total:      ${totalPoints} pts`);
    
    // Verificación
    const expectedTotal = j11Points + j12Points;
    const isCorrect = totalPoints === expectedTotal;
    console.log(`   Verificación: ${totalPoints} = ${j11Points} + ${j12Points} ${isCorrect ? '✅' : '❌'}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Mostrar top 5 de cada clasificación
  console.log('\n📊 TOP 5 JORNADA 11:');
  classifications[11]?.slice(0, 5).forEach((m: any, i: number) => {
    console.log(`   ${i + 1}. ${m.userName}: ${m.points} pts`);
  });

  console.log('\n📊 TOP 5 JORNADA 12 (ACTUAL):');
  classifications[12]?.slice(0, 5).forEach((m: any, i: number) => {
    console.log(`   ${i + 1}. ${m.userName}: ${m.points} pts`);
  });

  console.log('\n📊 TOP 5 TOTAL:');
  classifications.Total?.slice(0, 5).forEach((m: any, i: number) => {
    console.log(`   ${i + 1}. ${m.userName}: ${m.points} pts`);
  });
}

testAllClassifications()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
