import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script para corregir los puntos de J12 de FC Estrada en liga CBO
 * 
 * PROBLEMA: Los puntos de J12 (88) no están guardados en pointsPerJornada["12"]
 * SOLUCIÓN: Actualizar manualmente pointsPerJornada y total de puntos
 */

async function fixFCEstradaJ12Points() {
  try {
    console.log('\n🔧 Corrigiendo puntos de J12 para FC Estrada en CBO...\n');

    // Buscar usuario
    const user = await prisma.user.findFirst({
      where: { name: 'F.C.Estrada' }
    });

    if (!user) {
      throw new Error('Usuario F.C.Estrada no encontrado');
    }

    // Buscar liga
    const league = await prisma.league.findFirst({
      where: { name: 'CBO' }
    });

    if (!league) {
      throw new Error('Liga CBO no encontrada');
    }

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
      throw new Error('LeagueMember no encontrado');
    }

    console.log('📊 ESTADO ACTUAL:');
    console.log('=================');
    const currentPointsPerJornada = member.pointsPerJornada as Record<string, number> || {};
    console.log(`J11: ${currentPointsPerJornada['11'] ?? 0}`);
    console.log(`J12: ${currentPointsPerJornada['12'] ?? 0}`);
    console.log(`Total: ${member.points}`);
    console.log(`Budget: ${member.budget}`);

    // Confirmar antes de proceder
    console.log('\n⚠️  Se va a actualizar:');
    console.log('========================');
    console.log('pointsPerJornada["12"] = 88');
    console.log('points (total) = 190');
    console.log('\n¿Continuar? (Se ejecutará automáticamente en 3 segundos)');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Preparar nuevo pointsPerJornada
    const updatedPointsPerJornada = {
      ...currentPointsPerJornada,
      '12': 88  // Puntos de J12
    };

    // Calcular nuevo total
    const newTotalPoints = 102 + 88; // J11 + J12 = 190

    // Actualizar en BD
    const updated = await prisma.leagueMember.update({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: user.id
        }
      },
      data: {
        pointsPerJornada: updatedPointsPerJornada,
        points: newTotalPoints
      }
    });

    console.log('\n✅ ACTUALIZACIÓN COMPLETADA:');
    console.log('============================');
    const newPointsPerJornada = updated.pointsPerJornada as Record<string, number>;
    console.log(`J11: ${newPointsPerJornada['11']}`);
    console.log(`J12: ${newPointsPerJornada['12']}`);
    console.log(`Total: ${updated.points}`);
    console.log(`Budget: ${updated.budget} (no modificado, se actualizará al cerrar)`);

    console.log('\n💾 SIGUIENTE PASO:');
    console.log('==================');
    console.log('Ejecuta: npm run backup-db');
    console.log('Para crear un backup con los datos corregidos antes de cerrar J12');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixFCEstradaJ12Points();
