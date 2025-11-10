import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script para sincronizar los puntos de J12 desde el cálculo en tiempo real
 * 
 * PROBLEMA: pointsPerJornada["12"] está en 0 para muchos usuarios, pero el frontend
 * muestra los puntos correctos porque los calcula en tiempo real desde playerStats.
 * 
 * SOLUCIÓN: Replicar el mismo cálculo que hace getAllClassifications cuando
 * jornadaStatus='closed' y guardar los resultados en pointsPerJornada["12"].
 */

async function syncJ12Points() {
  try {
    console.log('\n🔄 Sincronizando puntos de J12 desde estadísticas en tiempo real...\n');

    // Obtener todas las ligas
    const leagues = await prisma.league.findMany({
      where: {
        currentJornada: 12,
        jornadaStatus: 'closed' // Solo si está cerrada
      }
    });

    if (leagues.length === 0) {
      console.log('⚠️  No hay ligas en jornada 12 con estado cerrado');
      return;
    }

    console.log(`📊 Encontradas ${leagues.length} ligas en J12 cerrada\n`);

    let totalUpdated = 0;
    const updateSummary: any[] = [];

    for (const league of leagues) {
      console.log(`\n🏆 Liga: ${league.name} (${league.id})`);
      console.log(`   Jornada: ${league.currentJornada}, Estado: ${league.jornadaStatus}`);

      // Obtener todos los miembros de la liga
      const members = await prisma.leagueMember.findMany({
        where: { leagueId: league.id },
        include: { user: true }
      });

      console.log(`   Miembros: ${members.length}\n`);

      for (const member of members) {
        try {
          // 1. Obtener la plantilla del usuario
          const squad = await prisma.squad.findUnique({
            where: {
              userId_leagueId: {
                userId: member.userId,
                leagueId: league.id
              }
            },
            include: {
              players: true
            }
          });

          // Si no tiene plantilla, puntos = 0
          if (!squad || squad.players.length === 0) {
            console.log(`   ⚠️  ${member.user.name}: Sin plantilla, J12 = 0 pts`);
            continue;
          }

          // 2. Obtener estadísticas de todos los jugadores para J12
          const playerIds = squad.players.map((p: any) => p.playerId);
          const playerStats = await prisma.playerStats.findMany({
            where: {
              playerId: { in: playerIds },
              jornada: 12,
              season: 2025
            }
          });

          // 3. Calcular puntos totales (mismo algoritmo que getAllClassifications)
          let sumPoints = 0;
          let captainId: number | null = null;

          // Encontrar el capitán
          const captainPlayer = squad.players.find((p: any) => p.isCaptain);
          if (captainPlayer) {
            captainId = captainPlayer.playerId;
          }

          // Sumar puntos de cada jugador
          playerStats.forEach((stats: any) => {
            const points = stats.totalPoints || 0;
            
            // Si es el capitán, doblar los puntos
            if (captainId && stats.playerId === captainId) {
              sumPoints += points * 2;
            } else {
              sumPoints += points;
            }
          });

          // Si tiene menos de 11 jugadores, el total es 0
          const j12Points = squad.players.length < 11 ? 0 : sumPoints;

          // 4. Leer pointsPerJornada actual
          const currentPointsPerJornada = (member.pointsPerJornada as Record<string, number>) || {};
          const currentJ12 = currentPointsPerJornada['12'] || 0;

          // Solo actualizar si es diferente
          if (currentJ12 !== j12Points) {
            // Actualizar pointsPerJornada["12"]
            const updatedPointsPerJornada = {
              ...currentPointsPerJornada,
              '12': j12Points
            };

            // Calcular nuevo total sumando todas las jornadas
            let newTotalPoints = 0;
            for (let j = 1; j <= 38; j++) {
              const jornadaKey = j.toString();
              newTotalPoints += (updatedPointsPerJornada as any)[jornadaKey] || 0;
            }

            // Actualizar en BD
            await prisma.leagueMember.update({
              where: {
                leagueId_userId: {
                  leagueId: league.id,
                  userId: member.userId
                }
              },
              data: {
                pointsPerJornada: updatedPointsPerJornada,
                points: newTotalPoints
              }
            });

            console.log(`   ✅ ${member.user.name}: J12 ${currentJ12} → ${j12Points} pts, Total ${member.points} → ${newTotalPoints}`);
            
            updateSummary.push({
              league: league.name,
              user: member.user.name,
              j12Before: currentJ12,
              j12After: j12Points,
              totalBefore: member.points,
              totalAfter: newTotalPoints
            });

            totalUpdated++;
          } else {
            console.log(`   ⏭️  ${member.user.name}: J12 = ${j12Points} pts (sin cambios)`);
          }

        } catch (error) {
          console.error(`   ❌ Error procesando ${member.user.name}:`, error);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE ACTUALIZACIONES');
    console.log('='.repeat(80));
    console.log(`Total de usuarios actualizados: ${totalUpdated}\n`);

    if (updateSummary.length > 0) {
      console.log('Detalle de cambios:');
      updateSummary.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.user} (${item.league})`);
        console.log(`   J12: ${item.j12Before} → ${item.j12After} pts`);
        console.log(`   Total: ${item.totalBefore} → ${item.totalAfter} pts`);
      });
    }

    console.log('\n✅ Sincronización completada');
    console.log('\n💾 SIGUIENTE PASO:');
    console.log('   Ejecuta: npm run backup-db');
    console.log('   Para crear un backup con los puntos actualizados de J12\n');

  } catch (error) {
    console.error('\n❌ Error en sincronización:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncJ12Points();
