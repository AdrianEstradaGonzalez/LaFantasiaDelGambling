import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface BetEvaluation {
  betId: string;
  won: boolean;
  profit: number; // Ganancia neta (amount * odd - amount si ganó, -amount si perdió)
}

interface UserBalance {
  userId: string;
  totalProfit: number;
  wonBets: number;
  lostBets: number;
}

export class JornadaService {
  private static API_BASE = 'https://v3.football.api-sports.io';
  private static API_KEY = process.env.FOOTBALL_API_KEY || '099ef4c6c0803639d80207d4ac1ad5da';

  /**
   * Evaluar una apuesta individual
   */
  private static async evaluateBet(bet: any): Promise<boolean> {
    try {
      // Obtener estadísticas del partido
      const { data } = await axios.get(`${this.API_BASE}/fixtures`, {
        headers: {
          'x-rapidapi-key': this.API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
        params: { id: bet.matchId },
      });

      const fixture = data?.response?.[0];
      if (!fixture) return false;

      // Verificar que el partido haya terminado
      const status = fixture.fixture?.status?.short;
      if (!['FT', 'AET', 'PEN'].includes(status)) {
        console.log(`Partido ${bet.matchId} no ha terminado aún (status: ${status})`);
        return false;
      }

      // Obtener estadísticas detalladas
      const statsResponse = await axios.get(`${this.API_BASE}/fixtures/statistics`, {
        headers: {
          'x-rapidapi-key': this.API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
        params: { fixture: bet.matchId },
      });

      const stats = statsResponse.data?.response || [];
      const homeStats = stats[0]?.statistics || [];
      const awayStats = stats[1]?.statistics || [];

      // Helper para obtener valores
      const getValue = (teamStats: any[], type: string): number => {
        const stat = teamStats.find((s: any) => s.type === type);
        return stat ? parseInt(stat.value) || 0 : 0;
      };

      const goalsHome = fixture.goals?.home || 0;
      const goalsAway = fixture.goals?.away || 0;
      const totalGoals = goalsHome + goalsAway;

      const cornersHome = getValue(homeStats, 'Corner Kicks');
      const cornersAway = getValue(awayStats, 'Corner Kicks');
      const totalCorners = cornersHome + cornersAway;

      const yellowHome = getValue(homeStats, 'Yellow Cards');
      const yellowAway = getValue(awayStats, 'Yellow Cards');
      const redHome = getValue(homeStats, 'Red Cards');
      const redAway = getValue(awayStats, 'Red Cards');
      const totalCards = yellowHome + yellowAway + redHome + redAway;

      const labelLower = bet.betLabel.toLowerCase();
      const type = bet.betType;

      // Evaluar según el tipo de apuesta
      if (type === 'Goles totales') {
        const match = bet.betLabel.match(/(\d+\.?\d*)/);
        if (match) {
          const threshold = parseFloat(match[1]);
          if (labelLower.includes('más de')) return totalGoals > threshold;
          if (labelLower.includes('menos de')) return totalGoals < threshold;
        }
      }

      if (type === 'Goles exactos') {
        const match = bet.betLabel.match(/(\d+)/);
        if (match) return totalGoals === parseInt(match[1]);
      }

      if (type === 'Córners') {
        const match = bet.betLabel.match(/(\d+\.?\d*)/);
        if (match) {
          const threshold = parseFloat(match[1]);
          if (labelLower.includes('más de')) return totalCorners > threshold;
          if (labelLower.includes('menos de')) return totalCorners < threshold;
        }
      }

      if (type === 'Córners exactos') {
        const match = bet.betLabel.match(/(\d+)/);
        if (match) return totalCorners === parseInt(match[1]);
      }

      if (type === 'Córners par/impar') {
        if (labelLower.includes('impar')) return totalCorners % 2 === 1;
        if (labelLower.includes('par')) return totalCorners % 2 === 0;
      }

      if (type === 'Tarjetas') {
        const match = bet.betLabel.match(/(\d+\.?\d*)/);
        if (match) {
          const threshold = parseFloat(match[1]);
          if (labelLower.includes('más de')) return totalCards > threshold;
          if (labelLower.includes('menos de')) return totalCards < threshold;
        }
      }

      if (type === 'Tarjetas exactas') {
        const match = bet.betLabel.match(/(\d+)/);
        if (match) return totalCards === parseInt(match[1]);
      }

      if (type === 'Tarjetas par/impar') {
        if (labelLower.includes('impar')) return totalCards % 2 === 1;
        if (labelLower.includes('par')) return totalCards % 2 === 0;
      }

      if (type === 'Resultado') {
        const homeTeam = fixture.teams?.home?.name?.toLowerCase();
        const awayTeam = fixture.teams?.away?.name?.toLowerCase();
        
        if (labelLower.includes('ganará') && labelLower.includes(homeTeam)) {
          return goalsHome > goalsAway;
        }
        if (labelLower.includes('ganará') && labelLower.includes(awayTeam)) {
          return goalsAway > goalsHome;
        }
        if (labelLower.includes('empate')) {
          return goalsHome === goalsAway;
        }
      }

      if (type === 'Ambos marcan') {
        if (labelLower.includes('marcan') || labelLower.includes('marcarán')) {
          return goalsHome > 0 && goalsAway > 0;
        }
        if (labelLower.includes('no marcará') || labelLower.includes('al menos un equipo no')) {
          return goalsHome === 0 || goalsAway === 0;
        }
      }

      if (type === 'Par/Impar') {
        if (labelLower.includes('impar')) return totalGoals % 2 === 1;
        if (labelLower.includes('par')) return totalGoals % 2 === 0;
      }

      if (type === 'Doble oportunidad') {
        const homeWin = goalsHome > goalsAway;
        const draw = goalsHome === goalsAway;
        const awayWin = goalsAway > goalsHome;
        const homeTeam = fixture.teams?.home?.name?.toLowerCase();
        const awayTeam = fixture.teams?.away?.name?.toLowerCase();

        if (labelLower.includes('empate') && labelLower.includes(homeTeam)) {
          return homeWin || draw;
        }
        if (labelLower.includes('empate') && labelLower.includes(awayTeam)) {
          return awayWin || draw;
        }
        if (labelLower.includes(homeTeam) && labelLower.includes(awayTeam)) {
          return homeWin || awayWin;
        }
      }

      return false;
    } catch (error) {
      console.error(`Error evaluando apuesta ${bet.id}:`, error);
      return false;
    }
  }

  /**
   * Evaluar todas las apuestas pendientes de una jornada
   */
  static async evaluateJornadaBets(jornada: number, leagueId?: string): Promise<BetEvaluation[]> {
    try {
      // Obtener todas las apuestas pendientes de la jornada
      const where: any = {
        status: 'pending',
        // Aquí asumimos que las apuestas tienen relación con partidos de la jornada
        // Si no tienes un campo jornada en Bet, necesitarás ajustar esto
      };

      if (leagueId) {
        where.leagueId = leagueId;
      }

      const bets = await prisma.bet.findMany({ where });

      console.log(`📊 Evaluando ${bets.length} apuestas de la jornada ${jornada}...`);

      const evaluations: BetEvaluation[] = [];

      for (const bet of bets) {
        try {
          const won = await this.evaluateBet(bet);
          
          // Calcular ganancia
          const profit = won ? (bet.amount * bet.odd) - bet.amount : -bet.amount;

          evaluations.push({
            betId: bet.id,
            won,
            profit,
          });

          // Actualizar estado de la apuesta
          await prisma.bet.update({
            where: { id: bet.id },
            data: { status: won ? 'won' : 'lost' },
          });

          console.log(
            `  ${won ? '✅' : '❌'} Apuesta ${bet.id}: ${bet.betType} - ${bet.betLabel} ` +
            `(${bet.amount}M × ${bet.odd}) = ${won ? '+' : ''}${profit}M`
          );

          // Pequeña pausa para rate limit de la API
          await new Promise((r) => setTimeout(r, 100));
        } catch (error) {
          console.error(`Error procesando apuesta ${bet.id}:`, error);
        }
      }

      return evaluations;
    } catch (error) {
      console.error('Error evaluando apuestas de jornada:', error);
      throw error;
    }
  }

  /**
   * Calcular balance de cada usuario en una liga
   */
  static async calculateUserBalances(leagueId: string, evaluations: BetEvaluation[]): Promise<Map<string, UserBalance>> {
    const balances = new Map<string, UserBalance>();

    // Obtener todas las apuestas evaluadas con información de usuario
    const bets = await prisma.bet.findMany({
      where: {
        id: { in: evaluations.map((e) => e.betId) },
        leagueId,
      },
      include: {
        leagueMember: {
          include: {
            user: true,
          },
        },
      },
    });

    // Calcular balance por usuario
    for (const bet of bets) {
      const evaluation = evaluations.find((e) => e.betId === bet.id);
      if (!evaluation) continue;

      if (!balances.has(bet.userId)) {
        balances.set(bet.userId, {
          userId: bet.userId,
          totalProfit: 0,
          wonBets: 0,
          lostBets: 0,
        });
      }

      const userBalance = balances.get(bet.userId)!;
      userBalance.totalProfit += evaluation.profit;
      
      if (evaluation.won) {
        userBalance.wonBets++;
      } else {
        userBalance.lostBets++;
      }
    }

    return balances;
  }

  /**
   * Resetear presupuestos para nueva jornada
   */
  static async resetJornada(leagueId: string, jornada: number): Promise<{
    success: boolean;
    evaluations: BetEvaluation[];
    balances: Map<string, UserBalance>;
    updatedMembers: number;
  }> {
    try {
      console.log(`\n🔄 Iniciando cambio de jornada ${jornada} para liga ${leagueId}...\n`);

      // 1. Evaluar apuestas de la jornada anterior
      const evaluations = await this.evaluateJornadaBets(jornada, leagueId);
      console.log(`\n✅ ${evaluations.length} apuestas evaluadas\n`);

      // 2. Calcular balances por usuario
      const balances = await this.calculateUserBalances(leagueId, evaluations);
      console.log(`💰 Balances calculados para ${balances.size} usuarios\n`);

      // 3. Actualizar presupuestos de los miembros
      let updatedMembers = 0;

      for (const [userId, balance] of balances) {
        const member = await prisma.leagueMember.findUnique({
          where: {
            leagueId_userId: { leagueId, userId },
          },
        });

        if (member) {
          const newBudget = 500 + balance.totalProfit;
          
          await prisma.leagueMember.update({
            where: {
              leagueId_userId: { leagueId, userId },
            },
            data: {
              budget: newBudget,
              initialBudget: newBudget,
              bettingBudget: 250, // Resetear presupuesto de apuestas
            },
          });

          console.log(
            `  👤 Usuario ${userId}: ${balance.wonBets}W/${balance.lostBets}L = ` +
            `${balance.totalProfit >= 0 ? '+' : ''}${balance.totalProfit}M → Nuevo presupuesto: ${newBudget}M`
          );

          updatedMembers++;
        }
      }

      // 4. Resetear usuarios que no tuvieron apuestas
      const allMembers = await prisma.leagueMember.findMany({
        where: { leagueId },
      });

      for (const member of allMembers) {
        if (!balances.has(member.userId)) {
          await prisma.leagueMember.update({
            where: {
              leagueId_userId: { leagueId, userId: member.userId },
            },
            data: {
              budget: 500,
              initialBudget: 500,
              bettingBudget: 250,
            },
          });

          console.log(`  👤 Usuario ${member.userId}: Sin apuestas → Presupuesto: 500M`);
          updatedMembers++;
        }
      }

      console.log(`\n✨ Cambio de jornada completado: ${updatedMembers} miembros actualizados\n`);

      return {
        success: true,
        evaluations,
        balances,
        updatedMembers,
      };
    } catch (error) {
      console.error('❌ Error en cambio de jornada:', error);
      throw error;
    }
  }

  /**
   * Resetear todas las ligas para una nueva jornada
   */
  static async resetAllLeagues(jornada: number): Promise<{
    success: boolean;
    leaguesProcessed: number;
    totalEvaluations: number;
  }> {
    try {
      console.log(`\n🌍 Iniciando cambio de jornada ${jornada} para TODAS las ligas...\n`);

      const leagues = await prisma.league.findMany();
      let totalEvaluations = 0;

      for (const league of leagues) {
        console.log(`\n📋 Procesando liga: ${league.name} (${league.id})`);
        const result = await this.resetJornada(league.id, jornada);
        totalEvaluations += result.evaluations.length;
      }

      console.log(`\n✨ Cambio de jornada completado para ${leagues.length} ligas\n`);

      return {
        success: true,
        leaguesProcessed: leagues.length,
        totalEvaluations,
      };
    } catch (error) {
      console.error('❌ Error en cambio de jornada global:', error);
      throw error;
    }
  }
}
