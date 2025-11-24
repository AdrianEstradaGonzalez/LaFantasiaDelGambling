import { PrismaClient } from '@prisma/client';
import { calculatePlayerPointsTotal, normalizeRole } from '../src/shared/pointsCalculator.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const PREMIER_LEAGUE_ID = 39;
const SEASON = 2025;

/**
 * Script para calcular y actualizar los puntos totales de todos los jugadores de Premier
 * que están en plantillas de usuarios
 */
async function calculatePremierSquadPoints() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('⚽ CÁLCULO DE PUNTOS - JUGADORES PREMIER EN PLANTILLAS');
    console.log('═'.repeat(70));
    console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}\n`);

    // 1. Obtener todos los jugadores de Premier que están en plantillas
    console.log('📊 1. Obteniendo jugadores de Premier en plantillas...');
    const premierSquadPlayers = await prisma.squadPlayer.findMany({
      where: {
        squad: {
          league: {
            division: 'premier'
          }
        }
      },
      select: {
        playerId: true,
        playerName: true,
        squadId: true,
        squad: {
          select: {
            userId: true,
            leagueId: true,
            league: {
              select: {
                name: true,
                currentJornada: true
              }
            }
          }
        }
      },
      distinct: ['playerId']
    });

    console.log(`   ✅ ${premierSquadPlayers.length} jugadores únicos de Premier encontrados en plantillas\n`);

    if (premierSquadPlayers.length === 0) {
      console.log('ℹ️  No hay jugadores de Premier en plantillas\n');
      return;
    }

    // 2. Obtener jornada actual de Premier
    console.log('📅 2. Obteniendo jornada actual de Premier League...');
    const currentRoundResponse = await axios.get(`${API_BASE}/fixtures/rounds`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      params: {
        league: PREMIER_LEAGUE_ID,
        season: SEASON,
        current: true
      }
    });

    const currentRound = currentRoundResponse.data?.response?.[0];
    const currentJornada = currentRound ? parseInt(currentRound.replace(/\D/g, '')) : 13;
    console.log(`   ✅ Jornada actual: ${currentJornada}\n`);

    // 3. Obtener estadísticas existentes en la BD (solo jornadas 11 y 12)
    console.log('📊 3. Obteniendo estadísticas de jornadas 11 y 12...');
    const playerIds = premierSquadPlayers.map(sp => sp.playerId);
    
    const existingStats = await prisma.playerPremierStats.findMany({
      where: {
        playerId: { in: playerIds },
        season: SEASON,
        jornada: { in: [11, 12] }
      },
      orderBy: [
        { playerId: 'asc' },
        { jornada: 'asc' }
      ]
    });

    console.log(`   ✅ ${existingStats.length} registros encontrados (solo J11 y J12)\n`);

    if (existingStats.length === 0) {
      console.log('⚠️  No hay estadísticas en la BD. Primero ejecuta el script de carga de estadísticas.\n');
      return;
    }

    // 4. Obtener fixtures de las jornadas 11 y 12
    console.log('🏟️  4. Obteniendo fixtures de jornadas 11 y 12...');
    const fixturesResponse = await axios.get(`${API_BASE}/fixtures`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      params: {
        league: PREMIER_LEAGUE_ID,
        season: SEASON
      }
    });

    const allFixtures = fixturesResponse.data?.response || [];
    const fixtures11 = allFixtures.filter((f: any) => {
      const round = f.league?.round || '';
      return round.includes('11') && !round.includes('12');
    });
    const fixtures12 = allFixtures.filter((f: any) => {
      const round = f.league?.round || '';
      return round.includes('12');
    });

    console.log(`   ✅ Jornada 11: ${fixtures11.length} partidos`);
    console.log(`   ✅ Jornada 12: ${fixtures12.length} partidos\n`);

    // 5. Para cada estadística, actualizar desde la API
    console.log('🔄 5. Actualizando estadísticas desde API-Football...');
    let updatedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < existingStats.length; i++) {
      const stat = existingStats[i];
      try {
        // Seleccionar fixtures según la jornada
        const jornadaFixtures = stat.jornada === 11 ? fixtures11 : fixtures12;
        
        // Debug primera iteración
        if (i === 0) {
          console.log(`\n   🔍 Debug - Procesando primera estadística:`);
          console.log(`   - Jornada: ${stat.jornada}`);
          console.log(`   - Jugador ID: ${stat.playerId}`);
          console.log(`   - Fixtures disponibles: ${jornadaFixtures.length}`);
          console.log(`   - Fixture IDs: ${jornadaFixtures.slice(0, 3).map((f: any) => f.fixture.id).join(', ')}...\n`);
        }
        
        let playerStats = null;
        let foundFixtureId = null;

        // Buscar al jugador en todos los fixtures de la jornada
        for (const fixture of jornadaFixtures) {
          try {
            const response = await axios.get(`${API_BASE}/fixtures/players`, {
              headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
              },
              params: {
                fixture: fixture.fixture.id
              }
            });

            const teamsData = response.data?.response || [];
            
            // Buscar al jugador en los equipos
            for (const teamData of teamsData) {
              const foundPlayer = teamData.players?.find((p: any) => p.player.id === stat.playerId);
              if (foundPlayer && foundPlayer.statistics?.[0]) {
                playerStats = foundPlayer.statistics[0];
                foundFixtureId = fixture.fixture.id;
                break;
              }
            }

            if (playerStats) break;

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (fixtureError: any) {
            // Continuar con el siguiente fixture
            continue;
          }
        }

        if (playerStats && foundFixtureId) {
          // Actualizar estadísticas en BD con datos de la API
          await prisma.playerPremierStats.update({
            where: { id: stat.id },
            data: {
              fixtureId: foundFixtureId, // Actualizar también el fixtureId
              minutes: playerStats.games?.minutes || 0,
              rating: playerStats.games?.rating ? playerStats.games.rating.toString() : null,
              goals: playerStats.goals?.total || 0,
              assists: playerStats.goals?.assists || 0,
              saves: playerStats.goals?.saves || 0,
              conceded: playerStats.goals?.conceded || 0,
              yellowCards: playerStats.cards?.yellow || 0,
              redCards: playerStats.cards?.red || 0,
              penaltyWon: playerStats.penalty?.won || 0,
              penaltySaved: playerStats.penalty?.saved || 0,
              penaltyMissed: playerStats.penalty?.missed || 0,
              passesKey: playerStats.passes?.key || 0,
              passesAccuracy: playerStats.passes?.accuracy ? parseInt(playerStats.passes.accuracy) : null,
              shotsOn: playerStats.shots?.on || 0,
              tacklesTotal: playerStats.tackles?.total || 0,
              duelsWon: playerStats.duels?.won || 0
            }
          });

          updatedCount++;
          
          if (updatedCount % 10 === 0) {
            console.log(`   📊 Actualizados ${updatedCount}/${existingStats.length} registros...`);
          }
        } else {
          // Jugador no encontrado en ningún fixture de la jornada
          notFoundCount++;
          if (notFoundCount <= 10) {
            console.log(`   ⚠️  Jugador ${stat.playerId} no encontrado en ningún fixture de J${stat.jornada}`);
          }
        }

      } catch (error: any) {
        errorCount++;
        if (errorCount <= 5) {
          console.error(`   ❌ Error actualizando stats del jugador ${stat.playerId} J${stat.jornada}:`, error.message);
        }
      }
    }

    console.log(`   ✅ ${updatedCount} estadísticas actualizadas, ${errorCount} errores\n`);

    // 5. Recalcular puntos para cada estadística usando los datos actualizados
    console.log('🧮 5. Recalculando puntos...');
    console.log('━'.repeat(70));

    const updatedStatsFromDB = await prisma.playerPremierStats.findMany({
      where: {
        playerId: { in: playerIds },
        season: SEASON
      },
      orderBy: [
        { playerId: 'asc' },
        { jornada: 'asc' }
      ]
    });

    const playerPointsMap = new Map<number, {
      playerName: string;
      totalPoints: number;
      jornadasPlayed: number;
    }>();

    let calculatedStats = 0;

    for (const stat of updatedStatsFromDB) {
      try {
        const player = premierSquadPlayers.find(p => p.playerId === stat.playerId);
        const playerName = player?.playerName || `Player ${stat.playerId}`;

        // Mapear estadísticas al formato que espera la función
        const mappedStats = {
          games: {
            minutes: stat.minutes || 0,
            rating: stat.rating || null
          },
          goals: {
            total: stat.goals || 0,
            assists: stat.assists || 0,
            saves: stat.saves || 0,
            conceded: stat.conceded || 0
          },
          cards: {
            yellow: stat.yellowCards || 0,
            red: stat.redCards || 0
          },
          penalty: {
            won: stat.penaltyWon || 0,
            saved: stat.penaltySaved || 0,
            missed: stat.penaltyMissed || 0
          },
          passes: {
            key: stat.passesKey || 0,
            accuracy: stat.passesAccuracy || null
          },
          shots: {
            on: stat.shotsOn || 0
          },
          tackles: {
            total: stat.tacklesTotal || 0
          },
          duels: {
            won: stat.duelsWon || 0
          }
        };

        const role = normalizeRole(stat.position || 'Midfielder');
        const jornadaPoints = calculatePlayerPointsTotal(mappedStats, role);

        // Actualizar puntos en BD
        await prisma.playerPremierStats.update({
          where: { id: stat.id },
          data: { totalPoints: jornadaPoints }
        });

        // Actualizar totales del jugador
        if (!playerPointsMap.has(stat.playerId)) {
          playerPointsMap.set(stat.playerId, {
            playerName,
            totalPoints: 0,
            jornadasPlayed: 0
          });
        }

        const playerData = playerPointsMap.get(stat.playerId)!;
        playerData.totalPoints += jornadaPoints;
        playerData.jornadasPlayed++;

        calculatedStats++;

        // Debug: Mostrar primeros 5 cálculos
        if (calculatedStats <= 5) {
          console.log(`   🔍 ${playerName} J${stat.jornada}:`);
          console.log(`      Goles: ${stat.goals || 0}, Asistencias: ${stat.assists || 0}, Minutos: ${stat.minutes || 0}`);
          console.log(`      Puntos: ${jornadaPoints}\n`);
        }

      } catch (error: any) {
        console.error(`   ❌ Error calculando puntos para stat ${stat.id}:`, error.message);
      }
    }

    console.log(`   ✅ ${calculatedStats} registros actualizados con puntos recalculados\n`);

    // 5. Mostrar resumen de jugadores
    console.log('\n' + '━'.repeat(70));
    console.log('📊 RESUMEN DE PUNTOS POR JUGADOR');
    console.log('━'.repeat(70));

    // Ordenar jugadores por puntos totales
    const sortedPlayers = Array.from(playerPointsMap.entries())
      .sort((a, b) => b[1].totalPoints - a[1].totalPoints);

    console.log('\n🏆 Top 10 jugadores por puntos totales:');
    sortedPlayers.slice(0, 10).forEach(([playerId, data], index) => {
      const avgPoints = data.jornadasPlayed > 0 ? (data.totalPoints / data.jornadasPlayed).toFixed(1) : '0.0';
      console.log(`   ${index + 1}. ${data.playerName}`);
      console.log(`      Total: ${data.totalPoints} pts | Jornadas: ${data.jornadasPlayed} | Promedio: ${avgPoints} pts/jornada`);
    });

    // Estadísticas generales
    const totalPointsAllPlayers = Array.from(playerPointsMap.values())
      .reduce((sum, data) => sum + data.totalPoints, 0);
    const avgPointsPerPlayer = playerPointsMap.size > 0 
      ? (totalPointsAllPlayers / playerPointsMap.size).toFixed(1) 
      : '0.0';

    console.log('\n📈 Estadísticas generales:');
    console.log(`   Total jugadores en plantillas: ${playerPointsMap.size}`);
    console.log(`   Puntos totales generados: ${totalPointsAllPlayers}`);
    console.log(`   Promedio por jugador: ${avgPointsPerPlayer} pts`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ PROCESO COMPLETADO');
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Error fatal en el cálculo de puntos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
calculatePremierSquadPoints()
  .then(() => {
    console.log('✨ Script finalizado exitosamente\n');
  })
  .catch((error) => {
    console.error('\n💥 Error al ejecutar el script:', error);
  });
