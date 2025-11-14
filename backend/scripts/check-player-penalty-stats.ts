/**
 * Script para verificar estadísticas de penaltis de un jugador específico
 * Uso: npx tsx scripts/check-player-penalty-stats.ts [playerName] [jornada]
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || '07bc9c707fe2d6169fff6e17d4a9e6fd';
const FOOTBALL_API_URL = 'https://v3.football.api-sports.io';

async function checkPlayerPenaltyStats(playerName: string, jornada: number) {
  try {
    console.log(`\n🔍 Buscando estadísticas de penaltis para: ${playerName} en Jornada ${jornada}\n`);

    // 1. Buscar el jugador en la base de datos
    const player = await prisma.player.findFirst({
      where: {
        name: {
          contains: playerName,
          mode: 'insensitive'
        }
      }
    });

    if (!player) {
      console.log(`❌ No se encontró el jugador: ${playerName}`);
      return;
    }

    console.log(`✅ Jugador encontrado:`);
    console.log(`   - ID: ${player.id}`);
    console.log(`   - Nombre: ${player.name}`);
    console.log(`   - Equipo ID: ${player.teamId}`);

    // 2. Buscar las estadísticas en la base de datos
    const stats = await prisma.playerStats.findFirst({
      where: {
        playerId: player.id,
        jornada: jornada,
        season: 2025
      }
    });

    if (stats) {
      console.log(`\n📊 Estadísticas actuales en BD (Jornada ${jornada}):`);
      console.log(`   - Penaltis ganados: ${stats.penaltyWon}`);
      console.log(`   - Penaltis cometidos: ${stats.penaltyCommitted}`);
      console.log(`   - Penaltis marcados: ${stats.penaltyScored}`);
      console.log(`   - Penaltis fallados: ${stats.penaltyMissed}`);
      console.log(`   - Fixture ID: ${stats.fixtureId}`);
    } else {
      console.log(`\n⚠️  No se encontraron estadísticas en BD para Jornada ${jornada}`);
    }

    // 3. Consultar API de Football para verificar datos originales
    if (stats?.fixtureId) {
      console.log(`\n🌐 Consultando API de Football (Fixture ${stats.fixtureId})...\n`);
      
      const response = await axios.get(`${FOOTBALL_API_URL}/fixtures/players`, {
        params: {
          fixture: stats.fixtureId
        },
        headers: {
          'x-rapidapi-key': FOOTBALL_API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      if (response.data?.response) {
        // Buscar el jugador en los datos del fixture
        for (const teamData of response.data.response) {
          const playerData = teamData.players.find((p: any) => p.player.id === player.id);
          
          if (playerData) {
            const apiStats = playerData.statistics[0];
            console.log(`✅ Datos de la API para ${player.name}:`);
            console.log(`   - Minutos: ${apiStats.games.minutes}`);
            console.log(`   - Goles: ${apiStats.goals.total}`);
            console.log(`   - Asistencias: ${apiStats.goals.assists}`);
            console.log(`   - Tarjetas amarillas: ${apiStats.cards.yellow}`);
            console.log(`   - Tarjetas rojas: ${apiStats.cards.red}`);
            console.log(`\n   📍 PENALTIS (objeto completo):`);
            console.log(JSON.stringify(apiStats.penalty, null, 2));
            console.log(`\n   📍 PENALTIS (individual):`);
            console.log(`   - penalty.won: ${apiStats.penalty?.won ?? 'null'}`);
            console.log(`   - penalty.commited (API): ${apiStats.penalty?.commited ?? 'null'}`);
            console.log(`   - penalty.committed (fallback): ${apiStats.penalty?.committed ?? 'null'}`);
            console.log(`   - penalty.scored: ${apiStats.penalty?.scored ?? 'null'}`);
            console.log(`   - penalty.missed: ${apiStats.penalty?.missed ?? 'null'}`);
            console.log(`   - penalty.saved: ${apiStats.penalty?.saved ?? 'null'}`);

            // Comparar con BD
            if (stats) {
              console.log(`\n🔄 Comparación API vs BD:`);
              const differences = [];
              if ((apiStats.penalty?.won ?? 0) !== stats.penaltyWon) {
                differences.push(`penaltyWon: API=${apiStats.penalty?.won ?? 0}, BD=${stats.penaltyWon}`);
              }
              if ((apiStats.penalty?.commited ?? apiStats.penalty?.committed ?? 0) !== stats.penaltyCommitted) {
                differences.push(`penaltyCommitted: API=${apiStats.penalty?.commited ?? apiStats.penalty?.committed ?? 0}, BD=${stats.penaltyCommitted}`);
              }
              if ((apiStats.penalty?.scored ?? 0) !== stats.penaltyScored) {
                differences.push(`penaltyScored: API=${apiStats.penalty?.scored ?? 0}, BD=${stats.penaltyScored}`);
              }
              if ((apiStats.penalty?.missed ?? 0) !== stats.penaltyMissed) {
                differences.push(`penaltyMissed: API=${apiStats.penalty?.missed ?? 0}, BD=${stats.penaltyMissed}`);
              }

              if (differences.length > 0) {
                console.log(`   ⚠️  DIFERENCIAS ENCONTRADAS:`);
                differences.forEach(diff => console.log(`      - ${diff}`));
                
                // Preguntar si desea actualizar
                console.log(`\n💡 Para actualizar, ejecuta:`);
                console.log(`   npx tsx scripts/update-player-penalty.ts ${player.id} ${jornada} ${apiStats.penalty?.commited ?? apiStats.penalty?.committed ?? 0}`);
              } else {
                console.log(`   ✅ Los datos coinciden correctamente`);
              }
            }
            break;
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener argumentos de línea de comandos
const playerName = process.argv[2];
const jornada = parseInt(process.argv[3]);

if (!playerName || !jornada) {
  console.log('❌ Uso: npx tsx scripts/check-player-penalty-stats.ts [playerName] [jornada]');
  console.log('   Ejemplo: npx tsx scripts/check-player-penalty-stats.ts Affengruber 12');
  process.exit(1);
}

checkPlayerPenaltyStats(playerName, jornada);
