import { PlayerService } from '../services/player.service.js';
export class PlayerController {
    /**
     * Sincronizar jugadores desde la API
     * POST /api/players/sync
     */
    static async syncPlayers(req, reply) {
        try {
            const result = await PlayerService.syncPlayersFromAPI();
            return reply.status(200).send({
                success: result.success,
                message: 'Sincronización completada',
                data: result,
            });
        }
        catch (error) {
            console.error('Error en sincronización:', error);
            return reply.status(500).send({
                success: false,
                message: error?.message || 'Error al sincronizar jugadores',
            });
        }
    }
    /**
     * Obtener todos los jugadores
     * GET /api/players
     */
    static async getAllPlayers(req, reply) {
        try {
            const query = req.query;
            const { position, teamId, minPrice, maxPrice, search } = query;
            let players;
            if (search) {
                players = await PlayerService.searchPlayers(search);
            }
            else if (position) {
                players = await PlayerService.getPlayersByPosition(position);
            }
            else if (teamId) {
                players = await PlayerService.getPlayersByTeam(Number(teamId));
            }
            else {
                players = await PlayerService.getAllPlayers();
            }
            // Filtrar por rango de precio si se proporciona
            if (minPrice || maxPrice) {
                const min = minPrice ? Number(minPrice) : 0;
                const max = maxPrice ? Number(maxPrice) : 250;
                players = players.filter((p) => p.price >= min && p.price <= max);
            }
            return reply.status(200).send({
                success: true,
                data: players,
                count: players.length,
            });
        }
        catch (error) {
            console.error('Error obteniendo jugadores:', error);
            return reply.status(500).send({
                success: false,
                message: error?.message || 'Error al obtener jugadores',
            });
        }
    }
    /**
     * Obtener jugador por ID
     * GET /api/players/:id
     */
    static async getPlayerById(req, reply) {
        try {
            const params = req.params;
            const { id } = params;
            const player = await PlayerService.getPlayerById(Number(id));
            return reply.status(200).send({
                success: true,
                data: player,
            });
        }
        catch (error) {
            console.error('Error obteniendo jugador:', error);
            return reply.status(404).send({
                success: false,
                message: error?.message || 'Jugador no encontrado',
            });
        }
    }
    /**
     * Actualizar precio de jugador
     * PATCH /api/players/:id/price
     */
    static async updatePlayerPrice(req, reply) {
        try {
            const params = req.params;
            const body = req.body;
            const { id } = params;
            const { price } = body;
            if (!price || price < 1 || price > 250) {
                return reply.status(400).send({
                    success: false,
                    message: 'El precio debe estar entre 1M y 250M',
                });
            }
            const player = await PlayerService.updatePlayerPrice(Number(id), Number(price));
            return reply.status(200).send({
                success: true,
                message: 'Precio actualizado correctamente',
                data: player,
            });
        }
        catch (error) {
            console.error('Error actualizando precio:', error);
            return reply.status(500).send({
                success: false,
                message: error?.message || 'Error al actualizar precio',
            });
        }
    }
    /**
     * Actualizar posición de jugador
     * PATCH /api/players/:id/position
     */
    static async updatePlayerPosition(req, reply) {
        try {
            const params = req.params;
            const body = req.body;
            const { id } = params;
            const { position } = body;
            const validPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
            if (!position || !validPositions.includes(position)) {
                return reply.status(400).send({
                    success: false,
                    message: `La posición debe ser una de: ${validPositions.join(', ')}`,
                });
            }
            const player = await PlayerService.updatePlayerPosition(Number(id), position);
            return reply.status(200).send({
                success: true,
                message: 'Posición actualizada correctamente',
                data: player,
            });
        }
        catch (error) {
            console.error('Error actualizando posición:', error);
            return reply.status(500).send({
                success: false,
                message: error?.message || 'Error al actualizar posición',
            });
        }
    }
    /**
     * Obtener estadísticas de jugadores
     * GET /api/players/stats
     */
    static async getStats(req, reply) {
        try {
            const stats = await PlayerService.getStats();
            return reply.status(200).send({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return reply.status(500).send({
                success: false,
                message: error?.message || 'Error al obtener estadísticas',
            });
        }
    }
}
