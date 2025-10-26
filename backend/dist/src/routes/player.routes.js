import { PlayerController } from '../controllers/player.controller.js';
export default async function playerRoutes(app) {
    /**
     * @route POST /api/players/sync
     * @desc Sincronizar jugadores desde la API de LaLiga
     * @access Public (puede requerir autenticación en producción)
     */
    app.post('/sync', PlayerController.syncPlayers);
    /**
     * @route GET /api/players/stats
     * @desc Obtener estadísticas de jugadores (debe ir antes de /:id)
     * @access Public
     */
    app.get('/stats', PlayerController.getStats);
    /**
     * @route GET /api/players
     * @desc Obtener todos los jugadores (con filtros opcionales)
     * @query position - Filtrar por posición
     * @query teamId - Filtrar por equipo
     * @query minPrice - Precio mínimo
     * @query maxPrice - Precio máximo
     * @query search - Buscar por nombre
     * @access Public
     */
    app.get('/', PlayerController.getAllPlayers);
    /**
     * @route GET /api/players/:id
     * @desc Obtener jugador por ID
     * @access Public
     */
    app.get('/:id', PlayerController.getPlayerById);
    /**
     * @route POST /api/players/:id/jornada-points
     * @desc Obtener/actualizar puntos por jornada en caché
     * @access Public
     */
    app.post('/:id/jornada-points', PlayerController.getJornadaPoints);
    /**
     * @route PATCH /api/players/:id/price
     * @desc Actualizar precio de un jugador
     * @access Private (Admin)
     */
    app.patch('/:id/price', PlayerController.updatePlayerPrice);
    /**
     * @route PATCH /api/players/:id/position
     * @desc Actualizar posición de un jugador
     * @access Private (Admin)
     */
    app.patch('/:id/position', PlayerController.updatePlayerPosition);
    /**
     * @route PATCH /api/players/:id/last-points
     * @desc Actualizar puntos de la última jornada (cache)
     * @access Private
     */
    app.patch('/:id/last-points', PlayerController.updateLastPoints);
    /**
     * @route DELETE /api/players/:id
     * @desc Eliminar un jugador (admin)
     */
    app.delete('/:id', PlayerController.deletePlayer);
}
