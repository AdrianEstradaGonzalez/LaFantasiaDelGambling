import { FastifyRequest, FastifyReply } from 'fastify';
import { SquadService } from '../services/squad.service';
import { AppError } from '../utils/errors';

export class SquadController {
  
  // GET /api/squads/:ligaId - Obtener plantilla del usuario para una liga
  static async getUserSquad(req: FastifyRequest<{ Params: { ligaId: string } }>, reply: FastifyReply) {
    try {
      const { ligaId } = req.params;
      const userId = (req.user as any)?.sub || (req.user as any)?.id;
      
      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
      }

      const squad = await SquadService.getUserSquad(userId, ligaId);
      
      reply.send(squad);
    } catch (error) {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send({ message: error.message });
      } else {
        console.error('Error en getUserSquad:', error);
        reply.status(500).send({ message: 'Error interno del servidor' });
      }
    }
  }

  // POST /api/squads - Crear nueva plantilla
  static async createSquad(req: FastifyRequest<{ Body: { ligaId: string; formation: string; players: any[] } }>, reply: FastifyReply) {
    try {
      const userId = (req.user as any)?.sub || (req.user as any)?.id;
      const { ligaId, formation, players } = req.body;
      
      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
      }

      if (!ligaId || !formation || !players) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Datos incompletos');
      }

      const squad = await SquadService.createSquad({
        userId,
        ligaId,
        formation,
        players
      });

      reply.status(201).send(squad);
    } catch (error) {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send({ message: error.message });
      } else {
        console.error('Error en createSquad:', error);
        reply.status(500).send({ message: 'Error interno del servidor' });
      }
    }
  }

  // PUT /api/squads/:ligaId - Actualizar plantilla existente
  static async updateSquad(req: FastifyRequest<{ Params: { ligaId: string }; Body: { formation?: string; players?: any[] } }>, reply: FastifyReply) {
    try {
      const { ligaId } = req.params;
      const userId = (req.user as any)?.sub || (req.user as any)?.id;
      const { formation, players } = req.body;
      
      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
      }

      const squad = await SquadService.updateSquad(userId, ligaId, {
        formation,
        players
      });

      reply.send(squad);
    } catch (error) {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send({ message: error.message });
      } else {
        console.error('Error en updateSquad:', error);
        reply.status(500).send({ message: 'Error interno del servidor' });
      }
    }
  }

  // DELETE /api/squads/:ligaId - Eliminar plantilla
  static async deleteSquad(req: FastifyRequest<{ Params: { ligaId: string } }>, reply: FastifyReply) {
    try {
      const { ligaId } = req.params;
      const userId = (req.user as any)?.sub || (req.user as any)?.id;
      
      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
      }

      const result = await SquadService.deleteSquad(userId, ligaId);
      
      reply.send(result);
    } catch (error) {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send({ message: error.message });
      } else {
        console.error('Error en deleteSquad:', error);
        reply.status(500).send({ message: 'Error interno del servidor' });
      }
    }
  }

  // POST /api/squads/:ligaId/save - Guardar o actualizar plantilla (método unificado)
  static async saveSquad(req: FastifyRequest<{ Params: { ligaId: string }; Body: { formation: string; players: any[] } }>, reply: FastifyReply) {
    try {
      const { ligaId } = req.params;
      const userId = (req.user as any)?.sub || (req.user as any)?.id;
      const { formation, players } = req.body;
      
      if (!userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
      }

      if (!formation || !players) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Datos incompletos');
      }

      // Verificar si ya existe una plantilla
      const existingSquad = await SquadService.getUserSquad(userId, ligaId);
      
      let squad;
      if (existingSquad) {
        // Actualizar plantilla existente
        squad = await SquadService.updateSquad(userId, ligaId, {
          formation,
          players
        });
      } else {
        // Crear nueva plantilla
        squad = await SquadService.createSquad({
          userId,
          ligaId,
          formation,
          players
        });
      }

      reply.send(squad);
    } catch (error) {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send({ message: error.message });
      } else {
        console.error('Error en saveSquad:', error);
        reply.status(500).send({ message: 'Error interno del servidor' });
      }
    }
  }
}