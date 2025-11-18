import { FastifyRequest, FastifyReply } from 'fastify';
import { BetCombiService, CombiSelection } from '../services/betCombi.service.js';
import { AppError } from '../utils/errors.js';

export class BetCombiController {
  /**
   * POST /bet-combis/:leagueId
   * Crear una nueva apuesta combinada
   */
  static async create(
    request: FastifyRequest<{ 
      Params: { leagueId: string };
      Body: { jornada: number; selections: CombiSelection[]; amount: number } 
    }>, 
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId } = request.params;
      const { jornada, selections, amount } = request.body;

      // Validar datos
      if (!jornada || !selections || !amount) {
        return reply.status(400).send({ error: 'Faltan campos requeridos' });
      }

      if (selections.length < 2) {
        return reply.status(400).send({ error: 'Se requieren mínimo 2 apuestas para una combi' });
      }

      if (amount > 50_000_000) {
        return reply.status(400).send({ error: 'El monto máximo para combis es 50M' });
      }

      const combi = await BetCombiService.createCombi({
        leagueId,
        userId,
        jornada,
        selections,
        amount,
      });

      return reply.status(201).send(combi);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * GET /bet-combis/:leagueId
   * Obtener combis del usuario en una liga
   */
  static async getByLeague(
    request: FastifyRequest<{ 
      Params: { leagueId: string };
      Querystring: { jornada?: string } 
    }>, 
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { leagueId } = request.params;
      const jornada = request.query.jornada ? parseInt(request.query.jornada) : undefined;

      const combis = await BetCombiService.getUserCombis(leagueId, userId, jornada);
      return reply.status(200).send(combis);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * POST /bet-combis/evaluate/:combiId
   * Evaluar una combi específica
   */
  static async evaluate(
    request: FastifyRequest<{ Params: { combiId: string } }>, 
    reply: FastifyReply
  ) {
    try {
      const { combiId } = request.params;
      const combi = await BetCombiService.evaluateCombi(combiId);
      return reply.status(200).send(combi);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * POST /bet-combis/evaluate-jornada
   * Evaluar todas las combis de una jornada
   */
  static async evaluateJornada(
    request: FastifyRequest<{ Body: { leagueId: string; jornada: number } }>, 
    reply: FastifyReply
  ) {
    try {
      const { leagueId, jornada } = request.body;

      if (!leagueId || !jornada) {
        return reply.status(400).send({ error: 'Faltan campos requeridos' });
      }

      const results = await BetCombiService.evaluateJornadaCombis(leagueId, jornada);
      return reply.status(200).send(results);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * GET /bet-combis/league/:leagueId/jornada/:jornada
   * Obtener todas las combis de una liga en una jornada (para jornada cerrada)
   */
  static async getLeagueCombis(
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

      if (!jornadaNum) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      const combis = await BetCombiService.getLeagueCombis(leagueId, jornadaNum);
      return reply.status(200).send(combis);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * DELETE /bet-combis/:combiId/selections/:betId
   * Eliminar una selección de una combi
   */
  static async removeSelection(
    request: FastifyRequest<{ Params: { combiId: string; betId: string } }>, 
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { combiId, betId } = request.params;
      const result = await BetCombiService.removeSelectionFromCombi(combiId, betId, userId);
      return reply.status(200).send(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * POST /bet-combis/:combiId/selections
   * Añadir una selección a una combi existente
   */
  static async addSelection(
    request: FastifyRequest<{ 
      Params: { combiId: string };
      Body: { selection: CombiSelection } 
    }>, 
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { combiId } = request.params;
      const { selection } = request.body;

      if (!selection) {
        return reply.status(400).send({ error: 'Falta la selección' });
      }

      const combi = await BetCombiService.addSelectionToCombi(combiId, userId, selection);
      return reply.status(200).send(combi);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * DELETE /bet-combis/:combiId
   * Eliminar una combi completa
   */
  static async deleteCombi(
    request: FastifyRequest<{ Params: { combiId: string } }>, 
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { combiId } = request.params;
      const result = await BetCombiService.deleteCombi(combiId, userId);
      return reply.status(200).send(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  /**
   * PUT /bet-combis/:combiId/amount
   * Actualizar el monto apostado en una combi
   */
  static async updateAmount(
    request: FastifyRequest<{ 
      Params: { combiId: string };
      Body: { amount: number } 
    }>, 
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.sub || (request.user as any)?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'No autenticado' });
      }

      const { combiId } = request.params;
      const { amount } = request.body;

      if (!amount || amount <= 0) {
        return reply.status(400).send({ error: 'Monto inválido' });
      }

      const combi = await BetCombiService.updateCombiAmount(combiId, userId, amount);
      return reply.status(200).send(combi);
    } catch (error: any) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }
}
