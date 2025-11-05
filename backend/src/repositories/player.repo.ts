import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PlayerData {
  id: number;
  name: string;
  position: string;
  teamId: number;
  teamName: string;
  teamCrest?: string;
  nationality?: string;
  shirtNumber?: number;
  photo?: string;
  price: number;
}

export class PlayerRepository {
  /**
   * Crear o actualizar un jugador
   * ⚠️ IMPORTANTE: NO sobrescribe el precio si el jugador ya existe
   */
  static async upsertPlayer(data: PlayerData) {
    return prisma.player.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        position: data.position,
        teamId: data.teamId,
        teamName: data.teamName,
        teamCrest: data.teamCrest,
        nationality: data.nationality,
        shirtNumber: data.shirtNumber,
        photo: data.photo,
        // ⚠️ NO actualizar el precio - mantener el valor existente en BD
        // price: data.price, <-- COMENTADO para preservar precios manuales
      },
      create: data,
    });
  }

  /**
   * Crear o actualizar múltiples jugadores
   * ⚠️ IMPORTANTE: NO sobrescribe el precio si el jugador ya existe
   */
  static async upsertMany(players: PlayerData[]) {
    const operations = players.map((player) =>
      prisma.player.upsert({
        where: { id: player.id },
        update: {
          name: player.name,
          position: player.position,
          teamId: player.teamId,
          teamName: player.teamName,
          teamCrest: player.teamCrest,
          nationality: player.nationality,
          shirtNumber: player.shirtNumber,
          photo: player.photo,
          // ⚠️ NO actualizar el precio - mantener el valor existente en BD
          // price: player.price, <-- COMENTADO para preservar precios manuales
        },
        create: player,
      })
    );

    return prisma.$transaction(operations);
  }

  /**
   * Obtener todos los jugadores
   */
  static async getAllPlayers() {
    return prisma.player.findMany({
      orderBy: [
        { teamName: 'asc' },
        { position: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Obtener todos los jugadores de Segunda División
   */
  static async getAllSegundaPlayers() {
    return (prisma as any).playerSegunda.findMany({
      select: {
        id: true,
        name: true,
        position: true,
        teamId: true,
        teamName: true,
        teamCrest: true,
        price: true,
        photo: true,
        nationality: true,
        shirtNumber: true,
        availabilityStatus: true,
        availabilityInfo: true,
        lastJornadaPoints: true,
        lastJornadaNumber: true,
      },
      orderBy: [
        { teamName: 'asc' },
        { position: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Obtener todos los jugadores de Premier League
   */
  static async getAllPremierPlayers() {
    return (prisma as any).playerPremier.findMany({
      select: {
        id: true,
        name: true,
        position: true,
        teamId: true,
        teamName: true,
        teamCrest: true,
        price: true,
        photo: true,
        nationality: true,
        shirtNumber: true,
        availabilityStatus: true,
        availabilityInfo: true,
        lastJornadaPoints: true,
        lastJornadaNumber: true,
      },
      orderBy: [
        { teamName: 'asc' },
        { position: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Obtener jugador por ID (busca en ambas divisiones)
   */
  static async getPlayerById(id: number) {
    // Intentar primero en Primera División
    const playerPrimera = await prisma.player.findUnique({
      where: { id },
    });
    
    if (playerPrimera) {
      return playerPrimera;
    }
    
    // Si no está, buscar en Segunda División
    const playerSegunda = await (prisma as any).playerSegunda.findUnique({
      where: { id },
    });
    
    return playerSegunda;
  }

  /**
   * Actualizar puntos de la última jornada en caché
   */
  static async updateLastJornadaPoints(id: number, points: number, jornada?: number) {
    try {
      return await prisma.player.update({
        where: { id },
        data: ({
          lastJornadaPoints: points,
          ...(Number.isInteger(jornada) ? { lastJornadaNumber: jornada } : {}),
        } as any),
      });
    } catch (e: any) {
      // Si no existe en la tabla principal (P2025), intentar en la tabla playerSegunda
      if (e?.code === 'P2025') {
        return (prisma as any).playerSegunda.update({
          where: { id },
          data: ({
            lastJornadaPoints: points,
            ...(Number.isInteger(jornada) ? { lastJornadaNumber: jornada } : {}),
          } as any),
        });
      }
      throw e;
    }
  }

  /**
   * Obtener jugadores por equipo
   */
  static async getPlayersByTeam(teamId: number) {
    return prisma.player.findMany({
      where: { teamId },
      orderBy: [
        { position: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Obtener jugadores por posición
   */
  static async getPlayersByPosition(position: string) {
    return prisma.player.findMany({
      where: { position },
      orderBy: [
        { teamName: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Obtener jugadores por rango de precio
   */
  static async getPlayersByPriceRange(minPrice: number, maxPrice: number) {
    return prisma.player.findMany({
      where: {
        price: {
          gte: minPrice,
          lte: maxPrice,
        },
      },
      orderBy: [
        { price: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Buscar jugadores por nombre
   */
  static async searchPlayers(query: string) {
    return prisma.player.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Obtener jugadores de Segunda División por equipo
   */
  static async getSegundaPlayersByTeam(teamId: number) {
    return (prisma as any).playerSegunda.findMany({
      where: { teamId },
      orderBy: [
        { position: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Obtener jugadores de Segunda División por posición
   */
  static async getSegundaPlayersByPosition(position: string) {
    return (prisma as any).playerSegunda.findMany({
      where: { position },
      orderBy: [
        { teamName: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Buscar jugadores de Segunda División por nombre
   */
  static async searchSegundaPlayers(query: string) {
    return (prisma as any).playerSegunda.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Obtener jugadores de Premier League por equipo
   */
  static async getPremierPlayersByTeam(teamId: number) {
    return (prisma as any).playerPremier.findMany({
      where: { teamId },
      orderBy: [
        { position: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Obtener jugadores de Premier League por posición
   */
  static async getPremierPlayersByPosition(position: string) {
    return (prisma as any).playerPremier.findMany({
      where: { position },
      orderBy: [
        { teamName: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Buscar jugadores de Premier League por nombre
   */
  static async searchPremierPlayers(query: string) {
    return (prisma as any).playerPremier.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Actualizar precio de un jugador
   */
  static async updatePlayerPrice(id: number, price: number) {
    try {
      return await prisma.player.update({
        where: { id },
        data: { price },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        // Fallback a tabla de Segunda División
        return (prisma as any).playerSegunda.update({
          where: { id },
          data: { price },
        });
      }
      throw e;
    }
  }

  /**
   * Actualizar posición de un jugador
   */
  static async updatePlayerPosition(id: number, position: string) {
    try {
      return await prisma.player.update({
        where: { id },
        data: { position },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return (prisma as any).playerSegunda.update({
          where: { id },
          data: { position },
        });
      }
      throw e;
    }
  }

  /**
   * Actualizar equipo de un jugador
   */
  static async updatePlayerTeam(id: number, teamId: number) {
    try {
      return await prisma.player.update({
        where: { id },
        data: { teamId },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return (prisma as any).playerSegunda.update({
          where: { id },
          data: { teamId },
        });
      }
      throw e;
    }
  }

  /**
   * Eliminar un jugador
   */
  static async deletePlayer(id: number) {
    return prisma.player.delete({
      where: { id },
    });
  }

  /**
   * Eliminar todos los jugadores
   */
  static async deleteAllPlayers() {
    return prisma.player.deleteMany({});
  }

  /**
   * Contar jugadores totales
   */
  static async countPlayers() {
    return prisma.player.count();
  }

  /**
   * Obtener estadísticas de precios
   */
  static async getPriceStats() {
    const stats = await prisma.player.aggregate({
      _avg: { price: true },
      _min: { price: true },
      _max: { price: true },
      _count: true,
    });

    return {
      average: stats._avg.price || 0,
      min: stats._min.price || 0,
      max: stats._max.price || 0,
      total: stats._count,
    };
  }
}
