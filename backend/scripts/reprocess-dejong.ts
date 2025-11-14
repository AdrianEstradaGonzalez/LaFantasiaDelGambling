import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { calculatePlayerPoints, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '07bc9c707fe2d6169fff6e17d4a9e6fd';
const HEADERS = { 'x-apisports-key': API_KEY };
const SEASON = 2025;
const JORNADA = 12;
const FIXTURE_ID = 1390931; // Barcelona vs Real Sociedad

async function reprocessDeJong() {
  console.log('🔄 Re-procesando datos de De Jong - Jornada 12...\n');

  try {
    // 1. Obtener eventos del partido para tarjetas correctas
    console.log('📡 Obteniendo eventos del partido...');
    const { data: eventsData } = await axios.get(`${API_BASE}/fixtures/events`, {
      headers: HEADERS,
      params: { fixture: FIXTURE_ID },
      timeout: 10000,
    });

    const events = eventsData?.response || [];
    const playerCards = new Map<number, { yellow: number; red: number }>();
    
    // Contar tarjetas por jugador
    for (const event of events) {
      if (event.type === 'Card' && event.player?.id) {
        const playerId = event.player.id;
        if (!playerCards.has(playerId)) {
          playerCards.set(playerId, { yellow: 0, red: 0 });
        }
        const cards = playerCards.get(playerId)!;
        
        if (event.detail === 'Yellow Card') {
          cards.yellow++;
          console.log(`   ${event.time.elapsed}${event.time.extra ? `+${event.time.extra}` : ''}' - ${event.player.name}: Amarilla`);
        } else if (event.detail === 'Red Card') {
          cards.red++;
          console.log(`   ${event.time.elapsed}${event.time.extra ? `+${event.time.extra}` : ''}' - ${event.player.name}: Roja`);
        }
      }
    }
    
    // Corregir doble amarilla
    for (const [playerId, cards] of playerCards.entries()) {
      if (cards.yellow === 2 && cards.red === 1) {
        console.log(`   ✅ Detectada doble amarilla para jugador ${playerId}: ${cards.yellow} amarillas + ${cards.red} roja → 0 amarillas + 1 roja`);
        cards.yellow = 0;
        cards.red = 1;
      }
    }

    // 2. Obtener stats de jugadores del partido
    console.log('\n📡 Obteniendo stats de jugadores...');
    const { data: playersData } = await axios.get(`${API_BASE}/fixtures/players`, {
      headers: HEADERS,
      params: { fixture: FIXTURE_ID },
      timeout: 10000,
    });

    const teamsData = playersData?.response || [];
    
    // Buscar a De Jong
    let deJongFound = false;
    
    for (const teamData of teamsData) {
      const players = teamData.players || [];
      
      for (const playerData of players) {
        const playerId = playerData.player?.id;
        const playerName = playerData.player?.name;
        
        if (playerName && playerName.includes('Jong')) {
          deJongFound = true;
          console.log(`\n👤 Encontrado: ${playerName} (ID: ${playerId})`);
          
          const dbPlayer = await prisma.player.findUnique({
            where: { id: playerId },
            select: { position: true, name: true }
          });
          
          if (!dbPlayer) {
            console.log('❌ Jugador no encontrado en BD');
            continue;
          }

          const apiStats = playerData.statistics?.[0] || {};
          const role = normalizeRole(dbPlayer.position as Role);
          
          // Construir stats normalizadas
          const normalizedStats: any = {
            games: {
              minutes: apiStats.games?.minutes ?? 0,
              position: apiStats.games?.position ?? null,
              rating: apiStats.games?.rating ?? null,
              captain: apiStats.games?.captain ?? false,
              substitute: apiStats.games?.substitute ?? false,
            },
            goals: {
              total: apiStats.goals?.total ?? 0,
              assists: apiStats.goals?.assists ?? 0,
              conceded: apiStats.goals?.conceded ?? 0,
              saves: apiStats.goalkeeper?.saves ?? 0,
            },
            shots: {
              total: apiStats.shots?.total ?? 0,
              on: apiStats.shots?.on ?? 0,
            },
            passes: {
              total: apiStats.passes?.total ?? 0,
              key: apiStats.passes?.key ?? 0,
              accuracy: apiStats.passes?.accuracy ?? null,
            },
            tackles: {
              total: apiStats.tackles?.total ?? 0,
              blocks: apiStats.tackles?.blocks ?? 0,
              interceptions: apiStats.tackles?.interceptions ?? 0,
            },
            duels: {
              total: apiStats.duels?.total ?? 0,
              won: apiStats.duels?.won ?? 0,
            },
            dribbles: {
              attempts: apiStats.dribbles?.attempts ?? 0,
              success: apiStats.dribbles?.success ?? 0,
              past: apiStats.dribbles?.past ?? 0,
            },
            fouls: {
              drawn: apiStats.fouls?.drawn ?? 0,
              committed: apiStats.fouls?.committed ?? 0,
            },
            cards: {
              yellow: apiStats.cards?.yellow ?? 0,
              red: apiStats.cards?.red ?? 0,
            },
            penalty: {
            won: apiStats.penalty?.won ?? 0,
            committed: apiStats.penalty?.commited ?? apiStats.penalty?.committed ?? 0,
            scored: apiStats.penalty?.scored ?? 0,
              missed: apiStats.penalty?.missed ?? 0,
              saved: apiStats.penalty?.saved ?? 0,
            }
          };

          // ✅ SOBRESCRIBIR con tarjetas de eventos
          const eventCards = playerCards.get(playerId);
          if (eventCards) {
            console.log(`\n🎴 Tarjetas API: ${normalizedStats.cards.yellow} amarillas, ${normalizedStats.cards.red} rojas`);
            console.log(`🎴 Tarjetas eventos: ${eventCards.yellow} amarillas, ${eventCards.red} rojas`);
            normalizedStats.cards.yellow = eventCards.yellow;
            normalizedStats.cards.red = eventCards.red;
          }

          // Calcular puntos
          const pointsResult = calculatePlayerPoints(normalizedStats, role);
          
          console.log(`\n📊 Stats actualizadas:`);
          console.log(`   Minutos: ${normalizedStats.games.minutes}`);
          console.log(`   Amarillas: ${normalizedStats.cards.yellow}`);
          console.log(`   Rojas: ${normalizedStats.cards.red}`);
          console.log(`   Puntos: ${pointsResult.total}`);
          
          console.log(`\n📋 Desglose de puntos:`);
          pointsResult.breakdown.forEach((item: any) => {
            if (item.points !== 0) {
              console.log(`   ${item.label}: ${item.points > 0 ? '+' : ''}${item.points}`);
            }
          });

          // Actualizar en BD
          await prisma.playerStats.update({
            where: {
              playerId_jornada_season: {
                playerId: playerId,
                jornada: JORNADA,
                season: SEASON
              }
            },
            data: {
              yellowCards: normalizedStats.cards.yellow,
              redCards: normalizedStats.cards.red,
              totalPoints: pointsResult.total,
              pointsBreakdown: pointsResult.breakdown as any,
              updatedAt: new Date()
            }
          });

          console.log(`\n✅ Datos actualizados en BD`);
        }
      }
    }

    if (!deJongFound) {
      console.log('\n❌ De Jong no encontrado en el partido');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

reprocessDeJong();
