import { JornadaService } from '../services/jornada.service.js';
export class JornadaController {
    /**
     * POST /api/jornada/reset/:leagueId
     * Resetear una liga específica para nueva jornada
     */
    static async resetJornadaLeague(request, reply) {
        try {
            const { leagueId } = request.params;
            const { jornada } = request.body;
            if (!jornada || jornada < 1) {
                return reply.status(400).send({ error: 'Jornada inválida' });
            }
            const result = await JornadaService.resetJornada(leagueId, jornada);
            // Convertir Map a objeto para JSON
            const balancesObj = {};
            result.balances.forEach((value, key) => {
                balancesObj[key] = value;
            });
            return reply.status(200).send({
                success: true,
                message: `Jornada ${jornada} procesada correctamente`,
                data: {
                    evaluatedBets: result.evaluations.length,
                    updatedMembers: result.updatedMembers,
                    balances: balancesObj,
                },
            });
        }
        catch (error) {
            console.error('Error en resetJornadaLeague:', error);
            return reply.status(500).send({ error: error.message || 'Error al resetear jornada' });
        }
    }
    /**
     * POST /api/jornada/reset-all
     * Resetear todas las ligas para nueva jornada
     */
    static async resetJornadaAll(request, reply) {
        try {
            const { jornada } = request.body;
            if (!jornada || jornada < 1) {
                return reply.status(400).send({ error: 'Jornada inválida' });
            }
            const result = await JornadaService.resetAllLeagues(jornada);
            return reply.status(200).send({
                success: true,
                message: `Jornada ${jornada} procesada para todas las ligas`,
                data: {
                    leaguesProcessed: result.leaguesProcessed,
                    totalEvaluations: result.totalEvaluations,
                },
            });
        }
        catch (error) {
            console.error('Error en resetJornadaAll:', error);
            return reply.status(500).send({ error: error.message || 'Error al resetear jornada' });
        }
    }
    /**
     * POST /api/jornada/evaluate/:leagueId
     * Evaluar apuestas de una jornada sin resetear presupuestos (solo para testing)
     */
    static async evaluateJornada(request, reply) {
        try {
            const { leagueId } = request.params;
            const { jornada } = request.body;
            if (!jornada || jornada < 1) {
                return reply.status(400).send({ error: 'Jornada inválida' });
            }
            const evaluations = await JornadaService.evaluateJornadaBets(jornada, leagueId);
            const balances = await JornadaService.calculateUserBalances(leagueId, evaluations);
            // Convertir Map a objeto
            const balancesObj = {};
            balances.forEach((value, key) => {
                balancesObj[key] = value;
            });
            return reply.status(200).send({
                success: true,
                message: `Apuestas de jornada ${jornada} evaluadas (sin aplicar cambios de presupuesto)`,
                data: {
                    evaluations,
                    balances: balancesObj,
                },
            });
        }
        catch (error) {
            console.error('Error en evaluateJornada:', error);
            return reply.status(500).send({ error: error.message || 'Error al evaluar jornada' });
        }
    }
    /**
     * POST /api/jornada/open/:leagueId
     * Abrir jornada (antes "Cerrar") - Bloquea apuestas y modificaciones
     * No requiere jornada, usa la actual de la liga
     */
    static async openJornada(request, reply) {
        try {
            const { leagueId } = request.params;
            const result = await JornadaService.openJornada(leagueId);
            return reply.status(200).send(result);
        }
        catch (error) {
            console.error('Error en openJornada:', error);
            return reply.status(500).send({ error: error.message || 'Error al abrir jornada' });
        }
    }
    /**
     * POST /api/jornada/close/:leagueId
     * Cerrar jornada (antes "Abrir") - Permite apuestas y modificaciones
     * No requiere jornada, usa la actual de la liga
     */
    static async closeJornada(request, reply) {
        try {
            const { leagueId } = request.params;
            const result = await JornadaService.closeJornada(leagueId);
            return reply.status(200).send(result);
        }
        catch (error) {
            console.error('Error en closeJornada:', error);
            return reply.status(500).send({ error: error.message || 'Error al cerrar jornada' });
        }
    }
    /**
     * GET /api/jornada/status/:leagueId
     * Obtener estado actual de la jornada
     */
    static async getJornadaStatus(request, reply) {
        try {
            const { leagueId } = request.params;
            const result = await JornadaService.getJornadaStatus(leagueId);
            return reply.status(200).send(result);
        }
        catch (error) {
            console.error('Error en getJornadaStatus:', error);
            return reply.status(500).send({ error: error.message || 'Error al obtener estado de jornada' });
        }
    }
    /**
     * POST /api/jornada/open-all
     * Abrir jornada para TODAS las ligas (bloquea cambios)
     */
    static async openAllJornadas(request, reply) {
        try {
            const result = await JornadaService.openAllJornadas();
            return reply.status(200).send(result);
        }
        catch (error) {
            console.error('Error en openAllJornadas:', error);
            return reply.status(500).send({ error: error.message || 'Error al abrir jornadas' });
        }
    }
    /**
     * POST /api/jornada/close-all
     * Cerrar jornada para TODAS las ligas (permite cambios)
     */
    static async closeAllJornadas(request, reply) {
        try {
            const result = await JornadaService.closeAllJornadas();
            return reply.status(200).send(result);
        }
        catch (error) {
            console.error('Error en closeAllJornadas:', error);
            return reply.status(500).send({ error: error.message || 'Error al cerrar jornadas' });
        }
    }
}
