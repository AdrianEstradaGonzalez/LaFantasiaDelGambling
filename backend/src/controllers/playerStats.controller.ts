import { FastifyRequest, FastifyReply } from 'fastify';
import { PlayerStatsService } from '../services/playerStats.service.js';
import { AppError } from '../utils/errors.js';
import axios from 'axios';
import { updateLiveLeagueRankings } from '../workers/update-live-rankings-in-progress.js';
import { PrismaClient } from '@prisma/client';

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
   */
  static async updateJornadaStatsSegunda(req: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('\n🟡 Endpoint /player-stats/update-jornada-segunda llamado');
      console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`);

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);
      
      const { stdout, stderr } = await execPromise('npx tsx scripts/update-live-rankings-segunda.ts', {
        cwd: process.cwd(),
      });
      
      console.log('✅ Actualización Segunda División completada');
      if (stdout) console.log('STDOUT:', stdout);
      if (stderr) console.error('STDERR:', stderr);

      return reply.status(200).send({
        success: true,
        message: 'Actualización de rankings Segunda División completada',
        output: stdout
      });
    } catch (error: any) {
      console.error('❌ Error ejecutando actualización Segunda División:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al actualizar rankings Segunda División',
        output: error.stdout
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

      console.log('\n✅ Actualización Premier League completada');
      console.log(`   - Cargados: ${loaded}`);
      console.log(`   - Ya existían: ${alreadyExists}`);
      console.log(`   - Errores: ${failed}`);

      return reply.status(200).send({
        success: true,
        message: `Actualización de estadísticas Premier League completada`,
        stats: {
          loaded,
          alreadyExists,
          failed,
          total: allPlayers.length
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
}
