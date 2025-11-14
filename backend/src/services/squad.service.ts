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
  
  // Obtener plantilla del usuario con datos completos de jugadores
  static async getUserSquad(userId: string, ligaId: string) {
    try {
      // Primero obtener la división de la liga
      const league = await prisma.league.findUnique({
        where: { id: ligaId },
        select: { division: true }
      });

      if (!league) {
        throw new AppError(404, 'NOT_FOUND', 'Liga no encontrada');
      }

      const division = league.division || 'primera';

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

      // Obtener datos completos de todos los jugadores de la plantilla desde la tabla correcta
      const playerIds = squad.players.map(p => p.playerId);
      
      // Determinar qué tabla de jugadores consultar según la división
      const playerTable = division === 'segunda' 
        ? (prisma as any).playerSegunda 
        : division === 'premier'
        ? (prisma as any).playerPremier
        : prisma.player;

      const playersData = await playerTable.findMany({
        where: {
          id: { in: playerIds }
        }
      });

      console.log('[SquadService] Players data fetched:', playersData.map((p: any) => ({
        id: p.id,
        name: p.name,
        photo: p.photo,
        hasPhoto: !!p.photo
      })));

      // Crear mapa para acceso rápido
      const playersMap = new Map(playersData.map((p: any) => [p.id, p]));

      // Enriquecer squad players con datos completos
      const enrichedPlayers = squad.players.map(sp => ({
        ...sp,
        playerData: playersMap.get(sp.playerId) || null
      }));

      console.log('[SquadService] Enriched players sample:', enrichedPlayers[0]);

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

      // Primero obtener la división de la liga
      const league = await prisma.league.findUnique({
        where: { id: ligaId },
        select: { division: true }
      });

      if (!league) {
        throw new AppError(404, 'NOT_FOUND', 'Liga no encontrada');
      }

      const division = league.division || 'primera';

      // Determinar qué tabla de jugadores consultar según la división
      const playerTable = division === 'segunda' 
        ? (prisma as any).playerSegunda 
        : division === 'premier'
        ? (prisma as any).playerPremier
        : prisma.player;

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
          const marketPlayer = await playerTable.findUnique({
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

      // Primero obtener la división de la liga
      const league = await prisma.league.findUnique({
        where: { id: ligaId },
        select: { division: true }
      });

      if (!league) {
        throw new AppError(404, 'NOT_FOUND', 'Liga no encontrada');
      }

      const division = league.division || 'primera';

      // Determinar qué tabla de jugadores consultar según la división
      const playerTable = division === 'segunda' 
        ? (prisma as any).playerSegunda 
        : division === 'premier'
        ? (prisma as any).playerPremier
        : prisma.player;

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
        const existingMarketPlayer = await playerTable.findUnique({
          where: { id: existingPlayer.playerId }
        });
        const existingPrice = existingMarketPlayer?.price || existingPlayer.pricePaid;
        budgetAdjustment += existingPrice; // Devolver el precio de mercado del jugador que sale
      }

      // Verificar presupuesto
      const newBudget = membership.budget + budgetAdjustment;
      if (newBudget < 0) {
        const existingMarketPlayer = existingPlayer ? await playerTable.findUnique({ where: { id: existingPlayer.playerId } }) : null;
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

      // Primero obtener la división de la liga
      const league = await prisma.league.findUnique({
        where: { id: ligaId },
        select: { division: true }
      });

      if (!league) {
        throw new AppError(404, 'NOT_FOUND', 'Liga no encontrada');
      }

      const division = league.division || 'primera';

      // Determinar qué tabla de jugadores consultar según la división
      const playerTable = division === 'segunda' 
        ? (prisma as any).playerSegunda 
        : division === 'premier'
        ? (prisma as any).playerPremier
        : prisma.player;

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
      const marketPlayer = await playerTable.findUnique({
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

  // Copiar plantilla a otra liga del mismo usuario
  static async copySquad(
    userId: string, 
    targetLigaId: string, 
    data: {
      players: Array<{
        playerId: number;
        playerName: string;
        position: string;
        role: string;
        pricePaid: number;
        isCaptain: boolean;
      }>;
      formation: string;
      captainPosition?: string;
    }
  ) {
    try {
      // Verificar que la liga de destino permite cambios
      await this.assertChangesAllowed(targetLigaId);

      // Verificar que el usuario es miembro de la liga destino
      const targetMembership = await prisma.leagueMember.findUnique({
        where: {
          leagueId_userId: {
            leagueId: targetLigaId,
            userId
          }
        }
      });

      if (!targetMembership) {
        throw new AppError(403, 'FORBIDDEN', 'No eres miembro de la liga destino');
      }

      // Calcular el costo total de la plantilla copiada
      const totalCost = data.players.reduce((sum, p) => sum + p.pricePaid, 0);

      // Obtener o crear plantilla en la liga destino
      let targetSquad = await prisma.squad.findUnique({
        where: {
          userId_leagueId: {
            userId,
            leagueId: targetLigaId
          }
        },
        include: {
          players: true
        }
      });

      // Si ya existe una plantilla, calcular su valor para devolverlo al presupuesto
      let oldSquadValue = 0;
      if (targetSquad && targetSquad.players.length > 0) {
        oldSquadValue = targetSquad.players.reduce((sum, p) => sum + p.pricePaid, 0);
        console.log(`[CopySquad] Plantilla existente encontrada con valor: ${oldSquadValue}M`);
      }

      // Calcular nuevo presupuesto: presupuesto actual + valor plantilla vieja - valor plantilla nueva
      const newBudget = targetMembership.budget + oldSquadValue - totalCost;
      console.log(`[CopySquad] Presupuesto actual: ${targetMembership.budget}M, Valor viejo: ${oldSquadValue}M, Costo nuevo: ${totalCost}M, Resultado: ${newBudget}M`);

      // Permitir presupuesto negativo pero informar
      const isNegativeBudget = newBudget < 0;

      if (!targetSquad) {
        // Crear nueva plantilla
        targetSquad = await prisma.squad.create({
          data: {
            userId,
            leagueId: targetLigaId,
            formation: data.formation,
            isActive: true
          },
          include: {
            players: true
          }
        });
      } else {
        // Si existe plantilla, eliminar jugadores actuales para reemplazarlos
        await prisma.squadPlayer.deleteMany({
          where: { squadId: targetSquad.id }
        });

        // Actualizar formación
        await prisma.squad.update({
          where: { id: targetSquad.id },
          data: {
            formation: data.formation
          }
        });
      }

      // Añadir los jugadores copiados
      await prisma.squadPlayer.createMany({
        data: data.players.map(p => ({
          squadId: targetSquad!.id,
          playerId: p.playerId,
          playerName: p.playerName,
          position: p.position,
          role: p.role,
          pricePaid: p.pricePaid,
          isCaptain: p.isCaptain
        }))
      });

      // Actualizar presupuesto
      await prisma.leagueMember.update({
        where: {
          leagueId_userId: {
            leagueId: targetLigaId,
            userId
          }
        },
        data: {
          budget: newBudget
        }
      });

      // Obtener plantilla actualizada
      const updatedSquad = await prisma.squad.findUnique({
        where: { id: targetSquad.id },
        include: { players: true }
      });

      return {
        success: true,
        squad: updatedSquad,
        budget: newBudget,
        totalCost,
        isNegativeBudget,
        message: isNegativeBudget 
          ? `Presupuesto negativo: ${newBudget}M. Debes ajustar la plantilla antes del inicio de la jornada o no puntuarás.`
          : `Plantilla copiada exitosamente. Nuevo presupuesto: ${newBudget}M`
      };
    } catch (error) {
      console.error('Error al copiar plantilla:', error);
      throw error;
    }
  }
}