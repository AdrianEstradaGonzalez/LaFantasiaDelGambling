import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { calculatePlayerPointsTotal as calculatePlayerPointsService, normalizeRole } from '../shared/pointsCalculator.js';
import { PlayerService } from './player.service.js';
import { generateBetOptionsForAllLeagues } from '../utils/betOptionsGenerator.js';

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
  squadPoints: number; // Puntos conseguidos por la plantilla
}

const squadRoleMap: Record<string, "Goalkeeper" | "Defender" | "Midfielder" | "Attacker"> = {
  POR: "Goalkeeper",
  GK: "Goalkeeper",
  DEF: "Defender",
  DF: "Defender",
  CEN: "Midfielder",
  MID: "Midfielder",
  CM: "Midfielder",
  DM: "Midfielder",
  AM: "Midfielder",
  DEL: "Attacker",
  ATT: "Attacker",
  FW: "Attacker",
};

function mapSquadRole(role: string | null | undefined): "Goalkeeper" | "Defender" | "Midfielder" | "Attacker" {
  if (!role) return "Midfielder";
  const upper = role.trim().toUpperCase();
  return squadRoleMap[upper] ?? normalizeRole(role);
}

export class JornadaService {
  private static API_BASE = 'https://v3.football.api-sports.io';
  private static API_KEY = process.env.FOOTBALL_API_KEY || '099ef4c6c0803639d80207d4ac1ad5da';
  private static SEASON = 2025; // Temporada actual de La Liga

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

      // Doble oportunidad eliminado - redundante con 'Resultado'

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
          // Si gana: suma lo ganado (potentialWin)
          // Si pierde: resta lo apostado (amount)
          const profit = won ? (bet.amount * bet.odd) : -bet.amount;

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
          squadPoints: 0,
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
   * Buscar la última jornada con partidos terminados (con estadísticas disponibles)
   */
  public static async findLastCompletedJornada(targetJornada: number): Promise<number> {
    try {
      console.log(`🔍 Buscando última jornada con estadísticas disponibles (objetivo: ${targetJornada})...`);
      
      // Intentar desde la jornada objetivo hacia atrás hasta encontrar una con partidos terminados
      for (let j = targetJornada; j >= 1; j--) {
        try {
          // Probar con temporada actual y, si no hay datos, con la anterior
          const seasonsToTry = [this.SEASON, this.SEASON - 1];
          let fixtures: any[] = [];
          let usedSeason: number | null = null;
          for (const season of seasonsToTry) {
            const { data } = await axios.get(`${this.API_BASE}/fixtures`, {
              headers: {
                'x-rapidapi-key': this.API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io',
              },
              params: {
                league: 140,
                season,
                round: `Regular Season - ${j}`,
              },
              timeout: 10000,
            });
            fixtures = data?.response || [];
            if (fixtures.length > 0) { usedSeason = season; break; }
            await new Promise(r => setTimeout(r, 150));
          }
          if (usedSeason) {
            console.log(`   🔁 Jornada ${j}: usando season ${usedSeason} (fixtures: ${fixtures.length})`);
          }
          
          if (fixtures.length > 0) {
            // Verificar si al menos un partido está terminado
            const hasFinishedMatches = fixtures.some((f: any) => 
              ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short)
            );
            
            if (hasFinishedMatches) {
              console.log(`✅ Jornada ${j} tiene partidos terminados. Usando esta jornada para calcular puntos.`);
              return j;
            } else {
              console.log(`⚠️ Jornada ${j} encontrada pero sin partidos terminados. Continuando búsqueda...`);
            }
          }
          
          // Pausa para evitar rate limiting
          await new Promise(r => setTimeout(r, 200));
        } catch (error) {
          console.log(`⚠️ Error consultando jornada ${j}, continuando búsqueda...`);
        }
      }
      
      // Si no encuentra ninguna jornada con estadísticas, usar la objetivo
      console.log(`⚠️ No se encontraron jornadas con estadísticas. Usando jornada objetivo ${targetJornada}.`);
      return targetJornada;
    } catch (error) {
      console.error(`❌ Error buscando última jornada completada:`, error);
      return targetJornada; // Fallback a jornada objetivo
    }
  }

  /**
   * Calcular puntos de la plantilla de un usuario en una jornada
   * Busca automáticamente la última jornada con estadísticas disponibles
   */
  private static async calculateSquadPoints(userId: string, leagueId: string, jornadaObjetivo: number): Promise<number> {
    try {
      // ✅ USAR SIEMPRE LA JORNADA OBJETIVO (la que se está cerrando)
      // No buscar hacia atrás - si el jugador no jugó, tendrá 0 puntos
      const jornada = jornadaObjetivo;
      console.log(`    🔍 Calculando puntos para userId=${userId}, leagueId=${leagueId}, jornada=${jornada}`);
      // Obtener jornada actual de la liga para decidir uso de cache
      const league = await prisma.league.findUnique({ where: { id: leagueId } });
      const leagueJornada = league?.currentJornada ?? jornada;
      
      // Obtener la plantilla del usuario
      const squad = await prisma.squad.findUnique({
        where: {
          userId_leagueId: { userId, leagueId },
        },
        include: {
          players: true,
        },
      });

      if (!squad || !squad.players || squad.players.length === 0) {
        console.log(`    ⚠️  Sin plantilla o plantilla vacía`);
        return 0;
      }

      console.log(`    📋 Plantilla encontrada con ${squad.players.length} jugadores`);

      // 🔴 REGLA: Si no tiene 11 jugadores, 0 puntos
      if (squad.players.length < 11) {
        console.log(`    ❌ REGLA DE 11 JUGADORES: Solo ${squad.players.length}/11 jugadores - 0 puntos`);
        return 0;
      }

      console.log(`    ✅ Plantilla válida (${squad.players.length} jugadores). Calculando puntos...`);

      let totalPoints = 0;
      const playerPointsMap = new Map<number, number>();

      // Obtener estadísticas de cada jugador para la jornada
      for (const squadPlayer of squad.players) {
        playerPointsMap.set(squadPlayer.playerId, 0);
        try {
          console.log(`\n      🔍 ===== PROCESANDO JUGADOR =====`);
          console.log(`         Nombre: ${squadPlayer.playerName}`);
          console.log(`         ID: ${squadPlayer.playerId}`);
          console.log(`         Rol: ${squadPlayer.role}`);
          console.log(`         Posición: ${squadPlayer.position}`);
          console.log(`         Es Capitán: ${squadPlayer.isCaptain ? '⭐ SÍ' : 'No'}`);
          console.log(`         Jornada a buscar: ${jornada}`);
          
          let playerPoints = 0;

          // ✅ IMPORTANTE: Solo usar cache si lastJornadaNumber coincide con la jornada que estamos cerrando
          const localPlayer = await prisma.playerStats.findFirst({ where: {playerId: squadPlayer.playerId, jornada: jornada} });
          if (localPlayer && leagueJornada === jornada) {
            const cachedPoints = Math.trunc(Number((localPlayer as any).totalPoints ?? 0));
            playerPointsMap.set(squadPlayer.playerId, cachedPoints);
            
            // Aplicar doble si es capitán
            const pointsToAdd = squadPlayer.isCaptain ? cachedPoints * 2 : cachedPoints;
            console.log(`         ♻️ Usando cache (jornada ${jornada}): ${cachedPoints} puntos`);
            if (squadPlayer.isCaptain) {
              console.log(`         ⭐ CAPITÁN - Puntos doblados: ${cachedPoints} × 2 = ${pointsToAdd}`);
            }
            totalPoints += pointsToAdd;
            console.log(`         💰 Total acumulado: ${totalPoints}`);
            console.log(`         ====================================\n`);
            await new Promise((r) => setTimeout(r, 50));
            continue;
          }
        
          // PASO 1: Obtener información del jugador para saber su equipo
          // Preferimos nuestra BD local (más fiable y sin rate-limit)
          let playerTeamId: number | undefined;
          let playerTeamName: string | undefined;
          try {
            const localPlayer = await prisma.player.findUnique({ where: { id: squadPlayer.playerId } });
            if (localPlayer?.teamId) {
              playerTeamId = localPlayer.teamId as unknown as number;
              playerTeamName = localPlayer.teamName || undefined;
              console.log(`         🗂️ Equipo (BD local): ${playerTeamName ?? 'desconocido'} (ID: ${playerTeamId})`);
            }
          } catch (e) {
            console.log(`         ⚠️ No se pudo leer el equipo desde BD local`);
          }

          // Si no lo tenemos en BD, intentamos API (fallback)
          if (!playerTeamId) {
            try {
              const playerInfoResponse = await axios.get(`${this.API_BASE}/players`, {
                headers: {
                  'x-rapidapi-key': this.API_KEY,
                  'x-rapidapi-host': 'v3.football.api-sports.io',
                },
                params: { 
                  id: squadPlayer.playerId, 
                  season: this.SEASON,
                  league: 140
                },
                timeout: 10000,
              });
              const playerInfo = playerInfoResponse.data?.response?.[0];
              if (playerInfo?.statistics?.[0]?.team?.id) {
                playerTeamId = playerInfo.statistics[0].team.id;
                playerTeamName = playerInfo.statistics[0].team.name;
                console.log(`         🌐 Equipo (API): ${playerTeamName} (ID: ${playerTeamId})`);
              }
            } catch (e: any) {
              console.log(`         ⚠️ Error consultando API de jugador: ${e?.message || e}`);
            }
          }

          if (!playerTeamId) {
            console.log(`         ❌ No se pudo determinar el equipo del jugador. Saltando.`);
            continue;
          }

          console.log(`         🏟️ Equipo usado: ${playerTeamName ?? 'desconocido'} (ID: ${playerTeamId})`);
          
          // PASO 2: Obtener partidos de la jornada
          // Intentar fixtures con season actual y fallback a anterior
          let fixtures: any[] = [];
          let usedSeason: number | null = null;
          for (const season of [this.SEASON, this.SEASON - 1]) {
            const fixturesResponse = await axios.get(`${this.API_BASE}/fixtures`, {
              headers: {
                'x-rapidapi-key': this.API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io',
              },
              params: {
                league: 140,
                season,
                round: `Regular Season - ${jornada}`,
              },
            });
            fixtures = fixturesResponse.data?.response || [];
            if (Array.isArray(fixtures) && fixtures.length > 0) { usedSeason = season; break; }
            await new Promise(r => setTimeout(r, 120));
          }
          if (!Array.isArray(fixtures) || fixtures.length === 0) {
            console.log(`         ⚠️ No hay fixtures para la jornada ${jornada} (tried seasons: ${this.SEASON}, ${this.SEASON - 1})`);
            continue;
          }
          console.log(`         📅 ${fixtures.length} partidos en jornada ${jornada} (season ${usedSeason ?? this.SEASON})`);
          
          // PASO 3: Buscar el partido donde jugó su equipo
          const teamFixture = fixtures.find((f: any) => 
            f.teams?.home?.id === playerTeamId || f.teams?.away?.id === playerTeamId
          );

          if (!teamFixture) {
            console.log(`         ⚠️ ${playerTeamName ?? 'Equipo'} no tiene partido en jornada ${jornada}`);
            continue;
          }

          const isHomeTeam = teamFixture.teams?.home?.id === playerTeamId;
          console.log(`         🔎 Partido: ${teamFixture.teams?.home?.name} vs ${teamFixture.teams?.away?.name}`);
          console.log(`         📊 Estado: ${teamFixture.fixture?.status?.short} | Fixture ID: ${teamFixture.fixture.id}`);
          const statusShort = teamFixture.fixture?.status?.short as string | undefined;
          // Opcional: solo contar si el partido al menos ha empezado
          if (!statusShort || ['CANC','PST','TBD','NS'].includes(statusShort)) {
            console.log(`         ⏭️ Partido no iniciado o inválido para puntos (status: ${statusShort})`);
            continue;
          }
          
          // PASO 4: Obtener estadísticas del partido
          const statsResponse = await axios.get(`${this.API_BASE}/fixtures/players`, {
            headers: {
              'x-rapidapi-key': this.API_KEY,
              'x-rapidapi-host': 'v3.football.api-sports.io',
            },
            params: { fixture: teamFixture.fixture.id },
          });

          const teamsData = statsResponse.data?.response || [];
          if (!Array.isArray(teamsData) || teamsData.length === 0) {
            console.log(`         ⚠️ Sin estadísticas disponibles para este partido`);
            continue;
          }

          // PASO 5: Buscar las estadísticas del jugador
          let playerStats: any = null;
          for (const teamData of teamsData) {
            const teamName = teamData?.team?.name;
            const playersArr = Array.isArray(teamData?.players) ? teamData.players : [];
            const found = playersArr.find((p: any) => p?.player?.id === squadPlayer.playerId);
            if (found?.statistics?.[0]) {
              playerStats = found.statistics[0];
              console.log(`         ✅ ¡Encontrado en ${teamName}!`);
              console.log(`         ⏱️ Minutos: ${playerStats?.games?.minutes || 0}`);
              break;
            }
          }

          
          if (!playerStats) {
            // Fallbacks específicos para porteros: algunos partidos no devuelven el ID esperado
            const roleExpected = mapSquadRole(squadPlayer.role);
            if (roleExpected === 'Goalkeeper') {
              const normalizeName = (value: string) =>
                value
                  .normalize('NFD')
                  .replace(/\p{Diacritic}+/gu, '')
                  .toLowerCase();
              const targetName = normalizeName(String(squadPlayer.playerName || ''));
              for (const teamData of teamsData) {
                const playersArr = Array.isArray(teamData?.players) ? teamData.players : [];
                const byName = playersArr.find((p: any) => {
                  const nm = normalizeName(String(p?.player?.name || ''));
                  return nm && nm === targetName && p?.statistics?.[0];
                });
                if (byName?.statistics?.[0]) {
                  playerStats = byName.statistics[0];
                  break;
                }
              }
              if (!playerStats) {
                for (const teamData of teamsData) {
                  const playersArr = Array.isArray(teamData?.players) ? teamData.players : [];
                  const gk = playersArr.find((p: any) => {
                    const pos = String(p?.statistics?.[0]?.games?.position || '')
                      .trim()
                      .toLowerCase();
                    const mins = Number(p?.statistics?.[0]?.games?.minutes || 0);
                    return mins > 0 && (pos === 'g' || pos === 'gk' || pos.includes('goal'));
                  });
                  if (gk?.statistics?.[0]) {
                    playerStats = gk.statistics[0];
                    break;
                  }
                }
              }
            }

            if (!playerStats) {
              console.log(
                `         ⚠️ No participó en el partido (no convocado/lesionado/suplente sin jugar)`
              );
              continue;
            }
          }


          // PASO 6: Calcular puntos
          playerPoints = calculatePlayerPointsService(playerStats, mapSquadRole(squadPlayer.role));
          const roundedPoints = Math.trunc(Number(playerPoints) || 0);
          playerPointsMap.set(squadPlayer.playerId, roundedPoints);
          console.log(`         ⚽ PUNTOS: ${roundedPoints}`);
          
          // Aplicar doble si es capitán
          const pointsToAdd = squadPlayer.isCaptain ? roundedPoints * 2 : roundedPoints;
          if (squadPlayer.isCaptain) {
            console.log(`         ⭐ CAPITÁN - Puntos doblados: ${roundedPoints} × 2 = ${pointsToAdd}`);
          }
          
          totalPoints += pointsToAdd;
          console.log(`         💰 Total acumulado: ${totalPoints}`);
          console.log(`         ====================================\n`);

          // Pequeña pausa para evitar rate limit
          await new Promise((r) => setTimeout(r, 150));
        } catch (error: any) {
          console.error(`      ❌ Error con ${squadPlayer.playerName}:`, error.message);
        }
      }

      if (playerPointsMap.size > 0) {
        for (const [playerId, points] of playerPointsMap.entries()) {
          try {
            await PlayerService.updateLastJornadaPoints(playerId, points, jornada);
          } catch (error) {
            console.warn(`    ⚠️ No se pudo actualizar puntos cacheados para jugador ${playerId}:`, error);
          }
        }
      }

      console.log(`    📊 TOTAL PUNTOS PLANTILLA: ${totalPoints}`);
      return totalPoints;
    } catch (error) {
      console.error('❌ Error calculando puntos de plantilla:', error);
      return 0;
    }
  }

  /**
   * Calcular puntos de un jugador según DreamLeague
  /**
   * Resetear presupuestos para nueva jornada
   */
  static async resetJornada(leagueId: string, jornada: number): Promise<{
    success: boolean;
    evaluations: BetEvaluation[];
    balances: Map<string, UserBalance>;
    updatedMembers: number;
    clearedSquads: number;
    deletedBets: number;
  }> {
    try {
      console.log(`\n🔄 Iniciando cambio de jornada ${jornada} para liga ${leagueId}...\n`);

      // 1. Evaluar apuestas de la jornada anterior
      const evaluations = await this.evaluateJornadaBets(jornada, leagueId);
      console.log(`\n✅ ${evaluations.length} apuestas evaluadas\n`);

      // 2. Calcular balances por usuario
      const balances = await this.calculateUserBalances(leagueId, evaluations);
      console.log(`💰 Balances de apuestas calculados para ${balances.size} usuarios\n`);

      // 3. Calcular puntos de plantilla para cada usuario
      const allMembers = await prisma.leagueMember.findMany({
        where: { leagueId },
        include: {
          user: true,
        },
      });

      console.log(`\n⚽ Calculando puntos de plantilla para ${allMembers.length} miembros...\n`);

      for (const member of allMembers) {
        console.log(`\n📊 Procesando usuario: ${member.user.name} (${member.userId})`);
        const squadPoints = await this.calculateSquadPoints(member.userId, leagueId, jornada);
        
        // Actualizar o crear balance del usuario
        if (!balances.has(member.userId)) {
          balances.set(member.userId, {
            userId: member.userId,
            totalProfit: 0,
            wonBets: 0,
            lostBets: 0,
            squadPoints: 0,
          });
        }
        
        const userBalance = balances.get(member.userId)!;
        userBalance.squadPoints = squadPoints;

        console.log(`  ✅ ${member.user.name}: ${squadPoints} puntos de plantilla`);
      }

      console.log(`\n✅ Puntos de plantilla calculados\n`);

      // 4. Actualizar presupuestos de los miembros y vaciar plantillas
      let updatedMembers = 0;

      for (const [userId, balance] of balances) {
        const member = await prisma.leagueMember.findUnique({
          where: {
            leagueId_userId: { leagueId, userId },
          },
        });

        if (member) {
          // Calcular nuevo presupuesto: budget actual + profit apuestas + 1M por cada punto de plantilla
          const budgetFromBets = balance.totalProfit;
          const budgetFromSquad = balance.squadPoints; // 1M por punto
          const newBudget = member.budget + budgetFromBets + budgetFromSquad;
          
          // Actualizar también los puntos totales del miembro en la liga
          const newTotalPoints = member.points + balance.squadPoints;
          
          await prisma.leagueMember.update({
            where: {
              leagueId_userId: { leagueId, userId },
            },
            data: {
              budget: newBudget,
              initialBudget: newBudget,
              bettingBudget: 250, // Resetear presupuesto de apuestas
              points: newTotalPoints, // Actualizar puntos totales
            },
          });

          console.log(
            `  👤 Usuario ${userId}:\n` +
            `     Budget anterior: ${member.budget}M\n` +
            `     Apuestas: ${balance.wonBets}W/${balance.lostBets}L = ${budgetFromBets >= 0 ? '+' : ''}${budgetFromBets}M\n` +
            `     Plantilla: ${balance.squadPoints} puntos = +${budgetFromSquad}M\n` +
            `     Nuevo presupuesto: ${newBudget}M\n` +
            `     Puntos totales: ${member.points} + ${balance.squadPoints} = ${newTotalPoints}`
          );

          updatedMembers++;
        }
      }

      console.log(`\n✨ Cambio de jornada completado: ${updatedMembers} miembros actualizados\n`);

      // 5. Vaciar TODAS las plantillas de la liga (incluso usuarios sin balance)
      console.log(`🗑️  Vaciando todas las plantillas de la liga ${leagueId}...\n`);
      
      const allSquads = await prisma.squad.findMany({
        where: { leagueId },
      });

      let clearedSquads = 0;
      for (const squad of allSquads) {
        const deletedPlayers = await prisma.squadPlayer.deleteMany({
          where: { squadId: squad.id },
        });
        
        if (deletedPlayers.count > 0) {
          console.log(`  🗑️  Usuario ${squad.userId}: ${deletedPlayers.count} jugadores eliminados de plantilla`);
          clearedSquads++;
        }
      }
      
      console.log(`\n✅ ${clearedSquads} plantillas vaciadas en total\n`);

      // 6. NO eliminamos apuestas - solo las mantenemos evaluadas para historial
      // Las apuestas permanecen en la BBDD con su estado (won/lost/pending)
      console.log(`� Apuestas mantenidas en BBDD para historial\n`);

      return {
        success: true,
        evaluations,
        balances,
        updatedMembers,
        clearedSquads,
        deletedBets: 0, // Ya no borramos apuestas
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

  /**
   * Abrir jornada (era "Cerrar") - Bloquea apuestas y modificaciones de plantilla
   * Usa la jornada actual de la liga
   */
  static async openJornada(leagueId: string): Promise<{
    success: boolean;
    message: string;
    leagueName: string;
    jornada: number;
  }> {
    try {
      // Obtener liga con su jornada actual
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      if (!league) {
        throw new Error('Liga no encontrada');
      }

      const jornada = league.currentJornada;
      console.log(`🔒 Abriendo jornada ${jornada} para liga ${leagueId}...`);

      // Actualizar estado de la jornada a "closed" (bloqueado)
      await prisma.league.update({
        where: { id: leagueId },
        data: {
          jornadaStatus: 'closed'
        }
      });

      // Resetear budget de todos los miembros al valor de initialBudget
      console.log(`💰 Reseteando budget de todos los miembros a initialBudget...`);
      const members = await prisma.leagueMember.findMany({
        where: { leagueId }
      });

      for (const member of members) {
        await prisma.leagueMember.update({
          where: {
            leagueId_userId: { leagueId, userId: member.userId }
          },
          data: {
            budget: member.initialBudget
          }
        });
        console.log(`  👤 Usuario ${member.userId}: budget reseteado de ${member.budget}M a ${member.initialBudget}M`);
      }

      console.log(`✅ Jornada ${jornada} abierta (bloqueada) para liga "${league.name}"`);

      return {
        success: true,
        message: `Jornada ${jornada} abierta (bloqueada) exitosamente`,
        leagueName: league.name,
        jornada
      };
    } catch (error) {
      console.error('❌ Error abriendo jornada:', error);
      throw error;
    }
  }

  /**
   * Cerrar jornada (era "Abrir") - Permite apuestas y modificaciones de plantilla
   * Usa la jornada actual de la liga
   */
  static async closeJornada(leagueId: string): Promise<{
    success: boolean;
    message: string;
    leagueName: string;
    jornada: number;
    evaluations: BetEvaluation[];
    updatedMembers: number;
    clearedSquads: number;
    deletedBetOptions: number;
  }> {
    try {
      // Obtener liga con su jornada actual
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      if (!league) {
        throw new Error('Liga no encontrada');
      }

      const jornada = league.currentJornada;
      console.log(`\n🔒 CERRANDO JORNADA ${jornada} para liga "${league.name}" (${leagueId})...\n`);

      // 1. Evaluar apuestas de la jornada actual
      console.log(`📊 1. Evaluando apuestas de jornada ${jornada}...`);
      const evaluations = await this.evaluateJornadaBets(jornada, leagueId);
      console.log(`✅ ${evaluations.length} apuestas evaluadas\n`);

      // 2. Calcular balances por usuario (apuestas)
      console.log(`💰 2. Calculando balances de apuestas...`);
      const balances = await this.calculateUserBalances(leagueId, evaluations);
      console.log(`✅ Balances calculados para ${balances.size} usuarios\n`);

      // 3. Calcular puntos de plantilla para cada usuario
      console.log(`⚽ 3. Calculando puntos de plantilla...`);
      const allMembers = await prisma.leagueMember.findMany({
        where: { leagueId },
        include: { user: true },
      });

      for (const member of allMembers) {
        const squadPoints = await this.calculateSquadPoints(member.userId, leagueId, jornada);
        
        // Actualizar o crear balance del usuario
        if (!balances.has(member.userId)) {
          balances.set(member.userId, {
            userId: member.userId,
            totalProfit: 0,
            wonBets: 0,
            lostBets: 0,
            squadPoints: 0,
          });
        }
        
        const userBalance = balances.get(member.userId)!;
        userBalance.squadPoints = squadPoints;
      }
      console.log(`✅ Puntos de plantilla calculados\n`);

      // 4. Actualizar presupuestos y puntos de los miembros
      console.log(`💵 4. Actualizando presupuestos...`);
      let updatedMembers = 0;

      for (const [userId, balance] of balances) {
        const member = await prisma.leagueMember.findUnique({
          where: { leagueId_userId: { leagueId, userId } },
          include: { user: true },
        });

        if (member) {
          // Calcular nuevo presupuesto: 500 (base) + puntos plantilla + resultado apuestas
          const budgetFromBets = balance.totalProfit;
          const budgetFromSquad = balance.squadPoints; // 1M por punto
          const newBudget = 500 + budgetFromSquad + budgetFromBets;
          
          // Actualizar puntos totales
          const newTotalPoints = member.points + balance.squadPoints;
          
          // Actualizar puntos por jornada
          const pointsPerJornada = (member.pointsPerJornada as any) || {};
          pointsPerJornada[jornada.toString()] = balance.squadPoints;
          
          await prisma.leagueMember.update({
            where: { leagueId_userId: { leagueId, userId } },
            data: {
              budget: newBudget,
              initialBudget: newBudget, // Actualizar initialBudget con el nuevo valor calculado
              bettingBudget: 250, // Siempre resetear a 250
              points: newTotalPoints,
              pointsPerJornada: pointsPerJornada, // Guardar puntos de esta jornada
            },
          });

          console.log(
            `  👤 Usuario ${member.user.name}:\n` +
            `     Presupuesto anterior: ${member.budget}M\n` +
            `     Base: 500M\n` +
            `     Apuestas: ${balance.wonBets}W/${balance.lostBets}L = ${budgetFromBets >= 0 ? '+' : ''}${budgetFromBets}M\n` +
            `     Plantilla: ${balance.squadPoints} puntos = +${budgetFromSquad}M\n` +
            `     Nuevo presupuesto: ${newBudget}M\n` +
            `     Puntos J${jornada}: ${balance.squadPoints}\n` +
            `     Puntos totales: ${member.points} → ${newTotalPoints}`
          );

          updatedMembers++;
        }
      }
      console.log(`✅ ${updatedMembers} miembros actualizados\n`);

      // 5. Vaciar TODAS las plantillas de la liga
      console.log(`🗑️  5. Vaciando plantillas...`);
      const allSquads = await prisma.squad.findMany({
        where: { leagueId },
      });

      let clearedSquads = 0;
      for (const squad of allSquads) {
        const deletedPlayers = await prisma.squadPlayer.deleteMany({
          where: { squadId: squad.id },
        });
        
        if (deletedPlayers.count > 0) {
          clearedSquads++;
        }
      }
      console.log(`✅ ${clearedSquads} plantillas vaciadas\n`);

      // 6. Eliminar opciones de apuestas de la jornada actual
      console.log(`🗑️  6. Eliminando opciones de apuestas antiguas...`);
      const deletedBetOptions = await prisma.bet_option.deleteMany({
        where: {
          leagueId,
          jornada,
        },
      });
      console.log(`✅ ${deletedBetOptions.count} opciones de apuestas eliminadas\n`);

      // 7. NO eliminamos apuestas - solo las mantenemos evaluadas para historial
      // Las apuestas permanecen en la BBDD con su estado (won/lost/pending)
      console.log(`📊 Apuestas mantenidas en BBDD para historial\n`);

      // 8. Avanzar jornada y cambiar estado
      console.log(`⏭️  8. Avanzando jornada...`);
      const nextJornada = jornada + 1;
      await prisma.league.update({
        where: { id: leagueId },
        data: {
          currentJornada: nextJornada,
          jornadaStatus: 'open',
        },
      });
      console.log(`✅ Liga avanzada a jornada ${nextJornada} con estado "open"\n`);

      // 9. Generar opciones de apuesta para la nueva jornada
      console.log(`🎲 9. Generando opciones de apuesta para jornada ${nextJornada}...`);
      try {
        const betResult = await generateBetOptionsForAllLeagues(nextJornada);
        console.log(`✅ Apuestas generadas: ${betResult.totalOptions} opciones para ${betResult.leaguesUpdated} ligas\n`);
      } catch (error: any) {
        console.error(`⚠️  Error generando apuestas (continuando): ${error.message}\n`);
      }

      console.log(`\n🎉 JORNADA ${jornada} CERRADA EXITOSAMENTE\n`);
      console.log(`📊 Resumen:`);
      console.log(`   - ${evaluations.length} apuestas evaluadas`);
      console.log(`   - ${updatedMembers} miembros actualizados`);
      console.log(`   - ${clearedSquads} plantillas vaciadas`);
      console.log(`   - ${deletedBetOptions.count} opciones de apuestas eliminadas`);
      console.log(`   - Jornada actual: ${nextJornada}\n`);

      return {
        success: true,
        message: `Jornada ${jornada} cerrada exitosamente. Nueva jornada: ${nextJornada}`,
        leagueName: league.name,
        jornada: nextJornada,
        evaluations,
        updatedMembers,
        clearedSquads,
        deletedBetOptions: deletedBetOptions.count,
      };
    } catch (error) {
      console.error('❌ Error cerrando jornada:', error);
      throw error;
    }
  }

  /**
   * Obtener estado de la jornada actual
   */
  static async getJornadaStatus(leagueId: string): Promise<{
    currentJornada: number;
    status: string; // 'open' o 'closed'
    leagueName: string;
  }> {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: {
          name: true,
          currentJornada: true,
          jornadaStatus: true
        }
      });

      if (!league) {
        throw new Error('Liga no encontrada');
      }

      return {
        currentJornada: league.currentJornada,
        status: league.jornadaStatus,
        leagueName: league.name
      };
    } catch (error) {
      console.error('❌ Error obteniendo estado de jornada:', error);
      throw error;
    }
  }

  /**
   * Abrir jornada para TODAS las ligas (bloquea cambios)
   */
  static async openAllJornadas(): Promise<{
    success: boolean;
    message: string;
    leaguesProcessed: number;
    leagues: Array<{
      id: string;
      name: string;
      jornada: number;
    }>;
  }> {
    try {
      console.log('🌍 Abriendo jornada para TODAS las ligas...');

      const leagues = await prisma.league.findMany();
      const processedLeagues = [];

      for (const league of leagues) {
        const jornada = league.currentJornada;
        console.log(`  🔓 Abriendo jornada ${jornada} para liga "${league.name}"...`);

        // Actualizar estado de la jornada a "closed" (cerrado/bloqueado)
        await prisma.league.update({
          where: { id: league.id },
          data: {
            jornadaStatus: 'closed'
          }
        });

        // Resetear budget de todos los miembros al valor de initialBudget
        const members = await prisma.leagueMember.findMany({
          where: { leagueId: league.id }
        });

        for (const member of members) {
          await prisma.leagueMember.update({
            where: {
              leagueId_userId: { leagueId: league.id, userId: member.userId }
            },
            data: {
              budget: member.initialBudget
            }
          });
        }
        console.log(`    💰 Budget reseteado para ${members.length} miembros`);

        processedLeagues.push({
          id: league.id,
          name: league.name,
          jornada
        });

        console.log(`  ✅ Jornada ${jornada} abierta (bloqueada) para liga "${league.name}"`);
      }

      console.log(`\n✨ ${leagues.length} ligas actualizadas exitosamente\n`);

      return {
        success: true,
        message: `Jornada abierta (bloqueada) para ${leagues.length} ligas`,
        leaguesProcessed: leagues.length,
        leagues: processedLeagues
      };
    } catch (error) {
      console.error('❌ Error abriendo jornadas:', error);
      throw error;
    }
  }

  /**
   * Cerrar jornada para TODAS las ligas (proceso completo)
   */
  static async closeAllJornadas(): Promise<{
    success: boolean;
    message: string;
    leaguesProcessed: number;
    totalEvaluations: number;
    totalUpdatedMembers: number;
    totalClearedSquads: number;
    leagues: Array<{
      id: string;
      name: string;
      oldJornada: number;
      newJornada: number;
      evaluations: number;
      updatedMembers: number;
      clearedSquads: number;
    }>;
  }> {
    try {
      console.log('\n🌍 CERRANDO JORNADA PARA TODAS LAS LIGAS...\n');

      const leagues = await prisma.league.findMany();
      const processedLeagues = [];
      let totalEvaluations = 0;
      let totalUpdatedMembers = 0;
      let totalClearedSquads = 0;

      for (const league of leagues) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`� Procesando liga: ${league.name}`);
        console.log(`${'='.repeat(60)}\n`);

        try {
          const result = await this.closeJornada(league.id);
          
          processedLeagues.push({
            id: league.id,
            name: league.name,
            oldJornada: league.currentJornada,
            newJornada: result.jornada,
            evaluations: result.evaluations.length,
            updatedMembers: result.updatedMembers,
            clearedSquads: result.clearedSquads,
          });

          totalEvaluations += result.evaluations.length;
          totalUpdatedMembers += result.updatedMembers;
          totalClearedSquads += result.clearedSquads;

          console.log(`✅ Liga "${league.name}" procesada exitosamente\n`);
        } catch (error) {
          console.error(`❌ Error procesando liga "${league.name}":`, error);
          // Continuar con la siguiente liga
        }
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎉 PROCESO COMPLETADO`);
      console.log(`${'='.repeat(60)}\n`);
      console.log(`📊 Resumen Global:`);
      console.log(`   - Ligas procesadas: ${processedLeagues.length}/${leagues.length}`);
      console.log(`   - Total apuestas evaluadas: ${totalEvaluations}`);
      console.log(`   - Total miembros actualizados: ${totalUpdatedMembers}`);
      console.log(`   - Total plantillas vaciadas: ${totalClearedSquads}\n`);

      return {
        success: true,
        message: `Jornada cerrada para ${processedLeagues.length} ligas`,
        leaguesProcessed: processedLeagues.length,
        totalEvaluations,
        totalUpdatedMembers,
        totalClearedSquads,
        leagues: processedLeagues,
      };
    } catch (error) {
      console.error('❌ Error cerrando jornadas:', error);
      throw error;
    }
  }
}
