import { PrismaClient } from "@prisma/client";
import { LeagueRepo } from "../repositories/league.repo.js";
import { LeagueMemberRepo } from "../repositories/leagueMember.js";
import { generateBetOptionsForLeaguePublic } from "../utils/betOptionsGenerator.js";

const prisma = new PrismaClient();

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
  createLeague: async (name: string, leaderId: string, division: 'primera' | 'segunda' | 'premier' = 'primera', isPremium: boolean = false) => {
    // Generar código único, reintentar si hay colisión
    let code = generateUniqueCode();
    let attempts = 0;
    let createdLeague: any = null;

    while (attempts < 10) {
      try {
        createdLeague = await LeagueRepo.create(name, leaderId, code, division, isPremium);
        break; // creado con éxito
      } catch (error: any) {
        // Si es error de código duplicado, generar otro
        if (error?.code === 'P2002' && error?.meta?.target?.includes('code')) {
          code = generateUniqueCode();
          attempts++;
          console.log(`Code collision detected, regenerating... (attempt ${attempts}/10)`);
        } else {
          // Error diferente, lanzar con mejor mensaje
          console.error('Error creating league:', error);
          const errorMessage = error?.message || 'Error al crear la liga';
          throw new Error(errorMessage);
        }
      }
    }

    if (!createdLeague) {
      throw new Error('No se pudo generar un código único después de 10 intentos');
    }

    // Después de crear la liga, generar las opciones de apuesta para su jornada actual
    (async () => {
      try {
        const jornadaToGenerate = createdLeague.currentJornada || 1;
        console.log(`[LeagueService] Generating bet options for new league ${createdLeague.id} jornada ${jornadaToGenerate}`);
        const result = await generateBetOptionsForLeaguePublic(createdLeague.id, jornadaToGenerate);
        console.log(`[LeagueService] Bet options generated for league ${createdLeague.id}:`, result);
      } catch (err) {
        console.error(`[LeagueService] Error generating bet options for league ${createdLeague?.id}:`, err);
      }
    })();

    return createdLeague;
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

  leaveLeague: async (leagueId: string, userId: string) => {
    // Verificar que la liga existe
    const league = await LeagueRepo.getById(leagueId);
    if (!league) {
      throw new Error('Liga no encontrada');
    }

    // Verificar que el usuario es miembro de la liga
    const membership = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId,
          userId
        }
      }
    });

    if (!membership) {
      throw new Error('No eres miembro de esta liga');
    }

    // Obtener todos los miembros de la liga
    const allMembers = await prisma.leagueMember.findMany({
      where: { leagueId }
    });

    // Si es el único miembro, eliminar la liga completa
    if (allMembers.length === 1) {
      await prisma.league.delete({
        where: { id: leagueId }
      });
      return { success: true, message: 'Liga eliminada (eras el único miembro)' };
    }

    // Si es el líder, transferir el liderazgo a otro miembro aleatorio
    if (league.leaderId === userId) {
      const otherMembers = allMembers.filter(m => m.userId !== userId);
      if (otherMembers.length > 0) {
        // Seleccionar un miembro aleatorio para ser el nuevo líder
        const newLeader = otherMembers[Math.floor(Math.random() * otherMembers.length)];
        
        await prisma.league.update({
          where: { id: leagueId },
          data: { leaderId: newLeader.userId }
        });
        
        console.log(`[LeagueService] Liderazgo transferido de ${userId} a ${newLeader.userId}`);
      }
    }

    // Eliminar la plantilla del usuario en esta liga (si existe)
    await prisma.squad.deleteMany({
      where: {
        userId,
        leagueId
      }
    });

    // Eliminar la membresía del usuario
    await LeagueMemberRepo.remove(leagueId, userId);

    return { success: true, message: 'Has abandonado la liga exitosamente' };
  },

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
   * Obtiene TODAS las clasificaciones (Total + cada jornada) de una liga en una sola llamada
   * ✨ MODIFICADO: Calcula en tiempo real los puntos de la jornada actual si está cerrada
   */
  getAllClassifications: async (leagueId: string) => {
    const league = await LeagueRepo.getById(leagueId);
    if (!league) {
      throw new Error('Liga no encontrada');
    }

    const members = await LeagueMemberRepo.listByLeague(leagueId);
    
    // Obtener el estado actual de la jornada de la liga
    const currentJornada = league.currentJornada || 1;
    const jornadaStatus = league.jornadaStatus || 'open';
    
    console.log(`[getAllClassifications] Liga ${leagueId}: Jornada ${currentJornada}, Estado: ${jornadaStatus}`);
    
    // Preparar estructura: { Total: [...], 1: [...], 2: [...], ... }
    // Total inicialmente carga desde member.points, pero se recalculará si la jornada está cerrada
    const classifications: any = {
      Total: members.map(member => {
        const pointsPerJornada = ((member as any).pointsPerJornada as any) || {};
        // Calcular total sumando todas las jornadas
        let totalPoints = 0;
        for (let j = 1; j <= 38; j++) {
          totalPoints += pointsPerJornada[j.toString()] || 0;
        }
        
        return {
          userId: member.userId,
          userName: member.user?.name || 'Usuario',
          points: totalPoints, // Suma de todas las jornadas
          initialBudget: member.initialBudget || 500,
          budget: member.budget || 500
        };
      }).sort((a, b) => b.points - a.points)
    };

    // Inicializar todas las jornadas (1-38) con todos los miembros en 0
    for (let j = 1; j <= 38; j++) {
      classifications[j] = members.map(member => ({
        userId: member.userId,
        userName: member.user?.name || 'Usuario',
        points: 0, // Por defecto 0, se actualizará si tiene datos
        initialBudget: member.initialBudget || 500,
        budget: member.budget || 500
      }));
    }

    // Actualizar puntos de jornadas específicas si existen datos
    members.forEach(member => {
      const pointsPerJornada = ((member as any).pointsPerJornada as any) || {};
      
      // Si no tiene pointsPerJornada inicializado, inicializarlo ahora
      if (Object.keys(pointsPerJornada).length === 0) {
        // Inicializar en BD si no existe
        const initialData: any = {};
        for (let i = 1; i <= 38; i++) {
          initialData[i.toString()] = 0;
        }
        // Note: pointsPerJornada field needs to be added to the Prisma schema first
        console.warn('pointsPerJornada field not found in schema, skipping initialization');
      } else {
        // Actualizar clasificaciones con los puntos existentes
        Object.keys(pointsPerJornada).forEach(jornadaStr => {
          const jornada = parseInt(jornadaStr);
          if (jornada >= 1 && jornada <= 38) {
            const memberIndex = classifications[jornada].findIndex((m: any) => m.userId === member.userId);
            if (memberIndex >= 0) {
              classifications[jornada][memberIndex].points = pointsPerJornada[jornadaStr] || 0;
            }
          }
        });
      }
    });

    // ✨ NUEVO: Si la jornada está cerrada, calcular puntos en tiempo real para la jornada actual
    // Y actualizar Total = histórico + jornada actual
    if (jornadaStatus === 'closed' && currentJornada >= 1 && currentJornada <= 38) {
      console.log(`[getAllClassifications] 🔄 Calculando puntos en tiempo real para jornada ${currentJornada}`);
      
      // Calcular puntos en tiempo real para cada miembro
      const realTimePoints = await Promise.all(
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

            // ⚠️ Si no tiene plantilla, devolver 0 puntos
            if (!squad || squad.players.length === 0) {
              return { userId: member.userId, points: 0 };
            }

            // Obtener las estadísticas de todos los jugadores de la plantilla para esta jornada
            const playerIds = squad.players.map((p: any) => p.playerId);
            const playerStats = await prisma.playerStats.findMany({
              where: {
                playerId: { in: playerIds },
                jornada: currentJornada,
                season: 2025
              }
            });

            // Calcular puntos totales de la jornada
            let sumPoints = 0;
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
                sumPoints += points * 2;
              } else {
                sumPoints += points;
              }
            });

            // ⚠️ Si tiene menos de 11 jugadores o presupuesto negativo, el total es 0
            const totalPoints = (squad.players.length < 11 || member.budget < 0) ? 0 : sumPoints;

            return { userId: member.userId, points: totalPoints };
          } catch (error) {
            console.error(`Error calculando puntos en tiempo real para usuario ${member.userId}:`, error);
            return { userId: member.userId, points: 0 };
          }
        })
      );

      // Actualizar los puntos en tiempo real en la clasificación de la jornada actual
      realTimePoints.forEach(({ userId, points }) => {
        const memberIndex = classifications[currentJornada].findIndex((m: any) => m.userId === userId);
        if (memberIndex >= 0) {
          classifications[currentJornada][memberIndex].points = points;
          console.log(`[getAllClassifications] 🎯 Usuario ${userId}: ${points} pts jornada actual`);
        }
      });

      // ✨ ACTUALIZAR CLASIFICACIÓN TOTAL: suma de TODAS las jornadas (J11 + J12 en vivo)
      realTimePoints.forEach(({ userId, points: currentJornadaPoints }) => {
        const member = members.find(m => m.userId === userId);
        const pointsPerJornada = ((member as any).pointsPerJornada as any) || {};
        
        // Calcular total sumando TODAS las jornadas
        let totalPoints = 0;
        for (let j = 1; j <= 38; j++) {
          if (j === currentJornada) {
            // Jornada actual: usar puntos en tiempo real
            totalPoints += currentJornadaPoints;
          } else {
            // Otras jornadas: usar puntos guardados
            totalPoints += pointsPerJornada[j.toString()] || 0;
          }
        }

        const totalIndex = classifications.Total.findIndex((m: any) => m.userId === userId);
        if (totalIndex >= 0) {
          classifications.Total[totalIndex].points = totalPoints;
          console.log(`[getAllClassifications] 📊 Usuario ${userId}: Total=${totalPoints} (J11=${pointsPerJornada['11']||0} + J12 vivo=${currentJornadaPoints})`);
        }
      });
    }

    // Ordenar cada jornada por puntos
    for (let j = 1; j <= 38; j++) {
      classifications[j].sort((a: any, b: any) => b.points - a.points);
    }

    // Reordenar Total después de actualizar los puntos
    classifications.Total.sort((a: any, b: any) => b.points - a.points);

    return {
      leagueId: league.id,
      leagueName: league.name,
      leagueCode: league.code,
      classifications
    };
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
            let sumPoints = 0;
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
                sumPoints += points * 2;
              } else {
                sumPoints += points;
              }
            });

            // ⚠️ Si tiene menos de 11 jugadores o presupuesto negativo, el total es 0
            const totalPoints = (squad.players.length < 11 || member.budget < 0) ? 0 : sumPoints;

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

  /**
   * Calcula puntos en tiempo real para una liga consultando API-Football
   * Actualiza las estadísticas de TODOS los jugadores de TODAS las plantillas de la liga
   * Solo funciona si la jornada está cerrada (partidos en curso)
   */
  calculateRealTimePoints: async (leagueId: string) => {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { PlayerStatsService } = await import('./playerStats.service.js');
      
      const league = await LeagueRepo.getById(leagueId);
      if (!league) {
        throw new Error('Liga no encontrada');
      }

      const currentJornada = league.currentJornada || 1;
      const jornadaStatus = league.jornadaStatus || 'open';

      // Solo calcular si la jornada está cerrada (partidos en curso)
      if (jornadaStatus !== 'closed') {
        throw new Error('Solo se puede calcular en tiempo real cuando la jornada está cerrada (partidos en curso)');
      }

      console.log(`[calculateRealTimePoints] 🔄 Calculando puntos en tiempo real para liga ${leagueId}, jornada ${currentJornada}`);

      // Obtener todos los miembros de la liga
      const members = await LeagueMemberRepo.listByLeague(leagueId);

      // Recopilar todos los jugadores únicos de todas las plantillas
      const allPlayerIds = new Set<number>();
      const squadsByUser: Record<string, any> = {};

      await Promise.all(
        members.map(async (member) => {
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

          // ✨ Solo agregar plantillas que tengan exactamente 11 jugadores Y presupuesto no negativo
          if (squad && squad.players.length === 11) {
            // Verificar presupuesto del usuario
            if (member.budget >= 0) {
              squadsByUser[member.userId] = squad;
              squad.players.forEach((p: any) => allPlayerIds.add(p.playerId));
            } else {
              console.log(`[calculateRealTimePoints] ⚠️ Usuario ${member.userId} tiene PRESUPUESTO NEGATIVO (${member.budget}M), se le asignará 0 puntos`);
            }
          } else if (squad) {
            console.log(`[calculateRealTimePoints] ⚠️ Usuario ${member.userId} tiene ${squad.players.length} jugadores (necesita 11), se le asignará 0 puntos`);
          }
        })
      );

      console.log(`[calculateRealTimePoints] 📊 ${allPlayerIds.size} jugadores únicos encontrados`);

      // ✨ NUEVO: Verificar que todos los jugadores estén en la BD, si no, cargarlos desde la API
      const existingPlayers = await prisma.player.findMany({
        where: {
          id: { in: Array.from(allPlayerIds) }
        },
        select: { id: true }
      });

      const existingPlayerIds = new Set(existingPlayers.map(p => p.id));
      const missingPlayerIds = Array.from(allPlayerIds).filter(id => !existingPlayerIds.has(id));

      if (missingPlayerIds.length > 0) {
        console.log(`[calculateRealTimePoints] ⚠️ ${missingPlayerIds.length} jugadores faltantes en BD, cargando desde API...`);
        
        // Importar PlayerService para cargar jugadores
        const { PlayerService } = await import('./player.service.js');
        
        // Cargar jugadores faltantes desde la API
        for (const playerId of missingPlayerIds) {
          try {
            await PlayerService.getPlayerById(playerId);
            console.log(`[calculateRealTimePoints] ✅ Jugador ${playerId} cargado en BD`);
          } catch (error) {
            console.error(`[calculateRealTimePoints] ❌ Error cargando jugador ${playerId}:`, error);
          }
        }
      }

      // Calcular estadísticas de todos los jugadores para la jornada actual
      // Esto consultará la API-Football para datos actualizados en tiempo real
      await Promise.all(
        Array.from(allPlayerIds).map(async (playerId) => {
          try {
            await PlayerStatsService.getPlayerStatsForJornada(playerId, currentJornada, {
              season: 2025,
              forceRefresh: true // ✅ SÍ forzar - pero protegido contra sobrescritura con 0s
            });
            console.log(`[calculateRealTimePoints] ✅ Jugador ${playerId} actualizado`);
          } catch (error) {
            console.error(`[calculateRealTimePoints] ❌ Error actualizando jugador ${playerId}:`, error);
          }
        })
      );

    // Ahora calcular los puntos de cada usuario con sus plantillas
    const userPoints = await Promise.all(
      members.map(async (member) => {
        const squad = squadsByUser[member.userId];
        
        // ⚠️ Si no tiene plantilla, devolver 0 puntos y sin jugadores
        if (!squad) {
          return {
            userId: member.userId,
            userName: member.user?.name || 'Usuario',
            points: 0,
            players: []
          };
        }

        const playerIds = squad.players.map((p: any) => p.playerId);
        const playerStats = await prisma.playerStats.findMany({
          where: {
            playerId: { in: playerIds },
            jornada: currentJornada,
            season: 2025
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true
              }
            }
          }
        });

        let sumPoints = 0;
        const captainId = squad.players.find((p: any) => p.isCaptain)?.playerId || null;

        const playersWithPoints = playerStats.map((stats: any) => {
          const points = stats.totalPoints || 0;
          const isCaptain = stats.playerId === captainId;
          const finalPoints = isCaptain ? points * 2 : points;
          sumPoints += finalPoints;

          return {
            playerId: stats.playerId,
            playerName: stats.player.name,
            position: stats.player.position,
            points,
            isCaptain,
            finalPoints
          };
        });

        // ⚠️ Si tiene menos de 11 jugadores o presupuesto negativo, mostrar los jugadores con puntos pero el total es 0
        const totalPoints = (squad.players.length < 11 || member.budget < 0) ? 0 : sumPoints;

        return {
          userId: member.userId,
          userName: member.user?.name || 'Usuario',
          points: totalPoints,
          players: playersWithPoints
        };
      })
    );

    // Ordenar por puntos
    userPoints.sort((a, b) => b.points - a.points);

    console.log(`[calculateRealTimePoints] ✅ Cálculo completado`);

    return {
      leagueId: league.id,
      leagueName: league.name,
      jornada: currentJornada,
      status: jornadaStatus,
      standings: userPoints
    };
    } catch (error: any) {
      console.error('[calculateRealTimePoints] ❌ Error:', error);
      throw new Error(error?.message || 'Error al calcular puntos en tiempo real');
    }
  },

  /**
   * Actualizar una liga a premium
   */
  upgradeLeagueToPremium: async (leagueId: string, userId: string) => {
    try {
      // Verificar que la liga existe
      const league = await LeagueRepo.getById(leagueId);
      if (!league) {
        throw new Error('Liga no encontrada');
      }

      // Verificar que el usuario es el líder de la liga
      if (league.leaderId !== userId) {
        throw new Error('Solo el líder de la liga puede actualizarla a premium');
      }

      // Verificar que la liga no es ya premium
      if (league.isPremium) {
        throw new Error('Esta liga ya es premium');
      }

      // Actualizar la liga a premium
      const updatedLeague = await prisma.league.update({
        where: { id: leagueId },
        data: { isPremium: true }
      });

      console.log(`[LeagueService] Liga ${leagueId} actualizada a premium por usuario ${userId}`);

      return updatedLeague;
    } catch (error: any) {
      console.error('[upgradeLeagueToPremium] ❌ Error:', error);
      throw new Error(error?.message || 'Error al actualizar la liga a premium');
    }
  },

};
