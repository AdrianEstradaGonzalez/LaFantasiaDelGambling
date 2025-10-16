import { AdminService } from '../services/admin.service.js';
import { AppError } from '../utils/errors.js';
const adminService = new AdminService();
export class AdminController {
    // Get all users
    async getAllUsers(req, res) {
        try {
            const users = await adminService.getAllUsers();
            res.send(users);
        }
        catch (error) {
            if (error instanceof AppError) {
                return res.code(error.statusCode).send({
                    code: error.code,
                    message: error.message,
                });
            }
            console.error('Error in getAllUsers:', error);
            res.code(500).send({
                code: 'INTERNAL_ERROR',
                message: 'Error interno del servidor',
            });
        }
    }
    // Delete a user
    async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const requestingUserId = req.user.sub;
            const result = await adminService.deleteUser(userId, requestingUserId);
            res.send(result);
        }
        catch (error) {
            if (error instanceof AppError) {
                return res.code(error.statusCode).send({
                    code: error.code,
                    message: error.message,
                });
            }
            console.error('Error in deleteUser:', error);
            res.code(500).send({
                code: 'INTERNAL_ERROR',
                message: 'Error interno del servidor',
            });
        }
    }
    // Get all leagues
    async getAllLeagues(req, res) {
        try {
            const leagues = await adminService.getAllLeagues();
            res.send(leagues);
        }
        catch (error) {
            if (error instanceof AppError) {
                return res.code(error.statusCode).send({
                    code: error.code,
                    message: error.message,
                });
            }
            console.error('Error in getAllLeagues:', error);
            res.code(500).send({
                code: 'INTERNAL_ERROR',
                message: 'Error interno del servidor',
            });
        }
    }
    // Delete a league
    async deleteLeague(req, res) {
        try {
            const { leagueId } = req.params;
            const result = await adminService.deleteLeague(leagueId);
            res.send(result);
        }
        catch (error) {
            if (error instanceof AppError) {
                return res.code(error.statusCode).send({
                    code: error.code,
                    message: error.message,
                });
            }
            console.error('Error in deleteLeague:', error);
            res.code(500).send({
                code: 'INTERNAL_ERROR',
                message: 'Error interno del servidor',
            });
        }
    }
}
export default new AdminController();
