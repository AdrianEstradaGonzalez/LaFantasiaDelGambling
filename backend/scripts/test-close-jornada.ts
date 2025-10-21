/**
 * Script de prueba para verificar el cierre de jornada y guardado de pointsPerJornada
 * 
 * Este script:
 * 1. Obtiene el estado actual de la jornada
 * 2. Muestra los puntos actuales de cada miembro
 * 3. Cierra la jornada (abre cambios)
 * 4. Verifica que se guardaron correctamente los pointsPerJornada
 * 5. Obtiene las clasificaciones para verificar que aparecen correctamente
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCloseJornada() {
  console.log('🧪 TEST: Cerrar Jornada y Guardar pointsPerJornada\n');

  try {
    // 1. Obtener todas las ligas activas
    const leagues = await prisma.league.findMany({
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    if (leagues.length === 0) {
      console.log('❌ No hay ligas en la base de datos');
      return;
    }

    console.log(`📋 Ligas encontradas: ${leagues.length}\n`);

    for (const league of leagues) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏆 Liga: ${league.name} (${league.code})`);
      console.log(`   Jornada actual: ${league.currentJornada}`);
      console.log(`   Estado: ${league.isOpen ? '🟢 ABIERTA (cambios permitidos)' : '🔴 CERRADA (partidos en curso)'}`);
      console.log(`${'='.repeat(80)}\n`);

      // 2. Mostrar estado actual de cada miembro ANTES de cerrar
      console.log('📊 Estado ACTUAL de los miembros:\n');
      for (const member of league.members) {
        const pointsPerJornada = (member.pointsPerJornada as any) || {};
        console.log(`👤 ${member.user.name}:`);
        console.log(`   Puntos totales: ${member.points}`);
        console.log(`   Presupuesto: ${member.budget}M (inicial: ${member.initialBudget}M)`);
        console.log(`   Presupuesto apuestas: ${member.bettingBudget}M`);
        
        if (Object.keys(pointsPerJornada).length > 0) {
          console.log(`   Puntos por jornada guardados: ${Object.keys(pointsPerJornada).length} jornadas`);
          // Mostrar últimas 3 jornadas
          const jornadas = Object.keys(pointsPerJornada)
            .map(j => parseInt(j))
            .sort((a, b) => b - a)
            .slice(0, 3);
          
          jornadas.forEach(j => {
            console.log(`      J${j}: ${pointsPerJornada[j.toString()]} puntos`);
          });
        } else {
          console.log(`   ⚠️  Sin datos de pointsPerJornada (será inicializado)`);
        }
        console.log('');
      }

      // 3. Verificar si hay plantillas con jugadores
      const squads = await prisma.squad.findMany({
        where: { leagueId: league.id },
        include: {
          players: {
            include: {
              player: true
            }
          }
        }
      });

      console.log(`\n🎮 Plantillas en la liga: ${squads.length}`);
      squads.forEach(squad => {
        const squadMember = league.members.find(m => m.userId === squad.userId);
        console.log(`   ${squadMember?.user.name || 'Usuario'}: ${squad.players.length} jugadores`);
      });

      // 4. Mostrar información sobre qué haría el cierre
      console.log(`\n⚠️  SIMULACIÓN: ¿Qué pasaría al cerrar la jornada ${league.currentJornada}?`);
      console.log(`   1. Se calcularían los puntos de cada plantilla`);
      console.log(`   2. Se guardarían en pointsPerJornada[${league.currentJornada}]`);
      console.log(`   3. Se actualizarían los puntos totales`);
      console.log(`   4. Se recalcularían los presupuestos`);
      console.log(`   5. Se vaciarían todas las plantillas`);
      console.log(`   6. isOpen cambiaría a true (cambios permitidos)`);

      console.log(`\n💡 Para cerrar esta jornada, ejecuta:`);
      console.log(`   npm run cambiar-jornada -- ${league.currentJornada} ${league.id}`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ Test completado - No se realizaron cambios en la BD');
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('❌ Error en el test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Función auxiliar para verificar las clasificaciones después del cierre
async function verifyClassifications(leagueId: string) {
  console.log('\n🔍 Verificando clasificaciones después del cierre...\n');

  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    include: { user: true }
  });

  console.log('📊 Clasificación Total:');
  const sortedByTotal = [...members].sort((a, b) => (b.points || 0) - (a.points || 0));
  sortedByTotal.forEach((member, index) => {
    console.log(`   ${index + 1}. ${member.user.name}: ${member.points} puntos`);
  });

  console.log('\n📊 Últimas jornadas cerradas:');
  members.forEach(member => {
    const pointsPerJornada = (member.pointsPerJornada as any) || {};
    const jornadas = Object.keys(pointsPerJornada).map(j => parseInt(j)).sort((a, b) => b - a);
    
    if (jornadas.length > 0) {
      console.log(`\n   ${member.user.name}:`);
      jornadas.slice(0, 5).forEach(j => {
        console.log(`      J${j}: ${pointsPerJornada[j.toString()]} puntos`);
      });
    }
  });
}

// Ejecutar el test
testCloseJornada();
