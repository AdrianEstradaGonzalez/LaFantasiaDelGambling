import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateSquadDto {
  userId: string;
  ligaId: string;
  formation: string;
  players: {
    position: string;
    playerId: number;
    playerName: string;
    role: string;
  }[];
}

export interface UpdateSquadDto {
  formation?: string;
  players?: {
    position: string;
    playerId: number;
    playerName: string;
    role: string;
  }[];
}

export class SquadService {
  
  // Obtener plantilla del usuario para una liga específica
  static async getUserSquad(userId: string, ligaId: string) {
    try {
      const squad = await prisma.squad.findUnique({
        where: {
          userId_leagueId: {
            userId,
            leagueId: ligaId
          }
        },
        include: {
          players: true
        }
      });

      return squad;
    } catch (error) {
      console.error('Error al obtener plantilla:', error);
      throw new Error('Error al obtener la plantilla');
    }
  }

  // Crear nueva plantilla
  static async createSquad(data: CreateSquadDto) {
    try {
      // Verificar que el usuario es miembro de la liga
      const membership = await prisma.leagueMember.findUnique({
        where: {
          leagueId_userId: {
            leagueId: data.ligaId,
            userId: data.userId
          }
        }
      });

      if (!membership) {
        throw new Error('El usuario no es miembro de esta liga');
      }

      // Crear la plantilla
      const squad = await prisma.squad.create({
        data: {
          userId: data.userId,
          leagueId: data.ligaId,
          formation: data.formation,
          players: {
            create: data.players
          }
        },
        include: {
          players: true
        }
      });

      return squad;
    } catch (error) {
      console.error('Error al crear plantilla:', error);
      throw error;
    }
  }

  // Actualizar plantilla existente
  static async updateSquad(userId: string, ligaId: string, data: UpdateSquadDto) {
    try {
      // Verificar que la plantilla existe y pertenece al usuario
      const existingSquad = await prisma.squad.findUnique({
        where: {
          userId_leagueId: {
            userId,
            leagueId: ligaId
          }
        }
      });

      if (!existingSquad) {
        throw new Error('Plantilla no encontrada');
      }

      // Eliminar jugadores existentes si se proporcionan nuevos
      if (data.players) {
        await prisma.squadPlayer.deleteMany({
          where: { squadId: existingSquad.id }
        });
      }

      // Actualizar la plantilla
      const updatedSquad = await prisma.squad.update({
        where: { id: existingSquad.id },
        data: {
          formation: data.formation || existingSquad.formation,
          updatedAt: new Date(),
          ...(data.players && {
            players: {
              create: data.players
            }
          })
        },
        include: {
          players: true
        }
      });

      return updatedSquad;
    } catch (error) {
      console.error('Error al actualizar plantilla:', error);
      throw error;
    }
  }

  // Eliminar plantilla
  static async deleteSquad(userId: string, ligaId: string) {
    try {
      const squad = await prisma.squad.findUnique({
        where: {
          userId_leagueId: {
            userId,
            leagueId: ligaId
          }
        }
      });

      if (!squad) {
        throw new Error('Plantilla no encontrada');
      }

      await prisma.squad.delete({
        where: { id: squad.id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error al eliminar plantilla:', error);
      throw error;
    }
  }
}