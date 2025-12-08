import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { mapBetToApiConfig } from '../utils/apiBetMapping.js';

const prisma = new PrismaClient();

export class BetService {
  // Verifica si la liga permite cambios (jornada no bloqueada)
  private static async assertBettingAllowed(leagueId: string) {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { jornadaStatus: true, name: true }
    });

    if (!league) {
      throw new AppError(404, 'NOT_FOUND', 'Liga no encontrada');
    }

    if (league.jornadaStatus === 'closed') {
      throw new AppError(
        403,
        'JORNADA_BLOQUEADA',
        'La jornada está abierta (bloqueada). No se pueden crear, modificar ni eliminar apuestas en este momento.'
      );
    }
  }
  /**
   * Obtener tickets disponibles para un usuario en una liga
   * Sistema de tickets: 3 base + bonus por aciertos
   */
  static async getBettingBudget(userId: string, leagueId: string): Promise<{ available: number; total: number; used: number }> {
    const member = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: { leagueId, userId },
      },
    });

    if (!member) {
      throw new AppError(404, 'NOT_MEMBER', 'No eres miembro de esta liga');
    }

    // Contar tickets usados en esta jornada (apuestas simples + combinadas)
    const currentJornada = await this.getCurrentJornada(leagueId);
    
    // Contar apuestas simples sin combiId
    const simpleBetsCount = await prisma.bet.count({
      where: {
        leagueId,
        userId,
        jornada: currentJornada,
        status: 'pending',
        combiId: null,
      },
    });

    // Contar combinadas únicas
    const combisCount = await prisma.betCombi.count({
      where: {
        leagueId,
        userId,
        jornada: currentJornada,
        status: 'pending',
      },
    });

    const usedTickets = simpleBetsCount + combisCount;
    const available = member.availableTickets - usedTickets;

    return {
      total: member.availableTickets,
      used: usedTickets,
      available: Math.max(0, available),
    };
  }

  /**
   * Obtener todas las apuestas de una liga (todas las jornadas, con nombre de usuario)
   */
  static async getLeagueBets(leagueId: string, requesterUserId: string): Promise<Array<{
    id: string;
    leagueId: string;
    userId: string;
    userName: string;
    jornada: number;
    matchId: number;
    homeTeam: string;
    awayTeam: string;
    homeCrest?: string;
    awayCrest?: string;
    betType: string;
    betLabel: string;
    odd: number;
    amount: number;
    potentialWin: number;
    status: string;
    createdAt: Date;
    combiId?: string;
    combi?: {
      id: string;
      totalOdd: number;
      amount: number;
      potentialWin: number;
      status: string;
    };
  }>> {
    // Verificar que el solicitante sea miembro de la liga
    const member = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: requesterUserId } },
      select: { userId: true }
    });

    if (!member) {
      throw new AppError(403, 'FORBIDDEN', 'No eres miembro de esta liga');
    }

    // Obtener todas las apuestas de la liga (sin filtrar por jornada)
    const bets = await prisma.bet.findMany({
      where: {
        leagueId,
      },
      include: {
        leagueMember: {
          include: { user: true }
        },
        betCombi: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return bets.map(b => ({
      id: b.id,
      leagueId: b.leagueId,
      userId: b.userId,
      userName: b.leagueMember?.user?.name || 'Jugador',
      jornada: b.jornada,
      matchId: b.matchId,
      homeTeam: b.homeTeam || '',
      awayTeam: b.awayTeam || '',
      homeCrest: b.homeCrest || undefined,
      awayCrest: b.awayCrest || undefined,
      betType: b.betType,
      betLabel: b.betLabel,
      odd: b.odd,
      amount: b.amount,
      potentialWin: b.potentialWin,
      status: b.status,
      createdAt: b.createdAt,
      combiId: b.combiId || undefined,
      combi: b.betCombi ? {
        id: b.betCombi.id,
        totalOdd: b.betCombi.totalOdd,
        amount: b.betCombi.amount,
        potentialWin: b.betCombi.potentialWin,
        status: b.betCombi.status,
      } : undefined,
    }));
  }

  /**
   * Crear una nueva apuesta
   */
  static async placeBet(params: {
    userId: string;
    leagueId: string;
    matchId: number;
    homeTeam: string;
    awayTeam: string;
    homeCrest?: string;
    awayCrest?: string;
    betType: string;
    betLabel: string;
    odd: number;
    amount: number;
  }) {
    const { userId, leagueId, matchId, homeTeam, awayTeam, homeCrest, awayCrest, betType, betLabel, odd, amount } = params;

    // Bloquear si la jornada está abierta (bloqueada)
    await this.assertBettingAllowed(leagueId);

    // Validar que el usuario es miembro de la liga
    const member = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: { leagueId, userId },
      },
    });

    if (!member) {
      throw new AppError(404, 'NOT_MEMBER', 'No eres miembro de esta liga');
    }


    // Sistema de tickets: verificar que tenga tickets disponibles
    const budget = await this.getBettingBudget(userId, leagueId);
    if (budget.available < 1) {
      throw new AppError(
        400,
        'INSUFFICIENT_TICKETS',
        `No tienes tickets disponibles. Tickets disponibles: ${budget.available}`
      );
    }

    // Crear la apuesta
    const currentJornada = await this.getCurrentJornada(leagueId);

    // Regla: solo una apuesta por partido y jornada para cada usuario
    const existingForMatch = await prisma.bet.findFirst({
      where: {
        leagueId,
        userId,
        jornada: currentJornada,
        matchId,
        status: 'pending',
      },
      select: { id: true },
    });
    if (existingForMatch) {
      throw new AppError(
        400,
        'ONE_BET_PER_MATCH',
        'Solo puedes tener una apuesta por partido en esta jornada. Borra o edita tu apuesta existente.'
      );
    }

    const potentialWin = Math.round(amount * odd);

    // Mapear automáticamente la configuración de la API
    console.log('🔍 Datos recibidos para mapeo:', { betType, betLabel, homeTeam, awayTeam });
    const apiConfig = mapBetToApiConfig(betType, betLabel, homeTeam, awayTeam);
    console.log('🔍 Configuración API generada:', apiConfig);

    const betData = {
      leagueId,
      userId,
      jornada: currentJornada,
      matchId,
      homeTeam,
      awayTeam,
      homeCrest,
      awayCrest,
      betType,
      betLabel,
      apiBetId: apiConfig.apiBetId,
      apiEndpoint: apiConfig.apiEndpoint,
      apiStatKey: apiConfig.apiStatKey,
      apiOperator: apiConfig.apiOperator,
      apiValue: apiConfig.apiValue,
      odd,
      amount,
      potentialWin,
      status: 'pending' as const,
    };

    console.log('🔍 Datos que se van a guardar en BD:', betData);

    const bet = await prisma.bet.create({
      data: betData,
    });

    console.log(`✅ Apuesta creada con ID: ${bet.id}`, {
      homeTeam: bet.homeTeam,
      awayTeam: bet.awayTeam,
      apiBetId: bet.apiBetId,
      apiEndpoint: bet.apiEndpoint,
      apiConfig
    });

    return bet;
  }

  /**
   * Obtener apuestas de un usuario en una liga para la jornada actual
   */
  static async getUserBets(userId: string, leagueId: string) {
    const currentJornada = await this.getCurrentJornada(leagueId);
    
    const bets = await prisma.bet.findMany({
      where: {
        leagueId,
        userId,
        jornada: currentJornada,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bets;
  }

  /**
   * Eliminar una apuesta (solo si está pendiente)
   */
  static async deleteBet(betId: string, userId: string, leagueId: string) {
    // Bloquear si la jornada está abierta (bloqueada)
    await this.assertBettingAllowed(leagueId);

    const bet = await prisma.bet.findUnique({
      where: { id: betId },
    });

    if (!bet) {
      throw new AppError(404, 'BET_NOT_FOUND', 'Apuesta no encontrada');
    }

    if (bet.userId !== userId || bet.leagueId !== leagueId) {
      throw new AppError(403, 'FORBIDDEN', 'No tienes permiso para eliminar esta apuesta');
    }

    if (bet.status !== 'pending') {
      throw new AppError(400, 'BET_NOT_PENDING', 'Solo puedes eliminar apuestas pendientes');
    }

    await prisma.bet.delete({
      where: { id: betId },
    });

    return { success: true };
  }

  /**
   * Actualizar monto de una apuesta existente
   */
  static async updateBetAmount(betId: string, userId: string, leagueId: string, newAmount: number) {
    // Bloquear si la jornada está abierta (bloqueada)
    await this.assertBettingAllowed(leagueId);

    const bet = await prisma.bet.findUnique({
      where: { id: betId },
    });

    if (!bet) {
      throw new AppError(404, 'BET_NOT_FOUND', 'Apuesta no encontrada');
    }

    if (bet.userId !== userId || bet.leagueId !== leagueId) {
      throw new AppError(403, 'FORBIDDEN', 'No tienes permiso para modificar esta apuesta');
    }

    if (bet.status !== 'pending') {
      throw new AppError(400, 'BET_NOT_PENDING', 'Solo puedes modificar apuestas pendientes');
    }

    if (newAmount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'El monto debe ser mayor a 0');
    }
    if (newAmount > 50) {
      throw new AppError(400, 'AMOUNT_TOO_HIGH', 'El monto máximo por apuesta es 50M');
    }

    // Verificar presupuesto (excluyendo el monto actual de esta apuesta)
    const budget = await this.getBettingBudget(userId, leagueId);
    const availableWithThisBet = budget.available + bet.amount;
    
    if (newAmount > availableWithThisBet) {
      throw new AppError(
        400,
        'INSUFFICIENT_BUDGET',
        `Presupuesto insuficiente. Disponible: ${availableWithThisBet}M`
      );
    }

    const potentialWin = Math.round(newAmount * bet.odd);

    const updatedBet = await prisma.bet.update({
      where: { id: betId },
      data: {
        amount: newAmount,
        potentialWin,
      },
    });

    return updatedBet;
  }

  /**
   * Obtener jornada actual (simplificado - en producción vendría de la API)
   */
  private static async getCurrentJornada(leagueId?: string): Promise<number> {
    if (leagueId) {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { currentJornada: true }
      });
      if (league) {
        return league.currentJornada;
      }
    }

    // Si no hay leagueId, buscar la primera liga disponible
    const firstLeague = await prisma.league.findFirst({
      select: { currentJornada: true }
    });

    return firstLeague?.currentJornada || 10; // Fallback a jornada 10
  }

  /**
   * Resetear presupuesto de apuestas (se ejecuta al inicio de cada jornada)
   */
  static async resetBettingBudgets(leagueId?: string) {
    const where = leagueId ? { leagueId } : {};

    await prisma.leagueMember.updateMany({
      where,
      data: {
        bettingBudget: 250,
      },
    });

    return { success: true };
  }
}
