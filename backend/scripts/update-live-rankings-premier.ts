import { PrismaClient } from '@prisma/client';
import axios from 'axios';
// Importar el sistema centralizado de puntos (el mismo que usa toda la app)
import { calculatePlayerPointsTotal, normalizeRole, type Role } from '../src/shared/pointsCalculator.js';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '07bc9c707fe2d6169fff6e17d4a9e6fd';
const PREMIER_LEAGUE_ID = 39;
const SEASON = 2025;

const HEADERS = {
  'x-apisports-key': API_KEY,
};

interface PlayerStats {
  playerId: number;
  points: number;
  fixtureId: number;
  teamId: number; // ID del equipo
  rawStats: any; // Estadísticas completas de la API
  position: string; // Posición del jugador
}

/**
 * Calcula los puntos de un jugador basándose en sus estadísticas
 * Usa el sistema centralizado de puntos de toda la aplicación
 */
function calculatePlayerPoints(playerData: any, position: string): number {
  const stats = playerData.statistics?.[0];
  if (!stats) return 0;

  // Normalizar la posición al formato Role ('Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker')
  const role = normalizeRole(position) as Role;
  
  // Usar la función centralizada que tiene toda la lógica correcta
  return calculatePlayerPointsTotal(stats, role);
}

/**
 * Obtiene los partidos EN CURSO de la jornada actual de Premier League
 */
async function getLiveMatchesFromCurrentJornada(jornada: number): Promise<any[]> {
  try {
    console.log(`🔍 Buscando partidos en curso de la jornada ${jornada} (Premier League)...`);
    const { data } = await axios.get(`${API_BASE}/fixtures`, {
      headers: HEADERS,
      params: {
        league: PREMIER_LEAGUE_ID,
        season: SEASON,
        round: `Regular Season - ${jornada}`,
        live: 'all', // Partidos en vivo
      },
      timeout: 10000,
    });

    const fixtures = data?.response || [];
    console.log(`✅ Encontrados ${fixtures.length} partidos en curso (Premier League)`);
    return fixtures;
  } catch (error) {
    console.error('❌ Error obteniendo partidos en curso:', error);
    return [];
  }
}

/**
 * Obtiene las estadísticas de los jugadores de un partido
 */
async function getFixturePlayerStats(fixtureId: number): Promise<Map<number, PlayerStats>> {
  try {
    const { data } = await axios.get(`${API_BASE}/fixtures/players`, {
      headers: HEADERS,
      params: { fixture: fixtureId },
      timeout: 10000,
    });

    const teamsData = data?.response || [];
    const playerStatsMap = new Map<number, PlayerStats>();

    for (const teamData of teamsData) {
      const teamId = teamData.team?.id;
      if (!teamId) continue;
      
      const players = teamData.players || [];
      
      for (const playerData of players) {
        const playerId = playerData.player?.id;
        if (!playerId) continue;

        // Buscar el jugador en nuestra BD de Premier League
        const dbPlayer = await (prisma as any).playerPremier.findUnique({
          where: { id: playerId },
          select: { position: true },
        });

        if (!dbPlayer) continue;

        const points = calculatePlayerPoints(playerData, dbPlayer.position);
        
        playerStatsMap.set(playerId, {
          playerId,
          points,
          fixtureId,
          teamId, // ID del equipo
          rawStats: playerData.statistics?.[0] || {}, // Guardar stats completas
          position: dbPlayer.position,
        });
      }
    }

    console.log(`  📊 Calculados puntos de ${playerStatsMap.size} jugadores del partido ${fixtureId}`);
    return playerStatsMap;
  } catch (error) {
    console.error(`❌ Error obteniendo stats del partido ${fixtureId}:`, error);
    return new Map();
  }
}

/**
 * Guarda o actualiza las estadísticas TEMPORALES de un jugador en la base de datos (Premier League)
 * NOTA: Estas son stats en vivo, se actualizarán cuando el partido termine
 */
async function savePlayerStatsToDb(
  playerId: number,
  fixtureId: number,
  jornada: number,
  teamId: number,
  rawStats: any,
  points: number
): Promise<void> {
  try {
    // Preparar los datos para guardar (formato compatible con PlayerPremierStats)
    const statsData = {
      playerId,
      fixtureId,
      jornada,
      season: SEASON,
      teamId,
      totalPoints: points,
      
      // Datos del juego
      minutes: rawStats.games?.minutes || 0,
      position: rawStats.games?.position || null,
      rating: rawStats.games?.rating ? String(rawStats.games.rating) : null,
      captain: rawStats.games?.captain || false,
      substitute: rawStats.games?.substitute || false,
      
      // Goles y asistencias
      goals: rawStats.goals?.total || 0,
      assists: rawStats.goals?.assists || 0,
      conceded: rawStats.goals?.conceded || 0,
      saves: rawStats.goalkeeper?.saves || 0,
      
      // Tiros
      shotsTotal: rawStats.shots?.total || 0,
      shotsOn: rawStats.shots?.on || 0,
      
      // Pases
      passesTotal: rawStats.passes?.total || 0,
      passesKey: rawStats.passes?.key || 0,
      passesAccuracy: rawStats.passes?.accuracy ? parseInt(String(rawStats.passes.accuracy), 10) : null,
      
      // Defensivas
      tacklesTotal: rawStats.tackles?.total || 0,
      tacklesBlocks: rawStats.tackles?.blocks || 0,
      tacklesInterceptions: rawStats.tackles?.interceptions || 0,
      
      // Duelos
      duelsTotal: rawStats.duels?.total || 0,
      duelsWon: rawStats.duels?.won || 0,
      
      // Regates
      dribblesAttempts: rawStats.dribbles?.attempts || 0,
      dribblesSuccess: rawStats.dribbles?.success || 0,
      dribblesPast: rawStats.dribbles?.past || 0,
      
      // Faltas
      foulsDrawn: rawStats.fouls?.drawn || 0,
      foulsCommitted: rawStats.fouls?.committed || 0,
      
      // Tarjetas
      yellowCards: rawStats.cards?.yellow || 0,
      redCards: rawStats.cards?.red || 0,
      
      // Penaltis
      penaltyWon: rawStats.penalty?.won || 0,
      penaltyCommitted: rawStats.penalty?.commited || rawStats.penalty?.committed || 0,
      penaltyScored: rawStats.penalty?.scored || 0,
      penaltyMissed: rawStats.penalty?.missed || 0,
      penaltySaved: rawStats.penalty?.saved || 0,
      
      updatedAt: new Date(),
    };

    // Usar upsert para actualizar si ya existe o crear si no
    await (prisma as any).playerPremierStats.upsert({
      where: {
        playerId_jornada_season: {
          playerId,
          jornada,
          season: SEASON,
        },
      },
      update: statsData,
      create: statsData,
    });

  } catch (error) {
    console.error(`❌ Error guardando stats del jugador ${playerId}:`, error);
  }
}

/**
 * Obtiene la jornada actual consultando una liga de Premier League
 */
async function getCurrentJornada(): Promise<number | null> {
  try {
    // Buscar cualquier liga de Premier League para obtener su jornada actual
    const league = await prisma.league.findFirst({
      where: { division: 'premier' },
      select: { currentJornada: true },
    });

    if (league?.currentJornada) {
      console.log(`📅 Jornada actual obtenida de BD (Premier): ${league.currentJornada}`);
      return league.currentJornada;
    }

    console.log('⚠️  No se pudo obtener la jornada actual de la BD');
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo jornada actual:', error);
    return null;
  }
}

/**
 * Actualiza los puntos EN VIVO de todas las ligas de Premier League
 */
export async function updateLiveLeagueRankingsPremier() {
  try {
    console.log('\n🚀 Iniciando actualización de rankings EN VIVO (PREMIER LEAGUE)...');
    console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}\n`);

    // 1. Obtener la jornada actual
    const jornada = await getCurrentJornada();
    if (!jornada) {
      console.log('⚠️  No se pudo determinar la jornada actual. Finalizando...\n');
      return;
    }

    // 2. Obtener partidos EN CURSO de la jornada actual
    const liveFixtures = await getLiveMatchesFromCurrentJornada(jornada);
    
    if (liveFixtures.length === 0) {
      console.log('⏸️  No hay partidos en curso en la jornada actual. Esperando...\n');
      return;
    }

    console.log(`⚽ Partidos en curso: ${liveFixtures.map((f: any) => `${f.teams.home.name} vs ${f.teams.away.name} (${f.fixture.status.elapsed}')`).join(', ')}\n`);

    // 3. Obtener todas las estadísticas de jugadores de los partidos en curso
    const allPlayerStats = new Map<number, PlayerStats>();
    
    for (const fixture of liveFixtures) {
      const fixtureStats = await getFixturePlayerStats(fixture.fixture.id);
      
      // Mergear stats (evitando duplicados)
      for (const [playerId, stats] of fixtureStats) {
        if (!allPlayerStats.has(playerId)) {
          allPlayerStats.set(playerId, stats);
        }
      }
    }

    if (allPlayerStats.size === 0) {
      console.log('⚠️  No se obtuvieron estadísticas de jugadores\n');
      return;
    }

    console.log(`✨ Total de jugadores únicos procesados: ${allPlayerStats.size}`);

    // 3. Guardar estadísticas individuales en la base de datos (temporales, se actualizarán)
    console.log('\n💾 Guardando estadísticas EN VIVO en BD (PlayerPremierStats)...');
    let savedStats = 0;
    for (const [playerId, stats] of allPlayerStats) {
      await savePlayerStatsToDb(
        playerId,
        stats.fixtureId,
        jornada,
        stats.teamId,
        stats.rawStats,
        stats.points
      );
      savedStats++;
    }
    console.log(`✅ ${savedStats} jugadores actualizados en PlayerPremierStats (EN VIVO)\n`);

    // 4. Obtener todas las ligas de Premier League con sus miembros y squads
    const premierLeagues = await prisma.league.findMany({
      where: { division: 'premier' },
      include: {
        members: true,
      },
    });

    console.log(`🏆 Ligas de Premier League encontradas: ${premierLeagues.length}\n`);

    // 5. Calcular puntos totales por cada miembro de cada liga
    let updatedMembers = 0;
    
    for (const league of premierLeagues) {
      console.log(`\n📋 Procesando liga: ${league.name}`);
      
      for (const member of league.members) {
        // Obtener el squad del miembro con información del capitán
        const squad = await prisma.squad.findUnique({
          where: {
            userId_leagueId: {
              userId: member.userId,
              leagueId: member.leagueId,
            },
          },
          include: {
            players: {
              select: {
                playerId: true,
                isCaptain: true, // Incluir información de capitán
              },
            },
          },
        });

        if (!squad) continue;

        let totalPoints = 0;

        // Sumar puntos de los jugadores de esta jornada (x2 si es capitán)
        for (const squadPlayer of squad.players) {
          const playerStats = allPlayerStats.get(squadPlayer.playerId);
          if (playerStats) {
            const points = squadPlayer.isCaptain 
              ? playerStats.points * 2  // Capitán: puntos x2
              : playerStats.points;      // Jugador normal
            totalPoints += points;
          }
        }

        // Actualizar con el total de puntos de la jornada (no sumar a puntos anteriores)
        await prisma.leagueMember.update({
          where: {
            leagueId_userId: {
              leagueId: member.leagueId,
              userId: member.userId,
            },
          },
          data: { points: totalPoints }, // Reemplazar, no sumar
        });
        
        // Obtener el nombre del usuario
        const user = await prisma.user.findUnique({
          where: { id: member.userId },
          select: { name: true, email: true },
        });
        
        const userName = user?.name || user?.email || 'Usuario';
        console.log(`  ✅ ${userName}: ${totalPoints} puntos EN VIVO`);
        updatedMembers++;
      }
    }

    console.log(`\n🎉 Actualización EN VIVO completada (Premier League). ${updatedMembers} miembros actualizados\n`);
    console.log('═'.repeat(70));
  } catch (error) {
    console.error('\n❌ Error en updateLiveLeagueRankingsPremier:', error);
  }
}

/**
 * Ejecutar el worker
 */
async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔴 WORKER DE ACTUALIZACIÓN DE RANKINGS (PREMIER LEAGUE - PARTIDOS EN CURSO)');
  console.log('═'.repeat(70));

  await updateLiveLeagueRankingsPremier();
  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
