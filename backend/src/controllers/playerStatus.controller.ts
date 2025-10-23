/**
 * CONTROLADOR DE ESTADO DE JUGADORES
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import {
  getAllPlayersAvailability,
  updateAllPlayersAvailability,
  updatePlayerAvailability,
} from '../services/playerStatus.service.js';

/**
 * GET /api/players/status
 * Obtiene el estado de disponibilidad de todos los jugadores
 */
export async function getPlayersAvailability(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const players = await getAllPlayersAvailability();
    return reply.status(200).send(players);
  } catch (error: any) {
    console.error('Error al obtener estado de jugadores:', error);
    return reply.status(500).send({ 
      error: 'Error al obtener estado de jugadores',
      message: error.message 
    });
  }
}

/**
 * POST /api/players/status/sync
 * Sincroniza el estado de todos los jugadores con la API
 */
export async function syncPlayersAvailability(
  request: FastifyRequest<{
    Body: { season?: number };
  }>,
  reply: FastifyReply
) {
  try {
    const { season = 2024 } = request.body || {};
    
    // Ejecutar sincronización en background
    updateAllPlayersAvailability(season).catch(err => {
      console.error('Error en sincronización en background:', err);
    });

    return reply.status(202).send({ 
      message: 'Sincronización iniciada en background',
      season 
    });
  } catch (error: any) {
    console.error('Error al iniciar sincronización:', error);
    return reply.status(500).send({ 
      error: 'Error al iniciar sincronización',
      message: error.message 
    });
  }
}

/**
 * POST /api/players/:id/status/sync
 * Sincroniza el estado de un jugador específico
 */
export async function syncPlayerAvailability(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { season?: number };
  }>,
  reply: FastifyReply
) {
  try {
    const playerId = parseInt(request.params.id);
    const { season = 2024 } = request.body || {};

    if (isNaN(playerId)) {
      return reply.status(400).send({ error: 'ID de jugador inválido' });
    }

    await updatePlayerAvailability(playerId, season);

    return reply.status(200).send({ 
      message: 'Estado del jugador actualizado',
      playerId,
      season 
    });
  } catch (error: any) {
    console.error('Error al sincronizar jugador:', error);
    return reply.status(500).send({ 
      error: 'Error al sincronizar jugador',
      message: error.message 
    });
  }
}
