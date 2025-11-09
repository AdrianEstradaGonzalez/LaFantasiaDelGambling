import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// IDs de los partidos que necesitan re-evaluación
const MATCH_IDS = [1390919, 1390920, 1390921, 1390926, 1390934];

interface MatchStats {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeCorners: number;
  awayCorners: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homeShotsOnGoal: number;
  awayShotsOnGoal: number;
}

async function getMatchStats(matchId: number): Promise<MatchStats | null> {
  try {
    console.log(`🔍 Obteniendo estadísticas del partido ${matchId} desde la API...`);
    
    const response = await axios.get(
      `https://v3.football.api-sports.io/fixtures`,
      {
        params: { id: matchId },
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      }
    );

    const fixture = response.data.response[0];
    if (!fixture) {
      console.log(`❌ No se encontró el partido ${matchId}`);
      return null;
    }

    const stats = fixture.statistics;
    const homeStats = stats?.find((s: any) => s.team.id === fixture.teams.home.id);
    const awayStats = stats?.find((s: any) => s.team.id === fixture.teams.away.id);

    const getStat = (teamStats: any, type: string): number => {
      const stat = teamStats?.statistics?.find((s: any) => s.type === type);
      return stat ? parseInt(stat.value) || 0 : 0;
    };

    const matchStats = {
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      homeGoals: fixture.goals.home ?? 0,
      awayGoals: fixture.goals.away ?? 0,
      homeCorners: getStat(homeStats, 'Corner Kicks'),
      awayCorners: getStat(awayStats, 'Corner Kicks'),
      homeYellowCards: getStat(homeStats, 'Yellow Cards'),
      awayYellowCards: getStat(awayStats, 'Yellow Cards'),
      homeRedCards: getStat(homeStats, 'Red Cards'),
      awayRedCards: getStat(awayStats, 'Red Cards'),
      homeShotsOnGoal: getStat(homeStats, 'Shots on Goal'),
      awayShotsOnGoal: getStat(awayStats, 'Shots on Goal')
    };

    console.log(`✅ Resultado: ${matchStats.homeTeam} ${matchStats.homeGoals}-${matchStats.awayGoals} ${matchStats.awayTeam}`);
    
    return matchStats;
  } catch (error: any) {
    console.error(`❌ Error obteniendo estadísticas del partido ${matchId}:`, error.message);
    return null;
  }
}

function evaluateBet(
  betType: string,
  betLabel: string,
  stats: MatchStats
): { won: boolean; actualResult: string } {
  // PORTERÍA A CERO (CLEAN SHEET)
  if (betType.toLowerCase().includes('portería') && betType.toLowerCase().includes('cero')) {
    const isLocal = betType.toLowerCase().includes('local');
    const isVisitante = betType.toLowerCase().includes('visitante');
    const labelLower = betLabel.toLowerCase();
    const isSi = labelLower === 'sí' || labelLower === 'si';
    
    if (isLocal) {
      const cleanSheet = stats.awayGoals === 0;
      return {
        won: isSi ? cleanSheet : !cleanSheet,
        actualResult: `${stats.homeTeam} encajó ${stats.awayGoals} goles`
      };
    }
    
    if (isVisitante) {
      const cleanSheet = stats.homeGoals === 0;
      return {
        won: isSi ? cleanSheet : !cleanSheet,
        actualResult: `${stats.awayTeam} encajó ${stats.homeGoals} goles`
      };
    }
  }

  // Para otras apuestas, no las evaluamos aquí
  return {
    won: false,
    actualResult: 'Tipo de apuesta no soportado en este script'
  };
}

async function reevaluateMatchBets() {
  try {
    console.log('🔄 Re-evaluando apuestas de Portería a Cero para partidos específicos...\n');

    let totalUpdated = 0;

    for (const matchId of MATCH_IDS) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📍 Procesando partido ${matchId}`);
      console.log('='.repeat(60));

      // Obtener estadísticas del partido desde la API
      const stats = await getMatchStats(matchId);

      if (!stats) {
        console.log(`⚠️  No se pudieron obtener las estadísticas, saltando...`);
        continue;
      }

      // Obtener todas las apuestas de Portería a Cero de este partido
      const bets = await prisma.bet.findMany({
        where: {
          matchId: matchId,
          betType: {
            contains: 'Portería a Cero'
          }
        }
      });

      console.log(`📊 Encontradas ${bets.length} apuestas de Portería a Cero`);

      // Evaluar cada apuesta
      for (const bet of bets) {
        const evaluation = evaluateBet(bet.betType, bet.betLabel, stats);
        const newStatus = evaluation.won ? 'won' : 'lost';

        // Actualizar la apuesta
        await prisma.bet.update({
          where: { id: bet.id },
          data: {
            status: newStatus,
            apiValue: evaluation.actualResult,
            evaluatedAt: new Date()
          }
        });

        console.log(`   ✅ ${bet.betType} - ${bet.betLabel}: ${bet.status} → ${newStatus}`);
        totalUpdated++;
      }

      // Pequeño delay para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ PROCESO COMPLETADO');
    console.log(`📊 Total de apuestas actualizadas: ${totalUpdated}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
reevaluateMatchBets();
