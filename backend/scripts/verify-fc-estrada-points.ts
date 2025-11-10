import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function verifyFCEstradaPoints() {
  try {
    console.log('\n🔍 Verificando puntos de FC Estrada en liga CBO...\n');

    // Buscar FC Estrada
    const user = await prisma.user.findFirst({
      where: { name: 'F.C.Estrada' }
    });

    if (!user) {
      console.log('❌ Usuario FC Estrada no encontrado');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.name} (${user.id})`);

    // Buscar liga CBO
    const league = await prisma.league.findFirst({
      where: { name: 'CBO' }
    });

    if (!league) {
      console.log('❌ Liga CBO no encontrada');
      return;
    }

    console.log(`✅ Liga encontrada: ${league.name} (${league.id})`);
    console.log(`   Jornada actual: ${league.currentJornada}`);
    console.log(`   Estado: ${league.jornadaStatus}`);

    // Buscar LeagueMember
    const member = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: user.id
        }
      }
    });

    if (!member) {
      console.log('❌ LeagueMember no encontrado');
      return;
    }

    console.log('\n📊 DATOS ACTUALES EN BASE DE DATOS:');
    console.log('=====================================');
    console.log(`Total points: ${member.points}`);
    console.log(`Budget: ${member.budget}`);
    console.log(`Betting budget: ${member.bettingBudget}`);
    
    const pointsPerJornada = member.pointsPerJornada as Record<string, number> || {};
    console.log('\nPuntos por jornada:');
    console.log(`  J11: ${pointsPerJornada['11'] ?? 0}`);
    console.log(`  J12: ${pointsPerJornada['12'] ?? 0}`);
    console.log(`  Total acumulado: ${member.points}`);

    // Calcular lo que debería ser
    const j11Points = pointsPerJornada['11'] ?? 0;
    const j12Points = pointsPerJornada['12'] ?? 0;
    const expectedTotal = j11Points + j12Points;

    console.log('\n📋 VERIFICACIÓN:');
    console.log('================');
    console.log(`✓ J11 = 102: ${j11Points === 102 ? '✅ OK' : `❌ ERROR (actual: ${j11Points})`}`);
    console.log(`✓ J12 = 88: ${j12Points === 88 ? '✅ OK' : `❌ ERROR (actual: ${j12Points})`}`);
    console.log(`✓ Total = 190: ${member.points === 190 ? '✅ OK' : `❌ ERROR (actual: ${member.points}, esperado: ${expectedTotal})`}`);

    // Verificar apuestas de J12
    const bets = await prisma.bet.findMany({
      where: {
        userId: user.id,
        leagueId: league.id,
        jornada: 12
      }
    });

    console.log(`\n🎲 APUESTAS J12: ${bets.length} apuestas`);
    let totalBetAmount = 0;
    let totalPotentialWin = 0;
    let pendingBets = 0;
    let wonBets = 0;
    let lostBets = 0;

    bets.forEach((bet, index) => {
      totalBetAmount += bet.amount;
      totalPotentialWin += bet.potentialWin;
      
      if (bet.status === 'PENDING') pendingBets++;
      else if (bet.status === 'WON') wonBets++;
      else if (bet.status === 'LOST') lostBets++;

      console.log(`  ${index + 1}. ${bet.amount}€ → ${bet.potentialWin}€ (${bet.status})`);
    });

    console.log(`\n  Total apostado: ${totalBetAmount}€`);
    console.log(`  Ganancia potencial: ${totalPotentialWin}€`);
    console.log(`  Estado: ${wonBets} ganadas, ${lostBets} perdidas, ${pendingBets} pendientes`);

    // Advertencias
    console.log('\n⚠️  ADVERTENCIAS:');
    console.log('==================');
    
    if (j12Points !== 88) {
      console.log('❌ Los puntos de J12 NO están guardados correctamente en la BD');
      console.log('   → El worker NO ha actualizado pointsPerJornada["12"]');
      console.log('   → RIESGO: Al cerrar la jornada se perderán estos puntos');
    }

    if (member.points !== expectedTotal) {
      console.log('❌ El total de puntos NO coincide con la suma de jornadas');
      console.log(`   → Esperado: ${expectedTotal}, Actual: ${member.points}`);
    }

    if (pendingBets > 0) {
      console.log(`⚠️  Hay ${pendingBets} apuestas pendientes de J12`);
      console.log('   → Al cerrar se evaluarán y pueden dar ganancias adicionales');
    }

    console.log('\n💾 BACKUP REQUERIDO:');
    console.log('====================');
    console.log('Antes de cerrar J12, el backup debe contener:');
    console.log(`  - pointsPerJornada["11"] = 102`);
    console.log(`  - pointsPerJornada["12"] = 88`);
    console.log(`  - points (total) = 190`);
    console.log(`  - ${bets.length} apuestas de J12 con todos sus bet_options`);

    console.log('\n💰 CÁLCULO AL CERRAR J12:');
    console.log('=========================');
    const budgetFromJ12 = j12Points * 1_000_000; // 88M
    console.log(`Budget por puntos J12: ${budgetFromJ12.toLocaleString()}€ (88M)`);
    console.log(`Budget por apuestas ganadas: (se calculará al evaluar apuestas pendientes)`);
    console.log(`Budget actual: ${member.budget.toLocaleString()}€`);
    console.log(`Budget esperado después de cierre: ${(member.budget + budgetFromJ12).toLocaleString()}€ + ganancias apuestas`);

  } catch (error) {
    console.error('❌ Error al verificar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFCEstradaPoints();
