import { PrismaClient } from "@prisma/client";
import { LeagueRepo } from "../repositories/league.repo.js";
import { LeagueMemberRepo } from "../repositories/leagueMember.js";

// Generar código único de 8 caracteres (letras mayúsculas y números)
const generateUniqueCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const LeagueService = {
  createLeague: async (name: string, leaderId: string) => {
    // Generar código único, reintentar si hay colisión
    let code = generateUniqueCode();
    let attempts = 0;
    while (attempts < 10) {
      try {
        return await LeagueRepo.create(name, leaderId, code);
      } catch (error: any) {
        // Si es error de código duplicado, generar otro
        if (error?.code === 'P2002' && error?.meta?.target?.includes('code')) {
          code = generateUniqueCode();
          attempts++;
        } else {
          throw error;
        }
      }
    }
    throw new Error('No se pudo generar un código único');
  },

  deleteLeague: async (leagueId: string, leaderId: string) => {
    const res = await LeagueRepo.deleteIfLeader(leagueId, leaderId);
    if (res.count === 0) throw new Error("Not leader or league not found");
    return { deleted: true };
  },

  addMember: (leagueId: string, userId: string) =>
    LeagueMemberRepo.add(leagueId, userId),

  addMemberByCode: async (code: string, userId: string) => {
    const league = await LeagueRepo.getByCode(code);
    if (!league) {
      throw new Error('Código de liga inválido');
    }
    const member = await LeagueMemberRepo.add(league.id, userId);
    return {
      ...member,
      league: {
        id: league.id,
        name: league.name,
        code: league.code
      }
    };
  },

  removeMember: (leagueId: string, userId: string) =>
    LeagueMemberRepo.remove(leagueId, userId),

  listMembers: async (leagueId: string) => {
    // Obtener información de la liga
    const league = await LeagueRepo.getById(leagueId);
    if (!league) {
      throw new Error('Liga no encontrada');
    }

    // Obtener miembros con información de la liga incluida
    const members = await LeagueMemberRepo.listByLeague(leagueId);
    
    // Agregar información de la liga a cada miembro
    return members.map(member => ({
      ...member,
      league: {
        id: league.id,
        name: league.name,
        code: league.code
      }
    }));
  },

  /**
   * Obtiene la clasificación de una liga para una jornada específica
   * Calcula los puntos de cada usuario sumando los puntos de sus jugadores en esa jornada
   */
  listMembersByJornada: async (leagueId: string, jornada: number) => {
    const prisma = new PrismaClient();
    
    try {
      // Obtener información de la liga
      const league = await LeagueRepo.getById(leagueId);
      if (!league) {
        throw new Error('Liga no encontrada');
      }

      // Obtener todos los miembros de la liga
      const members = await LeagueMemberRepo.listByLeague(leagueId);

      // Para cada miembro, calcular puntos de la jornada
      const membersWithJornadaPoints = await Promise.all(
        members.map(async (member) => {
          try {
            // Obtener la plantilla del usuario en esta liga
            const squad = await prisma.squad.findUnique({
              where: {
                userId_leagueId: {
                  userId: member.userId,
                  leagueId: leagueId
                }
              },
              include: {
                players: true
              }
            });

            if (!squad || squad.players.length === 0) {
              return {
                ...member,
                points: 0,
                league: {
                  id: league.id,
                  name: league.name,
                  code: league.code
                }
              };
            }

            // Obtener las estadísticas de todos los jugadores de la plantilla para esta jornada
            const playerIds = squad.players.map((p: any) => p.playerId);
            const playerStats = await prisma.playerStats.findMany({
              where: {
                playerId: { in: playerIds },
                jornada: jornada,
                season: 2025
              }
            });

            // Calcular puntos totales de la jornada
            let totalPoints = 0;
            let captainId: number | null = null;

            // Encontrar el capitán
            const captainPlayer = squad.players.find((p: any) => p.isCaptain);
            if (captainPlayer) {
              captainId = captainPlayer.playerId;
            }

            // Sumar puntos de cada jugador
            playerStats.forEach((stats: any) => {
              const points = stats.totalPoints || 0;
              
              // Si es el capitán, doblar los puntos
              if (captainId && stats.playerId === captainId) {
                totalPoints += points * 2;
              } else {
                totalPoints += points;
              }
            });

            return {
              ...member,
              points: totalPoints,
              league: {
                id: league.id,
                name: league.name,
                code: league.code
              }
            };
          } catch (error) {
            console.error(`Error calculando puntos para usuario ${member.userId}:`, error);
            return {
              ...member,
              points: 0,
              league: {
                id: league.id,
                name: league.name,
                code: league.code
              }
            };
          }
        })
      );

      // Ordenar por puntos descendente
      return membersWithJornadaPoints.sort((a, b) => b.points - a.points);
    } finally {
      await prisma.$disconnect();
    }
  },

getLeaguesByUser: (userId: string) =>
  LeagueRepo.getByUserId(userId),


};
