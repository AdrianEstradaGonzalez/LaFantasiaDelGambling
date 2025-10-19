import { FastifyRequest, FastifyReply } from 'fastify';
import { PlayerStatsService } from '../services/playerStats.service.js';
import { AppError } from '../utils/errors.js';

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
   * Actualizar estadísticas de todos los jugadores para una jornada (admin)
   * POST /api/player-stats/update-jornada
   */
  static async updateJornadaStats(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any;

      if (!body.jornada || typeof body.jornada !== 'number') {
        return reply.status(400).send({
          success: false,
          message: 'Se requiere el número de jornada',
        });
      }

      const result = await PlayerStatsService.updateAllPlayersStatsForJornada(body.jornada);

      return reply.status(200).send({
        success: true,
        message: `Estadísticas actualizadas para jornada ${body.jornada}`,
        data: result,
      });
    } catch (error: any) {
      console.error('Error actualizando estadísticas de jornada:', error);

      return reply.status(500).send({
        success: false,
        message: error?.message || 'Error al actualizar estadísticas',
      });
    }
  }
}
