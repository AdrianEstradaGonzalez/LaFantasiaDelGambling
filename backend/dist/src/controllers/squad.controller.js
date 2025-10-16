import { SquadService } from '../services/squad.service';
import { AppError } from '../utils/errors';
export class SquadController {
    // GET /api/squads/:ligaId - Obtener plantilla del usuario para una liga
    static async getUserSquad(req, reply) {
        try {
            const { ligaId } = req.params;
            const userId = req.user?.sub || req.user?.id;
            if (!userId) {
                throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
            }
            const squad = await SquadService.getUserSquad(userId, ligaId);
            reply.send(squad);
        }
        catch (error) {
            if (error instanceof AppError) {
                reply.status(error.statusCode).send({ message: error.message });
            }
            else {
                console.error('Error en getUserSquad:', error);
                reply.status(500).send({ message: 'Error interno del servidor' });
            }
        }
    }
    // POST /api/squads - Crear nueva plantilla
    static async createSquad(req, reply) {
        try {
            const userId = req.user?.sub || req.user?.id;
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
        }
        catch (error) {
            if (error instanceof AppError) {
                reply.status(error.statusCode).send({ message: error.message });
            }
            else {
                console.error('Error en createSquad:', error);
                reply.status(500).send({ message: 'Error interno del servidor' });
            }
        }
    }
    // PUT /api/squads/:ligaId - Actualizar plantilla existente
    static async updateSquad(req, reply) {
        try {
            const { ligaId } = req.params;
            const userId = req.user?.sub || req.user?.id;
            const { formation, players } = req.body;
            if (!userId) {
                throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
            }
            const squad = await SquadService.updateSquad(userId, ligaId, {
                formation,
                players
            });
            reply.send(squad);
        }
        catch (error) {
            if (error instanceof AppError) {
                reply.status(error.statusCode).send({ message: error.message });
            }
            else {
                console.error('Error en updateSquad:', error);
                reply.status(500).send({ message: 'Error interno del servidor' });
            }
        }
    }
    // DELETE /api/squads/:ligaId - Eliminar plantilla
    static async deleteSquad(req, reply) {
        try {
            const { ligaId } = req.params;
            const userId = req.user?.sub || req.user?.id;
            if (!userId) {
                throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
            }
            const result = await SquadService.deleteSquad(userId, ligaId);
            reply.send(result);
        }
        catch (error) {
            if (error instanceof AppError) {
                reply.status(error.statusCode).send({ message: error.message });
            }
            else {
                console.error('Error en deleteSquad:', error);
                reply.status(500).send({ message: 'Error interno del servidor' });
            }
        }
    }
    // POST /api/squads/:ligaId/save - Guardar o actualizar plantilla (método unificado)
    static async saveSquad(req, reply) {
        try {
            const { ligaId } = req.params;
            const userId = req.user?.sub || req.user?.id;
            const { formation, captainPosition, players } = req.body;
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
                    players,
                    captainPosition
                });
            }
            else {
                // Crear nueva plantilla
                squad = await SquadService.createSquad({
                    userId,
                    ligaId,
                    formation,
                    players,
                    captainPosition
                });
            }
            reply.send(squad);
        }
        catch (error) {
            if (error instanceof AppError) {
                reply.status(error.statusCode).send({ message: error.message });
            }
            else {
                console.error('Error en saveSquad:', error);
                reply.status(500).send({ message: 'Error interno del servidor' });
            }
        }
    }
    // GET /api/squads/:ligaId/budget - Obtener presupuesto del usuario
    static async getUserBudget(req, reply) {
        try {
            const { ligaId } = req.params;
            const userId = req.user?.sub || req.user?.id;
            if (!userId) {
                throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
            }
            const budget = await SquadService.getUserBudget(userId, ligaId);
            reply.send({ budget });
        }
        catch (error) {
            if (error instanceof AppError) {
                reply.status(error.statusCode).send({ message: error.message });
            }
            else {
                console.error('Error en getUserBudget:', error);
                reply.status(500).send({ message: 'Error interno del servidor' });
            }
        }
    }
    // POST /api/squads/:ligaId/players - Añadir jugador a la plantilla
    static async addPlayerToSquad(req, reply) {
        try {
            const { ligaId } = req.params;
            const userId = req.user?.sub || req.user?.id;
            const { position, playerId, playerName, role, pricePaid } = req.body;
            if (!userId) {
                throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
            }
            if (!position || !playerId || !playerName || !role || pricePaid === undefined) {
                throw new AppError(400, 'VALIDATION_ERROR', 'Datos incompletos');
            }
            const result = await SquadService.addPlayerToSquad(userId, ligaId, {
                position,
                playerId,
                playerName,
                role,
                pricePaid
            });
            reply.send(result);
        }
        catch (error) {
            if (error instanceof AppError) {
                reply.status(error.statusCode).send({ message: error.message });
            }
            else {
                console.error('Error en addPlayerToSquad:', error);
                const message = error instanceof Error ? error.message : 'Error interno del servidor';
                reply.status(500).send({ message });
            }
        }
    }
    // DELETE /api/squads/:ligaId/players/:position - Eliminar jugador de la plantilla
    static async removePlayerFromSquad(req, reply) {
        try {
            const { ligaId, position } = req.params;
            const userId = req.user?.sub || req.user?.id;
            if (!userId) {
                throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
            }
            const result = await SquadService.removePlayerFromSquad(userId, ligaId, position);
            reply.send(result);
        }
        catch (error) {
            if (error instanceof AppError) {
                reply.status(error.statusCode).send({ message: error.message });
            }
            else {
                console.error('Error en removePlayerFromSquad:', error);
                const message = error instanceof Error ? error.message : 'Error interno del servidor';
                reply.status(500).send({ message });
            }
        }
    }
    // POST /api/squads/:ligaId/captain - Establecer capitán de la plantilla
    static async setCaptain(req, reply) {
        try {
            const { ligaId } = req.params;
            const { position } = req.body;
            const userId = req.user?.sub || req.user?.id;
            if (!userId) {
                throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autenticado');
            }
            if (!position) {
                throw new AppError(400, 'VALIDATION_ERROR', 'Se requiere la posición del jugador');
            }
            const result = await SquadService.setCaptain(userId, ligaId, position);
            reply.send(result);
        }
        catch (error) {
            if (error instanceof AppError) {
                reply.status(error.statusCode).send({ message: error.message });
            }
            else {
                console.error('Error en setCaptain:', error);
                const message = error instanceof Error ? error.message : 'Error interno del servidor';
                reply.status(500).send({ message });
            }
        }
    }
}
