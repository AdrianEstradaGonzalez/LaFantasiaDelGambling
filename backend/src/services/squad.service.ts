import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

export interface CreateSquadDto {
  userId: string;
  ligaId: string;
  formation: string;
  captainPosition?: string;
  players: {
    position: string;
    playerId: number;
    playerName: string;
    role: string;
  }[];
}

export interface UpdateSquadDto {
  formation?: string;
  captainPosition?: string;
  players?: {
    position: string;
    playerId: number;
    playerName: string;
    role: string;
    pricePaid?: number;
  }[];
}

export interface AddPlayerDto {
  position: string;
  playerId: number;
  playerName: string;
  role: string;
  pricePaid: number;
  currentFormation?: string; // Formación actual que puede no estar guardada aún
}

export class SquadService {
  // Verifica si la liga permite cambios (jornada no bloqueada)
  private static async assertChangesAllowed(ligaId: string) {
    const league = await prisma.league.findUnique({
      where: { id: ligaId },
      select: { jornadaStatus: true, name: true }
    });

    if (!league) {
      throw new AppError(404, 'NOT_FOUND', 'Liga no encontrada');
    }

    if (league.jornadaStatus === 'closed') {
      throw new AppError(
        403,
        'JORNADA_BLOQUEADA',
        'La jornada está abierta (bloqueada). No se permiten modificaciones de plantillas ni fichajes en este momento.'
      );
    }
  }
  
  // 🚀 OPTIMIZADO: Obtener plantilla y enriquecer con datos de jugadores
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

      if (!squad) {
        return null;
      }

      // 🚀 Obtener datos completos de todos los jugadores en una sola query
      const playerIds = squad.players.map(p => p.playerId);
      const playersData = await prisma.player.findMany({
        where: {
          id: { in: playerIds }
        }
      });

      // Crear mapa para acceso rápido
      const playersMap = new Map(playersData.map(p => [p.id, p]));

      // Enriquecer squad players con datos completos
      const enrichedPlayers = squad.players.map(sp => ({
        ...sp,
        playerData: playersMap.get(sp.playerId) || null
      }));

      return {
        ...squad,
        players: enrichedPlayers
      };
    } catch (error) {
      console.error('Error al obtener plantilla:', error);
      throw new Error('Error al obtener la plantilla');
    }
  }

  // Crear nueva plantilla
  static async createSquad(data: CreateSquadDto) {
    try {
      // Bloquear si la jornada está abierta (bloqueada)
      await this.assertChangesAllowed(data.ligaId);

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

      // Si se especificó un capitán, establecerlo
      if (data.captainPosition) {
        const captainPlayer = squad.players.find(p => p.position === data.captainPosition);
        if (captainPlayer) {
          await prisma.squadPlayer.update({
            where: { id: captainPlayer.id },
            data: { isCaptain: true }
          });
        }
      }

      // Obtener plantilla actualizada con el capitán
      const updatedSquad = await prisma.squad.findUnique({
        where: { id: squad.id },
        include: { players: true }
      });

      return updatedSquad;
    } catch (error) {
      console.error('Error al crear plantilla:', error);
      throw error;
    }
  }

  // Actualizar plantilla existente (ahora SÍ actualiza presupuesto al cambiar formación)
  static async updateSquad(userId: string, ligaId: string, data: UpdateSquadDto) {
    try {
      // Bloquear si la jornada está abierta (bloqueada)
      await this.assertChangesAllowed(ligaId);

      // Verificar que la plantilla existe y pertenece al usuario
      const existingSquad = await prisma.squad.findUnique({
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

      if (!existingSquad) {
        throw new Error('Plantilla no encontrada');
      }

      // Si se proporcionan nuevos jugadores, calcular jugadores eliminados y devolver su dinero
      let budgetRefund = 0;
      if (data.players) {
        // Obtener IDs de jugadores nuevos
        const newPlayerIds = new Set(data.players.map(p => p.playerId));
        
        // Encontrar jugadores que se están eliminando
        const removedPlayers = existingSquad.players.filter(p => !newPlayerIds.has(p.playerId));
        
        // Calcular dinero a devolver (precio de mercado actual de cada jugador eliminado)
        for (const removedPlayer of removedPlayers) {
          const marketPlayer = await prisma.player.findUnique({
            where: { id: removedPlayer.playerId }
          });
          const refundAmount = marketPlayer?.price || removedPlayer.pricePaid;
          budgetRefund += refundAmount;
        }

        console.log(`Jugadores eliminados: ${removedPlayers.length}, Dinero a devolver: ${budgetRefund}M`);

        // Actualizar presupuesto si hay dinero a devolver
        if (budgetRefund > 0) {
          await prisma.leagueMember.update({
            where: {
              leagueId_userId: {
                leagueId: ligaId,
                userId
              }
            },
            data: {
              budget: {
                increment: budgetRefund
              }
            }
          });
        }

        // Eliminar jugadores existentes
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

      // Si se especificó un capitán, actualizar
      if (data.captainPosition !== undefined) {
        // Quitar capitán a todos
        await prisma.squadPlayer.updateMany({
          where: {
            squadId: updatedSquad.id,
            isCaptain: true
          },
          data: {
            isCaptain: false
          }
        });

        // Establecer nuevo capitán si se proporcionó una posición
        if (data.captainPosition) {
          const captainPlayer = updatedSquad.players.find(p => p.position === data.captainPosition);
          if (captainPlayer) {
            await prisma.squadPlayer.update({
              where: { id: captainPlayer.id },
              data: { isCaptain: true }
            });
          }
        }
      }

      // Obtener plantilla actualizada con el capitán
      const finalSquad = await prisma.squad.findUnique({
        where: { id: updatedSquad.id },
        include: { players: true }
      });

      // Obtener el presupuesto actualizado
      const membership = await prisma.leagueMember.findUnique({
        where: {
          leagueId_userId: {
            leagueId: ligaId,
            userId
          }
        }
      });

      return {
        squad: finalSquad,
        budget: membership?.budget || 0,
        refundedAmount: budgetRefund
      };
    } catch (error) {
      console.error('Error al actualizar plantilla:', error);
      throw error;
    }
  }

  // Eliminar plantilla
  static async deleteSquad(userId: string, ligaId: string) {
    try {
      // Bloquear si la jornada está abierta (bloqueada)
      await this.assertChangesAllowed(ligaId);

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

  // Obtener presupuesto del usuario en una liga
  static async getUserBudget(userId: string, ligaId: string) {
    try {
      const membership = await prisma.leagueMember.findUnique({
        where: {
          leagueId_userId: {
            leagueId: ligaId,
            userId
          }
        }
      });

      if (!membership) {
        throw new Error('El usuario no es miembro de esta liga');
      }

      return membership.budget;
    } catch (error) {
      console.error('Error al obtener presupuesto:', error);
      throw error;
    }
  }

  // Añadir jugador a una posición específica (AHORA SÍ actualiza presupuesto)
  static async addPlayerToSquad(userId: string, ligaId: string, playerData: AddPlayerDto) {
    try {
      // Bloquear si la jornada está abierta (bloqueada)
      await this.assertChangesAllowed(ligaId);

      // Obtener plantilla
      let squad = await prisma.squad.findUnique({
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

      // Si no existe plantilla, crearla con formación recibida o por defecto
      if (!squad) {
        squad = await prisma.squad.create({
          data: {
            userId,
            leagueId: ligaId,
            formation: playerData.currentFormation || '4-4-2', // Usar formación recibida si existe
            isActive: true
          },
          include: {
            players: true
          }
        });
      }

      // Validar que no se exceda el límite de jugadores según la formación
      // Usar la formación actual del parámetro si existe, sino usar la guardada en BD
      const formation = playerData.currentFormation || squad.formation;
      const [defenders, midfielders, attackers] = formation.split('-').map(Number);
      
      // Contar jugadores actuales por rol (excluyendo la posición que se va a reemplazar)
      const currentPlayersByRole = squad.players
        .filter(p => p.position !== playerData.position)
        .reduce((acc, p) => {
          acc[p.role] = (acc[p.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      // Obtener límites según formación
      const limits: Record<string, number> = {
        'POR': 1,
        'DEF': defenders,
        'CEN': midfielders,
        'DEL': attackers
      };

      // Verificar si se excedería el límite
      const currentCount = currentPlayersByRole[playerData.role] || 0;
      const limit = limits[playerData.role] || 0;
      
      if (currentCount >= limit) {
        const roleNames: Record<string, string> = {
          'POR': 'porteros',
          'DEF': 'defensas',
          'CEN': 'centrocampistas',
          'DEL': 'delanteros'
        };
        // No lanzar error, devolver validación fallida
        return {
          success: false,
          message: `Tu formación ${formation} solo permite ${limit} ${roleNames[playerData.role]}. Cambia la formación o vende un jugador primero.`
        };
      }

      // Obtener presupuesto actual
      const membership = await prisma.leagueMember.findUnique({
        where: {
          leagueId_userId: {
            leagueId: ligaId,
            userId
          }
        }
      });

      if (!membership) {
        throw new Error('Usuario no es miembro de la liga');
      }

      // Verificar si ya existe un jugador en esa posición
      const existingPlayer = await prisma.squadPlayer.findUnique({
        where: {
          squadId_position: {
            squadId: squad.id,
            position: playerData.position
          }
        }
      });

      // Calcular ajuste de presupuesto
      let budgetAdjustment = -playerData.pricePaid;
      if (existingPlayer) {
        // Obtener precio actual de mercado del jugador existente
        const existingMarketPlayer = await prisma.player.findUnique({
          where: { id: existingPlayer.playerId }
        });
        const existingPrice = existingMarketPlayer?.price || existingPlayer.pricePaid;
        budgetAdjustment += existingPrice; // Devolver el precio de mercado del jugador que sale
      }

      // Verificar presupuesto
      const newBudget = membership.budget + budgetAdjustment;
      if (newBudget < 0) {
        const existingMarketPlayer = existingPlayer ? await prisma.player.findUnique({ where: { id: existingPlayer.playerId } }) : null;
        const refundFromExisting = existingMarketPlayer?.price || (existingPlayer ? existingPlayer.pricePaid : 0);
        const required = playerData.pricePaid - refundFromExisting;
        throw new Error(`Presupuesto insuficiente. Necesitas ${required}M adicionales`);
      }

      // Si existe jugador en esa posición, eliminarlo
      if (existingPlayer) {
        await prisma.squadPlayer.delete({
          where: { id: existingPlayer.id }
        });
      }

      // Añadir nuevo jugador
      const newPlayer = await prisma.squadPlayer.create({
        data: {
          squadId: squad.id,
          playerId: playerData.playerId,
          playerName: playerData.playerName,
          position: playerData.position,
          role: playerData.role,
          pricePaid: playerData.pricePaid
        }
      });

      // Actualizar presupuesto
      const updatedMembership = await prisma.leagueMember.update({
        where: {
          leagueId_userId: {
            leagueId: ligaId,
            userId
          }
        },
        data: {
          budget: newBudget
        }
      });

      return {
        success: true,
        player: newPlayer,
        budget: updatedMembership.budget
      };
    } catch (error) {
      console.error('Error al añadir jugador:', error);
      throw error;
    }
  }

  // Eliminar/vender jugador de una posición (AHORA SÍ actualiza presupuesto)
  static async removePlayerFromSquad(userId: string, ligaId: string, position: string) {
    try {
      // Bloquear si la jornada está abierta (bloqueada)
      await this.assertChangesAllowed(ligaId);

      // Obtener plantilla
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

      if (!squad) {
        throw new Error('No tienes una plantilla en esta liga');
      }

      // Buscar jugador en esa posición
      const playerToRemove = await prisma.squadPlayer.findUnique({
        where: {
          squadId_position: {
            squadId: squad.id,
            position
          }
        }
      });

      if (!playerToRemove) {
        throw new Error('No hay ningún jugador en esa posición');
      }

      // Obtener precio actual de mercado del jugador
      const marketPlayer = await prisma.player.findUnique({
        where: { id: playerToRemove.playerId }
      });

      const refundAmount = marketPlayer?.price || playerToRemove.pricePaid;

      // Eliminar jugador
      await prisma.squadPlayer.delete({
        where: { id: playerToRemove.id }
      });

      // Devolver dinero al presupuesto
      const updatedMembership = await prisma.leagueMember.update({
        where: {
          leagueId_userId: {
            leagueId: ligaId,
            userId
          }
        },
        data: {
          budget: {
            increment: refundAmount
          }
        }
      });

      return {
        success: true,
        refundedAmount: refundAmount,
        budget: updatedMembership.budget
      };
    } catch (error) {
      console.error('Error al eliminar jugador:', error);
      throw error;
    }
  }

  // Establecer capitán de la plantilla
  static async setCaptain(userId: string, ligaId: string, position: string) {
    try {
      // Bloquear si la jornada está abierta (bloqueada)
      await this.assertChangesAllowed(ligaId);

      // Obtener plantilla
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

      if (!squad) {
        throw new Error('No tienes una plantilla en esta liga');
      }

      // Verificar que existe un jugador en la posición especificada
      const captainPlayer = await prisma.squadPlayer.findUnique({
        where: {
          squadId_position: {
            squadId: squad.id,
            position
          }
        }
      });

      if (!captainPlayer) {
        throw new Error('No hay ningún jugador en esa posición');
      }

      // Quitar capitán a todos los jugadores de la plantilla
      await prisma.squadPlayer.updateMany({
        where: {
          squadId: squad.id,
          isCaptain: true
        },
        data: {
          isCaptain: false
        }
      });

      // Establecer nuevo capitán
      await prisma.squadPlayer.update({
        where: {
          id: captainPlayer.id
        },
        data: {
          isCaptain: true
        }
      });

      // Obtener plantilla actualizada
      const updatedSquad = await prisma.squad.findUnique({
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

      return {
        success: true,
        squad: updatedSquad
      };
    } catch (error) {
      console.error('Error al establecer capitán:', error);
      throw error;
    }
  }
}