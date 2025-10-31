import { FastifyReply, FastifyRequest } from "fastify";
import { getCachedPointsForLeague } from "../services/realtimeCache.service.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getRealtimePoints(request: FastifyRequest, reply: FastifyReply) {
  const { leagueId } = request.params as any;

  // Try exact match (caller might pass API-Football league id)
  let cached = getCachedPointsForLeague(String(leagueId));

  // If not found, try numeric conversion
  if (!cached) {
    const numeric = Number(leagueId);
    if (!Number.isNaN(numeric)) cached = getCachedPointsForLeague(String(numeric));
  }

  // If still not found, attempt to resolve internal league -> external API league mapping
  if (!cached) {
    try {
      const league = await prisma.league.findUnique({ where: { id: String(leagueId) }, select: { id: true } });
      // If we have a default external league configured, use it
      const configured = process.env.FOOTBALL_API_LEAGUE_ID || process.env.API_FOOTBALL_LEAGUE_ID || process.env.API_LEAGUE_ID || '140';
      cached = getCachedPointsForLeague(String(configured));
    } catch (err) {
      // ignore
    }
  }

  if (!cached) {
    return reply.status(204).send({ message: "No live data available" });
  }

  return reply.send({ lastUpdate: cached.lastUpdate, players: cached.players });
}

export default {
  getRealtimePoints,
};
