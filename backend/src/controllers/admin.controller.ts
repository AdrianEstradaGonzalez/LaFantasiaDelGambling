import { AdminService } from '../services/admin.service.js';
import { AppError } from '../utils/errors.js';

const adminService = new AdminService();

export class AdminController {
  // --- Obtener todos los usuarios ---
  async getAllUsers(req: any, res: any) {
    try {
      const users = await adminService.getAllUsers();
      res.send(users);
    } catch (error) {
      this.handleError(res, error, 'Error obteniendo usuarios');
    }
  }

  // --- Eliminar un usuario ---
  async deleteUser(req: any, res: any) {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.sub;

      const result = await adminService.deleteUser(userId, requestingUserId);
      res.send(result);
    } catch (error) {
      this.handleError(res, error, 'Error eliminando usuario');
    }
  }

  // --- Obtener todas las ligas ---
  async getAllLeagues(req: any, res: any) {
    try {
      const leagues = await adminService.getAllLeagues();
      res.send(leagues);
    } catch (error) {
      this.handleError(res, error, 'Error obteniendo ligas');
    }
  }

  // --- Eliminar una liga ---
  async deleteLeague(req: any, res: any) {
    try {
      const { leagueId } = req.params;
      const result = await adminService.deleteLeague(leagueId);
      res.send(result);
    } catch (error) {
      this.handleError(res, error, 'Error eliminando liga');
    }
  }

  // --- Manejador común de errores ---
  private handleError(res: any, error: any, defaultMsg: string) {
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
