import { BetOptionService } from '../services/betOption.service.js';
import { AppError } from '../utils/errors.js';
export class BetOptionController {
    /**
     * GET /api/bet-options/:leagueId/:jornada
     * Obtener opciones de apuesta para una liga y jornada
     */
    static async getBetOptions(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
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
        }
        catch (error) {
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
    static async saveBetOptions(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
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
        }
        catch (error) {
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
    static async checkOptionsExist(request, reply) {
        try {
            const userId = request.user?.sub || request.user?.id;
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
        }
        catch (error) {
            if (error instanceof AppError) {
                return reply.status(error.statusCode).send({ error: error.message });
            }
            console.error('Error checking bet options:', error);
            return reply.status(500).send({ error: error.message });
        }
    }
}
