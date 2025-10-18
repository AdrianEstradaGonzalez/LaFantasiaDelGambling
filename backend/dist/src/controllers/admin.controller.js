import { AdminService } from '../services/admin.service.js';
import { AppError } from '../utils/errors.js';
const adminService = new AdminService();
export class AdminController {
    // --- Obtener todos los usuarios ---
    async getAllUsers(req, res) {
        try {
            const users = await adminService.getAllUsers();
            res.send(users);
        }
        catch (error) {
            this.handleError(res, error, 'Error obteniendo usuarios');
        }
    }
    // --- Actualizar puntuaciones de la última jornada ---
    async updatePlayerScores(req, res) {
        try {
            const { jornada } = req.body;
            if (!jornada || typeof jornada !== 'number') {
                return res.code(400).send({
                    code: 'BAD_REQUEST',
                    message: 'Debes enviar un número de jornada válido en el body',
                });
            }
            const result = await adminService.updateAllPlayersLastJornadaPoints(jornada);
            res.send({
                success: true,
                message: `Puntuaciones actualizadas para la jornada ${result?.processedJornada ?? jornada}`,
                requestedJornada: jornada,
                processedJornada: result?.processedJornada ?? jornada,
                updatedPlayers: result?.updatedPlayers ?? 0,
            });
        }
        catch (error) {
            this.handleError(res, error, 'Error actualizando puntuaciones de jugadores');
        }
    }
    async updatePlayerScoresFromCurrent(req, res) {
        try {
            const result = await adminService.updatePlayersPointsFromCurrentJornada();
            res.send({
                success: true,
                message: `Puntuaciones actualizadas para la jornada ${result.processedJornada}`,
                requestedJornada: result.requestedJornada,
                processedJornada: result.processedJornada,
                updatedPlayers: result.updatedPlayers,
            });
        }
        catch (error) {
            this.handleError(res, error, 'Error actualizando puntuaciones de jugadores');
        }
    }
    // --- Eliminar un usuario ---
    async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const requestingUserId = req.user?.sub;
            const result = await adminService.deleteUser(userId, requestingUserId);
            res.send(result);
        }
        catch (error) {
            this.handleError(res, error, 'Error eliminando usuario');
        }
    }
    // --- Obtener todas las ligas ---
    async getAllLeagues(req, res) {
        try {
            const leagues = await adminService.getAllLeagues();
            res.send(leagues);
        }
        catch (error) {
            this.handleError(res, error, 'Error obteniendo ligas');
        }
    }
    // --- Eliminar una liga ---
    async deleteLeague(req, res) {
        try {
            const { leagueId } = req.params;
            const result = await adminService.deleteLeague(leagueId);
            res.send(result);
        }
        catch (error) {
            this.handleError(res, error, 'Error eliminando liga');
        }
    }
    // --- Manejador común de errores ---
    handleError(res, error, defaultMsg) {
        if (error instanceof AppError) {
            return res.code(error.statusCode).send({
                code: error.code,
                message: error.message,
            });
        }
        console.error(defaultMsg + ':', error);
        res.code(500).send({
            code: 'INTERNAL_ERROR',
            message: defaultMsg,
        });
    }
}
export default new AdminController();
