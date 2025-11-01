import { FastifyReply, FastifyRequest } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Obtiene los puntos en tiempo real de una liga
 * Ahora lee directamente de LeagueMember.points (actualizado por el worker centralizado)
 * en lugar de usar el caché en memoria (que hacía llamadas a la API)
 */
export async function getRealtimePoints(request: FastifyRequest, reply: FastifyReply) {
  const { leagueId } = request.params as any;

  try {
    // Obtener todos los miembros de la liga con sus puntos actuales
    const members = await prisma.leagueMember.findMany({
      where: { leagueId: String(leagueId) },
      select: {
        userId: true,
        points: true,
        user: {
          select: {
            name: true,
          }
        }
      }
    });

    if (!members || members.length === 0) {
      return reply.status(204).send({ message: "No data available for this league" });
    }

    // Formatear respuesta compatible con el formato anterior
    const players = members.map(member => ({
      userId: member.userId,
      userName: member.user.name,
      points: member.points || 0,
    }));

    return reply.send({ 
      lastUpdate: Date.now(), 
      players 
    });
  } catch (error) {
    console.error('[getRealtimePoints] Error:', error);
    return reply.status(500).send({ 
      error: "Error al obtener puntos en tiempo real" 
    });
  }
}

export default {
  getRealtimePoints,
};
