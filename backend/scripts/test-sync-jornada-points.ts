/**
 * TEST: Sincronización de puntos de jornada
 * 
 * Prueba el comportamiento de syncCurrentJornadaPoints en dos escenarios:
 * 1. J12 (ya tiene puntos sincronizados) → debería SKIPEAR todos
 * 2. J11 (puede tener puntos desactualizados) → debería verificar y actualizar si difieren
 * 
 * ⚠️ MODO SOLO LECTURA: No modifica la BD, solo muestra qué haría
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

interface SyncResult {
  userId: string;
  userName: string;
  jornada: number;
  currentPoints: number;
  calculatedPoints: number;
  wouldUpdate: boolean;
  reason: string;
}

/**
 * Simula el cálculo de puntos para una jornada (mismo algoritmo que getAllClassifications)
 */
async function calculateJornadaPoints(
  userId: string,
  leagueId: string,
  jornada: number
): Promise<{ points: number; reason: string }> {
  
  // 1. Obtener plantilla del usuario
  const squad = await prisma.squad.findUnique({
    where: {
      userId_leagueId: { userId, leagueId }
    },
    include: {
      players: true
    }
  });

  // Si no tiene plantilla o tiene < 11 jugadores → 0 puntos
  if (!squad) {
    return { points: 0, reason: 'Sin plantilla' };
  }

  if (squad.players.length < 11) {
    return { points: 0, reason: `Solo ${squad.players.length} jugadores (mínimo 11)` };
  }

  // 2. Obtener estadísticas de todos los jugadores para esta jornada
  const playerIds = squad.players.map((p: any) => p.playerId);
  const playerStats = await prisma.playerStats.findMany({
    where: {
      playerId: { in: playerIds },
      jornada: jornada,
      season: 2025
    }
  });

  // 3. Calcular puntos totales
  let sumPoints = 0;
  let captainId: number | null = null;

  // Encontrar el capitán
  const captainPlayer = squad.players.find((p: any) => p.isCaptain);
  if (captainPlayer) {
    captainId = captainPlayer.playerId;
  }

  // Sumar puntos de cada jugador
  let captainBonus = 0;
  playerStats.forEach((stats: any) => {
    const points = stats.totalPoints || 0;
    
    if (captainId && stats.playerId === captainId) {
      sumPoints += points * 2;
      captainBonus = points; // Guardamos el bonus para el mensaje
    } else {
      sumPoints += points;
    }
  });

  const reason = captainBonus > 0 
    ? `${squad.players.length} jugadores, capitán +${captainBonus}pts`
    : `${squad.players.length} jugadores`;

  return { points: sumPoints, reason };
}

/**
 * Prueba de sincronización para una liga y jornada
 */
async function testSyncForJornada(leagueId: string, leagueName: string, jornada: number) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 PRUEBA: ${leagueName} - Jornada ${jornada}`);
  console.log(`${'='.repeat(80)}\n`);

  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    include: { user: true }
  });

  const results: SyncResult[] = [];
  let wouldUpdate = 0;
  let wouldSkip = 0;

  for (const member of members) {
    const currentPointsPerJornada = (member.pointsPerJornada as Record<string, number>) || {};
    const currentJornadaPoints = currentPointsPerJornada[jornada.toString()] || 0;

    // Calcular puntos usando el mismo algoritmo que syncCurrentJornadaPoints
    const { points: calculatedPoints, reason } = await calculateJornadaPoints(
      member.userId,
      leagueId,
      jornada
    );

    const needsUpdate = currentJornadaPoints !== calculatedPoints;
    
    if (needsUpdate) {
      wouldUpdate++;
    } else {
      wouldSkip++;
    }

    results.push({
      userId: member.userId,
      userName: member.user.name || 'Usuario sin nombre',
      jornada,
      currentPoints: currentJornadaPoints,
      calculatedPoints,
      wouldUpdate: needsUpdate,
      reason
    });
  }

  // Mostrar resultados
  console.log(`📈 RESUMEN:`);
  console.log(`   Total usuarios: ${members.length}`);
  console.log(`   🔄 Necesitan actualización: ${wouldUpdate}`);
  console.log(`   ✅ Ya están correctos: ${wouldSkip}`);
  console.log(`\n📋 DETALLE:\n`);

  // Ordenar: primero los que necesitan update, luego alfabético
  results.sort((a, b) => {
    if (a.wouldUpdate !== b.wouldUpdate) {
      return a.wouldUpdate ? -1 : 1;
    }
    return a.userName.localeCompare(b.userName);
  });

  for (const result of results) {
    const icon = result.wouldUpdate ? '🔄' : '✅';
    const status = result.wouldUpdate 
      ? `${result.currentPoints} → ${result.calculatedPoints}` 
      : `${result.currentPoints} (OK)`;
    
    console.log(`   ${icon} ${result.userName.padEnd(30)} J${jornada}: ${status.padEnd(15)} [${result.reason}]`);
  }

  return { wouldUpdate, wouldSkip, total: members.length };
}

/**
 * Función principal
 */
async function main() {
  console.log('\n🧪 TEST DE SINCRONIZACIÓN DE PUNTOS DE JORNADA');
  console.log('⚠️  MODO SOLO LECTURA - No se modifica la base de datos\n');

  try {
    // Obtener una liga de prueba (usamos CBO que sabemos que existe)
    const league = await prisma.league.findFirst({
      where: { name: 'CBO' }
    });

    if (!league) {
      console.error('❌ No se encontró la liga CBO');
      return;
    }

    console.log(`🏆 Liga de prueba: ${league.name} (ID: ${league.id})`);
    console.log(`📅 Jornada actual: ${league.currentJornada}`);

    // TEST 1: Jornada 12 (ya sincronizada con el script)
    console.log('\n' + '═'.repeat(80));
    console.log('TEST 1: Jornada 12 (puntos ya sincronizados con script)');
    console.log('Expectativa: Todos los usuarios deberían estar CORRECTOS (skip)');
    console.log('═'.repeat(80));
    
    const test1 = await testSyncForJornada(league.id, league.name, 12);

    // TEST 2: Jornada 11 (para verificar el comportamiento con jornada anterior)
    console.log('\n' + '═'.repeat(80));
    console.log('TEST 2: Jornada 11 (jornada anterior cerrada)');
    console.log('Expectativa: Puede haber diferencias si no se sincronizó antes');
    console.log('═'.repeat(80));
    
    const test2 = await testSyncForJornada(league.id, league.name, 11);

    // Resumen final
    console.log('\n' + '═'.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('═'.repeat(80));
    console.log(`\nJ12 (ya sincronizada):`);
    console.log(`   ✅ Correctos: ${test1.wouldSkip}/${test1.total}`);
    console.log(`   🔄 Necesitan sync: ${test1.wouldUpdate}/${test1.total}`);
    
    console.log(`\nJ11 (anterior):`);
    console.log(`   ✅ Correctos: ${test2.wouldSkip}/${test2.total}`);
    console.log(`   🔄 Necesitan sync: ${test2.wouldUpdate}/${test2.total}`);

    console.log('\n✅ Conclusión:');
    if (test1.wouldUpdate === 0) {
      console.log('   • J12: Todos los puntos ya están correctos → closeJornada() los skipearía');
    } else {
      console.log('   • J12: Algunos puntos necesitan actualización → closeJornada() los actualizaría');
    }
    
    if (test2.wouldUpdate > 0) {
      console.log(`   • J11: ${test2.wouldUpdate} usuarios necesitarían sincronización si se cerrara esa jornada`);
    } else {
      console.log('   • J11: Todos los puntos correctos');
    }

    console.log('\n💡 Comportamiento de closeJornada():');
    console.log('   1. SIEMPRE ejecuta syncCurrentJornadaPoints() en STEP 0');
    console.log('   2. Si los puntos ya están correctos → SKIP (sin actualización)');
    console.log('   3. Si los puntos difieren → ACTUALIZA pointsPerJornada y points');
    console.log('   4. Resultado: IDEMPOTENTE → mismo resultado si se ejecuta 1 o N veces\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
