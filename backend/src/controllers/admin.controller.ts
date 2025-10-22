import { AdminService } from '../services/admin.service.js';
import { BetEvaluationService } from '../services/betEvaluation.service.js';
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

  // --- Evaluar apuestas pendientes ---
  async evaluateBets(req: any, res: any) {
    try {
      const { leagueId } = req.params;
      
      console.log(`🎯 Iniciando evaluación de apuestas para liga ${leagueId}...`);
      const result = await BetEvaluationService.evaluatePendingBets(leagueId);
      
      res.send({
        success: true,
        ...result,
        message: `Evaluadas ${result.evaluated} apuestas: ${result.won} ganadas, ${result.lost} perdidas`
      });
    } catch (error) {
      this.handleError(res, error, 'Error evaluando apuestas');
    }
  }

  // --- Evaluar TODAS las apuestas pendientes de TODAS las ligas ---
  async evaluateAllBets(req: any, res: any) {
    try {
      console.log(`🌍 Iniciando evaluación de apuestas para TODAS las ligas...`);
      const result = await BetEvaluationService.evaluateAllPendingBets();
      
      res.send({
        success: true,
        ...result,
        message: `Evaluadas ${result.totalEvaluated} apuestas en ${result.leagues.length} ligas: ${result.totalWon} ganadas, ${result.totalLost} perdidas`
      });
    } catch (error) {
      this.handleError(res, error, 'Error evaluando todas las apuestas');
    }
  }

  // --- Calcular puntos en tiempo real para TODAS las ligas ---
  async calculateAllPoints(req: any, res: any) {
    try {
      console.log(`🚀 Iniciando cálculo de puntos para TODAS las ligas...`);
      
      // Importar dinámicamente el servicio de cálculo
      const { PointsCalculationService } = await import('../services/pointsCalculation.service.js');
      
      // Ejecutar en background sin bloquear la respuesta
      PointsCalculationService.calculateAllPoints().catch(err => {
        console.error('Error en cálculo de puntos en background:', err);
      });
      
      // Responder inmediatamente
      res.send({
        success: true,
        message: 'Cálculo de puntos iniciado en segundo plano'
      });
    } catch (error) {
      this.handleError(res, error, 'Error iniciando cálculo de puntos');
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
