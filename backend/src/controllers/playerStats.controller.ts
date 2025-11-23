import { FastifyRequest, FastifyReply } from 'fastify';
import { PlayerStatsService } from '../services/playerStats.service.js';
import { AppError } from '../utils/errors.js';
import axios from 'axios';
import { updateLiveLeagueRankings } from '../workers/update-live-rankings-in-progress.js';
import { PrismaClient } from '@prisma/client';
import { reevaluateCurrentJornadaBets } from '../services/betEvaluation.service.js';

const prisma = new PrismaClient();

// Helper para obtener jornada actual de la API
async function getCurrentJornadaFromAPI(): Promise<number> {
  const API_BASE = 'https://v3.football.api-sports.io';
  const API_KEY = process.env.FOOTBALL_API_KEY || '';
  
  const { data } = await axios.get(`${API_BASE}/fixtures`, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
    params: {
      league: 140, // La Liga
      season: 2025,
      next: 50
    },
    timeout: 5000
  });

  const fixtures = data?.response || [];
  if (fixtures.length > 0) {
    const upcomingMatch = fixtures.find((f: any) => 
      ['NS', '1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(f?.fixture?.status?.short)
    );
    
    if (upcomingMatch) {
      return upcomingMatch.league.round.replace('Regular Season - ', '');
    }
  }
  
  throw new Error('No se pudo determinar la jornada actual');
}

export class PlayerStatsController {
  /**
   * Obtener estadísticas de un jugador en una jornada específica
   * GET /api/player-stats/:playerId/jornada/:jornada
   */
  static async getPlayerJornadaStats(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { playerId, jornada } = req.params as { playerId: string; jornada: string };
      const query = req.query as any;
      
      const stats = await PlayerStatsService.getPlayerStatsForJornada(
        Number(playerId),
        Number(jornada),
        {
          season: query.season ? Number(query.season) : undefined,
          forceRefresh: query.refresh === 'true',
        }
      );

      return reply.status(200).send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al obtener estadísticas',
      });
    }
  }

  /**
   * Obtener estadísticas de un jugador para múltiples jornadas
   * POST /api/player-stats/:playerId/multiple-jornadas
   */
  static async getPlayerMultipleJornadasStats(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { playerId } = req.params as { playerId: string };
      const body = req.body as any;

      if (!Array.isArray(body.jornadas)) {
        return reply.status(400).send({
          success: false,
          message: 'Se requiere un array de jornadas',
        });
      }

      const jornadas = body.jornadas
        .map((j: any) => Number(j))
        .filter((j: number) => Number.isInteger(j) && j > 0 && j <= 38);

      if (!jornadas.length) {
        return reply.status(400).send({
          success: false,
          message: 'Debe proporcionar jornadas válidas (1-38)',
        });
      }

      const stats = await PlayerStatsService.getPlayerStatsForMultipleJornadas(
        Number(playerId),
        jornadas,
        {
          season: body.season ? Number(body.season) : undefined,
          forceRefresh: body.refresh === true,
        }
      );

      return reply.status(200).send({
        success: true,
        data: stats,
        count: stats.filter(s => s !== null).length,
      });
    } catch (error: any) {
      console.error('Error obteniendo estadísticas múltiples:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al obtener estadísticas',
      });
    }
  }

  /**
   * Actualizar estadísticas de todos los jugadores para una jornada (cron)
   * GET/POST /player-stats/update-jornada
   * Ejecuta el script de actualización de rankings EN VIVO
   */
  static async updateJornadaStats(req: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('\n🔴 Endpoint /player-stats/update-jornada llamado');
      console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);

      // Ejecutar el script de actualización de rankings en vivo
      await updateLiveLeagueRankings();

      return reply.status(200).send({
        success: true,
        message: 'Actualización de rankings EN VIVO completada',
      });
    } catch (error: any) {
      console.error('❌ Error ejecutando actualización EN VIVO:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al actualizar rankings EN VIVO',
      });
    }
  }

  /**
   * Actualizar estadísticas de Segunda División para una jornada (cron)
   * GET/POST /player-stats/update-jornada-segunda
   * 
   * Este endpoint debe cargar las estadísticas bajo demanda usando el mismo sistema
   * que Primera División: PlayerStatsService.getPlayerStatsForJornada
   */
  static async updateJornadaStatsSegunda(req: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('\n🟡 Endpoint /player-stats/update-jornada-segunda llamado');
      console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);

      // Obtener la jornada actual de las ligas de Segunda División
      const segundaLeague = await (prisma as any).league.findFirst({
        where: { division: 'segunda' },
        select: { currentJornada: true, name: true }
      });

      if (!segundaLeague) {
        console.warn('⚠️  No se encontraron ligas de Segunda División');
        return reply.status(404).send({
          success: false,
          message: 'No se encontraron ligas de Segunda División'
        });
      }

      const currentJornada = segundaLeague.currentJornada;
      console.log(`📅 Jornada actual Segunda División: ${currentJornada}`);

      // Obtener todos los jugadores de Segunda División
      const allPlayers = await (prisma as any).playerSegunda.findMany({
        select: { id: true, name: true, teamName: true }
      });

      console.log(`👥 Total de jugadores Segunda División: ${allPlayers.length}`);
      console.log(`📊 Cargando estadísticas de la jornada ${currentJornada}...\n`);

      let loaded = 0;
      let failed = 0;
      let alreadyExists = 0;

      // Cargar estadísticas para cada jugador en la jornada actual
      for (const player of allPlayers) {
        try {
          // Verificar si ya existen estadísticas
          const existing = await (prisma as any).playerSegundaStats.findUnique({
            where: {
              playerId_jornada_season: {
                playerId: player.id,
                jornada: currentJornada,
                season: 2025
              }
            }
          });

          if (existing) {
            alreadyExists++;
            continue;
          }

          // Cargar estadísticas usando el servicio (con división='segunda')
          await PlayerStatsService.getPlayerStatsForJornada(
            player.id,
            currentJornada,
            { 
              season: 2025, 
              forceRefresh: true,
              division: 'segunda'
            }
          );

          loaded++;
          
          if (loaded % 10 === 0) {
            console.log(`   Progreso: ${loaded}/${allPlayers.length - alreadyExists} jugadores procesados`);
          }

          // Pequeño delay para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error: any) {
          failed++;
          if (failed <= 5) { // Solo mostrar los primeros 5 errores
            console.error(`   ❌ Error con ${player.name}: ${error.message}`);
          }
        }
      }

      console.log('\n✅ Estadísticas Segunda División cargadas');
      console.log(`   - Cargados: ${loaded}`);
      console.log(`   - Ya existían: ${alreadyExists}`);
      console.log(`   - Errores: ${failed}`);

      // PASO 2: Actualizar puntos de los usuarios en pointsPerJornada
      console.log('\n📊 Actualizando puntos de usuarios en Segunda División...');
      
      const segundaLeagues = await prisma.league.findMany({
        where: { division: 'segunda' },
        include: { members: true },
      });

      console.log(`🏆 Ligas de Segunda División encontradas: ${segundaLeagues.length}`);

      let updatedMembers = 0;

      for (const league of segundaLeagues) {
        console.log(`\n📋 Procesando liga: ${league.name}`);
        
        for (const member of league.members) {
          const squad = await prisma.squad.findUnique({
            where: { userId_leagueId: { userId: member.userId, leagueId: member.leagueId } },
            include: { players: { select: { playerId: true, isCaptain: true } } },
          });

          if (!squad) continue;

          // Calcular puntos de la jornada actual
          let currentJornadaPoints = 0;
          
          for (const squadPlayer of squad.players) {
            const playerStats = await (prisma as any).playerSegundaStats.findUnique({
              where: {
                playerId_jornada_season: {
                  playerId: squadPlayer.playerId,
                  jornada: currentJornada,
                  season: 2025
                }
              }
            });

            if (playerStats) {
              const points = squadPlayer.isCaptain 
                ? playerStats.totalPoints * 2 
                : playerStats.totalPoints;
              currentJornadaPoints += points;
            }
          }

          // Obtener pointsPerJornada existente
          const currentPointsPerJornada = (member.pointsPerJornada as Record<string, number>) || {};
          
          // Calcular total de jornadas cerradas (todas excepto la actual)
          let closedJornadasTotal = 0;
          for (const [jornadaKey, points] of Object.entries(currentPointsPerJornada)) {
            if (Number(jornadaKey) !== currentJornada) {
              closedJornadasTotal += points || 0;
            }
          }

          // Total acumulado
          const totalAccumulatedPoints = closedJornadasTotal + currentJornadaPoints;

          // Actualizar pointsPerJornada
          currentPointsPerJornada[currentJornada.toString()] = currentJornadaPoints;

          await prisma.leagueMember.update({
            where: { leagueId_userId: { leagueId: member.leagueId, userId: member.userId } },
            data: { 
              points: totalAccumulatedPoints,
              pointsPerJornada: currentPointsPerJornada
            },
          });

          const user = await prisma.user.findUnique({ 
            where: { id: member.userId }, 
            select: { name: true, email: true } 
          });
          const userName = user?.name || user?.email || 'Usuario';
          console.log(`  ✅ ${userName}: ${totalAccumulatedPoints} pts (${closedJornadasTotal} + ${currentJornadaPoints} J${currentJornada})`);
          updatedMembers++;
        }
      }

      console.log(`\n🎉 Actualización completa Segunda División: ${updatedMembers} miembros actualizados`);

      return reply.status(200).send({
        success: true,
        message: `Actualización Segunda División completada: ${loaded} estadísticas cargadas, ${updatedMembers} usuarios actualizados`,
        stats: {
          loaded,
          alreadyExists,
          failed,
          total: allPlayers.length,
          usersUpdated: updatedMembers
        }
      });
    } catch (error: any) {
      console.error('❌ Error ejecutando actualización Segunda División:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al actualizar estadísticas Segunda División'
      });
    }
  }

  /**
   * Actualizar estadísticas de Premier League para una jornada (cron)
   * GET/POST /player-stats/update-jornada-premier
   * 
   * Este endpoint debe cargar las estadísticas bajo demanda usando el mismo sistema
   * que Primera y Segunda División: PlayerStatsService.getPlayerStatsForJornada
   */
  static async updateJornadaStatsPremier(req: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('\n🟣 Endpoint /player-stats/update-jornada-premier llamado');
      console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);

      // Obtener la jornada actual de las ligas Premier
      const premierLeague = await (prisma as any).league.findFirst({
        where: { division: 'premier' },
        select: { currentJornada: true, name: true }
      });

      if (!premierLeague) {
        console.warn('⚠️  No se encontraron ligas de Premier League');
        return reply.status(404).send({
          success: false,
          message: 'No se encontraron ligas de Premier League'
        });
      }

      const currentJornada = premierLeague.currentJornada;
      console.log(`📅 Jornada actual Premier League: ${currentJornada}`);

      // Obtener todos los jugadores de Premier League
      const allPlayers = await (prisma as any).playerPremier.findMany({
        select: { id: true, name: true, teamName: true }
      });

      console.log(`👥 Total de jugadores Premier: ${allPlayers.length}`);
      console.log(`📊 Cargando estadísticas de la jornada ${currentJornada}...\n`);

      let loaded = 0;
      let failed = 0;
      let alreadyExists = 0;

      // Cargar estadísticas para cada jugador en la jornada actual
      for (const player of allPlayers) {
        try {
          // Verificar si ya existen estadísticas
          const existing = await (prisma as any).playerPremierStats.findUnique({
            where: {
              playerId_jornada_season: {
                playerId: player.id,
                jornada: currentJornada,
                season: 2025
              }
            }
          });

          if (existing) {
            alreadyExists++;
            continue;
          }

          // Cargar estadísticas usando el servicio (con división='premier')
          await PlayerStatsService.getPlayerStatsForJornada(
            player.id,
            currentJornada,
            { 
              season: 2025, 
              forceRefresh: true,
              division: 'premier'
            }
          );

          loaded++;
          
          if (loaded % 10 === 0) {
            console.log(`   Progreso: ${loaded}/${allPlayers.length - alreadyExists} jugadores procesados`);
          }

          // Pequeño delay para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error: any) {
          failed++;
          if (failed <= 5) { // Solo mostrar los primeros 5 errores
            console.error(`   ❌ Error con ${player.name}: ${error.message}`);
          }
        }
      }

      console.log('\n✅ Estadísticas Premier League cargadas');
      console.log(`   - Cargados: ${loaded}`);
      console.log(`   - Ya existían: ${alreadyExists}`);
      console.log(`   - Errores: ${failed}`);

      // PASO 2: Actualizar puntos de los usuarios en pointsPerJornada
      console.log('\n📊 Actualizando puntos de usuarios en Premier League...');
      
      const premierLeagues = await prisma.league.findMany({
        where: { division: 'premier' },
        include: { members: true },
      });

      console.log(`🏆 Ligas de Premier League encontradas: ${premierLeagues.length}`);

      let updatedMembers = 0;

      for (const league of premierLeagues) {
        console.log(`\n📋 Procesando liga: ${league.name}`);
        
        for (const member of league.members) {
          const squad = await prisma.squad.findUnique({
            where: { userId_leagueId: { userId: member.userId, leagueId: member.leagueId } },
            include: { players: { select: { playerId: true, isCaptain: true } } },
          });

          if (!squad) continue;

          // Calcular puntos de la jornada actual
          let currentJornadaPoints = 0;
          
          for (const squadPlayer of squad.players) {
            const playerStats = await (prisma as any).playerPremierStats.findUnique({
              where: {
                playerId_jornada_season: {
                  playerId: squadPlayer.playerId,
                  jornada: currentJornada,
                  season: 2025
                }
              }
            });

            if (playerStats) {
              const points = squadPlayer.isCaptain 
                ? playerStats.totalPoints * 2 
                : playerStats.totalPoints;
              currentJornadaPoints += points;
            }
          }

          // Obtener pointsPerJornada existente
          const currentPointsPerJornada = (member.pointsPerJornada as Record<string, number>) || {};
          
          // Calcular total de jornadas cerradas (todas excepto la actual)
          let closedJornadasTotal = 0;
          for (const [jornadaKey, points] of Object.entries(currentPointsPerJornada)) {
            if (Number(jornadaKey) !== currentJornada) {
              closedJornadasTotal += points || 0;
            }
          }

          // Total acumulado
          const totalAccumulatedPoints = closedJornadasTotal + currentJornadaPoints;

          // Actualizar pointsPerJornada
          currentPointsPerJornada[currentJornada.toString()] = currentJornadaPoints;

          await prisma.leagueMember.update({
            where: { leagueId_userId: { leagueId: member.leagueId, userId: member.userId } },
            data: { 
              points: totalAccumulatedPoints,
              pointsPerJornada: currentPointsPerJornada
            },
          });

          const user = await prisma.user.findUnique({ 
            where: { id: member.userId }, 
            select: { name: true, email: true } 
          });
          const userName = user?.name || user?.email || 'Usuario';
          console.log(`  ✅ ${userName}: ${totalAccumulatedPoints} pts (${closedJornadasTotal} + ${currentJornadaPoints} J${currentJornada})`);
          updatedMembers++;
        }
      }

      console.log(`\n🎉 Actualización completa Premier League: ${updatedMembers} miembros actualizados`);

      return reply.status(200).send({
        success: true,
        message: `Actualización Premier League completada: ${loaded} estadísticas cargadas, ${updatedMembers} usuarios actualizados`,
        stats: {
          loaded,
          alreadyExists,
          failed,
          total: allPlayers.length,
          usersUpdated: updatedMembers
        }
      });
    } catch (error: any) {
      console.error('❌ Error ejecutando actualización Premier League:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al actualizar estadísticas Premier League'
      });
    }
  }

  /**
   * Generar ofertas diarias del mercado (cron)
   * GET/POST /player-stats/generate-daily-offers
   */
  static async generateDailyOffers(req: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('\n🎯 Endpoint /player-stats/generate-daily-offers llamado');
      console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);
      
      const { stdout, stderr } = await execPromise('npx tsx scripts/generate-daily-offers.ts', {
        cwd: process.cwd(),
      });
      
      console.log('✅ Ofertas diarias generadas exitosamente');
      if (stdout) console.log('STDOUT:', stdout);
      if (stderr) console.error('STDERR:', stderr);

      return reply.status(200).send({
        success: true,
        message: 'Ofertas diarias generadas correctamente (150 ofertas: 50 por división)',
        output: stdout
      });
    } catch (error: any) {
      console.error('❌ Error generando ofertas diarias:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al generar ofertas diarias',
        output: error.stdout
      });
    }
  }

  /**
   * Obtener promedios por posición basados en todas las estadísticas de la BD
   * GET /api/player-stats/averages-by-position
   */
  static async getAveragesByPosition(req: FastifyRequest, reply: FastifyReply) {
    try {
      const averages = await PlayerStatsService.calculateAveragesByPosition();

      return reply.status(200).send({
        success: true,
        data: averages,
      });
    } catch (error: any) {
      console.error('Error calculando promedios por posición:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al calcular promedios',
      });
    }
  }

  /**
   * Obtener análisis del próximo rival para un jugador
   * GET /api/player-stats/:playerId/next-opponent
   */
  static async getNextOpponentAnalysis(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { playerId } = req.params as { playerId: string };
      const query = req.query as any;
      const currentJornada = query.jornada ? Number(query.jornada) : 1;

      const analysis = await PlayerStatsService.getNextOpponentAnalysis(
        Number(playerId),
        currentJornada
      );

      return reply.status(200).send({
        success: true,
        data: analysis,
      });
    } catch (error: any) {
      console.error('Error obteniendo análisis del próximo rival:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al analizar próximo rival',
      });
    }
  }

  /**
   * Endpoint para cronjob: Reevaluar TODAS las apuestas de la jornada actual de TODAS las ligas
   * POST /api/player-stats/reevaluate-all-bets
   * 
   * Este endpoint está diseñado para ser llamado por un cronjob programado.
   * Reevalúa todas las apuestas (ganadas, perdidas y pendientes) de la jornada actual
   * para verificar que se han evaluado correctamente y corrige cualquier discrepancia.
   */
  static async reevaluateAllBets(req: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('\n' + '═'.repeat(70));
      console.log('🔄 CRONJOB: Reevaluación de apuestas de jornada actual');
      console.log('═'.repeat(70));
      console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}\n`);

      // Obtener todas las ligas activas
      const leagues = await prisma.league.findMany({
        select: {
          id: true,
          name: true,
          division: true,
          currentJornada: true,
          _count: {
            select: {
              members: true
            }
          }
        },
        orderBy: {
          division: 'asc'
        }
      });

      if (leagues.length === 0) {
        console.log('✨ No hay ligas registradas\n');
        return reply.status(200).send({
          success: true,
          message: 'No hay ligas para evaluar',
          data: {
            leagues: 0,
            evaluated: 0,
            corrected: 0,
            confirmed: 0,
            pending: 0,
            errors: []
          }
        });
      }

      console.log(`📊 Total de ligas: ${leagues.length}`);
      
      // Agrupar por división
      const leaguesByDivision = {
        primera: leagues.filter(l => l.division === 'primera'),
        segunda: leagues.filter(l => l.division === 'segunda'),
        premier: leagues.filter(l => l.division === 'premier')
      };

      console.log('📋 Por división:');
      console.log(`   - Primera: ${leaguesByDivision.primera.length}`);
      console.log(`   - Segunda: ${leaguesByDivision.segunda.length}`);
      console.log(`   - Premier: ${leaguesByDivision.premier.length}\n`);

      let totalEvaluated = 0;
      let totalCorrected = 0;
      let totalConfirmed = 0;
      let totalPending = 0;
      const allErrors: string[] = [];
      const allCorrections: any[] = [];

      // Reevaluar cada liga
      for (const league of leagues) {
        try {
          console.log(`🏆 ${league.name} (${league.division}) - Jornada ${league.currentJornada}`);
          
          const result = await reevaluateCurrentJornadaBets(league.id);
          
          totalEvaluated += result.evaluated;
          totalCorrected += result.corrected;
          totalConfirmed += result.confirmed;
          totalPending += result.stillPending;
          allErrors.push(...result.errors);

          // Guardar correcciones
          const corrections = result.details.filter(d => d.corrected);
          if (corrections.length > 0) {
            allCorrections.push({
              leagueName: league.name,
              division: league.division,
              jornada: league.currentJornada,
              corrections
            });
          }

          console.log(`   📊 ${result.evaluated} evaluadas | 🔧 ${result.corrected} corregidas | ✅ ${result.confirmed} confirmadas`);

          // Delay entre ligas
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          const errorMsg = `Error en liga ${league.name}: ${error.message}`;
          console.error(`   💥 ${errorMsg}`);
          allErrors.push(errorMsg);
        }
      }

      console.log('\n' + '═'.repeat(70));
      console.log('📊 RESUMEN FINAL');
      console.log('═'.repeat(70));
      console.log(`Ligas procesadas: ${leagues.length}`);
      console.log(`📊 Total evaluadas: ${totalEvaluated}`);
      console.log(`🔧 Corregidas: ${totalCorrected}`);
      console.log(`✅ Confirmadas: ${totalConfirmed}`);
      console.log(`⏳ Pendientes: ${totalPending}`);
      if (allErrors.length > 0) {
        console.log(`💥 Errores: ${allErrors.length}`);
      }
      if (totalCorrected > 0) {
        console.log(`\n⚠️  SE DETECTARON ${totalCorrected} APUESTAS MAL EVALUADAS Y SE CORRIGIERON`);
      }
      console.log('═'.repeat(70) + '\n');

      return reply.status(200).send({
        success: true,
        message: totalCorrected > 0 
          ? `Reevaluación completada: ${totalCorrected} apuestas corregidas de ${totalEvaluated} evaluadas`
          : `Reevaluación completada: todas las apuestas están correctas (${totalEvaluated} verificadas)`,
        data: {
          leagues: leagues.length,
          evaluated: totalEvaluated,
          corrected: totalCorrected,
          confirmed: totalConfirmed,
          pending: totalPending,
          corrections: allCorrections,
          errors: allErrors
        }
      });
    } catch (error: any) {
      console.error('\n❌ Error fatal en reevaluación:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al reevaluar apuestas',
        error: error.toString()
      });
    }
  }
}
