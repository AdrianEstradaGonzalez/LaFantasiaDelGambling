import { FastifyRequest, FastifyReply } from 'fastify';
import { BetOptionService } from '../services/betOption.service.js';
import { AppError } from '../utils/errors.js';

export class BetOptionController {
  /**
   * GET /api/bet-options/:leagueId/:jornada
   * Obtener opciones de apuesta para una liga y jornada
   */
  static async getBetOptions(
    request: FastifyRequest<{
      Params: { leagueId: string; jornada: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId, jornada } = request.params;
      const jornadaNum = parseInt(jornada);

      if (isNaN(jornadaNum)) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      const options = await BetOptionService.getBetOptions(leagueId, jornadaNum);
      return reply.status(200).send(options);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      console.error('Error getting bet options:', error);
      return reply.status(500).send({ error: error.message });
    }
  }

  /**
   * POST /api/bet-options/:leagueId/:jornada
   * Guardar opciones de apuesta para una liga y jornada
   */
  static async saveBetOptions(
    request: FastifyRequest<{
      Params: { leagueId: string; jornada: string };
      Body: {
        options: Array<{
          matchId: number;
          homeTeam: string;
          awayTeam: string;
          betType: string;
          betLabel: string;
          odd: number;
        }>;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId, jornada } = request.params;
      const { options } = request.body;
      const jornadaNum = parseInt(jornada);

      if (isNaN(jornadaNum)) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      if (!Array.isArray(options) || options.length === 0) {
        return reply.status(400).send({ error: 'Opciones inválidas' });
      }

      const result = await BetOptionService.saveBetOptions(leagueId, jornadaNum, options);
      return reply.status(200).send(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      console.error('Error saving bet options:', error);
      return reply.status(500).send({ error: error.message });
    }
  }

  /**
   * GET /api/bet-options/:leagueId/:jornada/exists
   * Verificar si existen opciones de apuesta para una liga y jornada
   */
  static async checkOptionsExist(
    request: FastifyRequest<{
      Params: { leagueId: string; jornada: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId, jornada } = request.params;
      const jornadaNum = parseInt(jornada);

      if (isNaN(jornadaNum)) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      const exists = await BetOptionService.hasOptions(leagueId, jornadaNum);
      return reply.status(200).send({ exists });
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      console.error('Error checking bet options:', error);
      return reply.status(500).send({ error: error.message });
    }
  }

  /**
   * POST /api/bet-options/:leagueId/:jornada/generate
   * Generar opciones de apuesta automáticamente para una liga y jornada
   * Este endpoint genera las apuestas desde el backend usando la API de fútbol
   */
  static async generateBetOptions(
    request: FastifyRequest<{
      Params: { leagueId: string; jornada: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId, jornada } = request.params;
      const jornadaNum = parseInt(jornada);

      if (isNaN(jornadaNum)) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      console.log(`🎲 Generando apuestas para liga ${leagueId}, jornada ${jornadaNum}...`);

      const result = await BetOptionService.generateBetOptions(leagueId, jornadaNum);
      
      return reply.status(200).send({
        success: true,
        generated: result.created,
        message: `Generadas ${result.created} opciones de apuesta`,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      console.error('Error generating bet options:', error);
      return reply.status(500).send({ error: error.message || 'Error al generar opciones de apuesta' });
    }
  }

  /**
   * GET /api/bet-options/:leagueId/:jornada/get-or-generate
   * Obtener opciones de apuesta, generándolas si no existen
   * Este es el endpoint principal que debe usar el frontend
   */
  static async getOrGenerateBetOptions(
    request: FastifyRequest<{
      Params: { leagueId: string; jornada: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId, jornada } = request.params;
      const jornadaNum = parseInt(jornada);

      if (isNaN(jornadaNum)) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      // Verificar si ya existen opciones
      const exists = await BetOptionService.hasOptions(leagueId, jornadaNum);

      if (!exists) {
        console.log(`🎲 No existen apuestas para liga ${leagueId}, jornada ${jornadaNum}. Generando...`);
        await BetOptionService.generateBetOptions(leagueId, jornadaNum);
      }

      // Obtener las opciones (recién generadas o existentes)
      const options = await BetOptionService.getBetOptions(leagueId, jornadaNum);
      
      return reply.status(200).send(options);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      console.error('Error getting or generating bet options:', error);
      return reply.status(500).send({ error: error.message || 'Error al obtener opciones de apuesta' });
    }
  }
}
