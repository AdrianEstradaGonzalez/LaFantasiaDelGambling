import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';

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
   * Obtener presupuesto de apuestas disponible para un usuario en una liga
   */
  static async getBettingBudget(userId: string, leagueId: string): Promise<{ available: number; total: number; used: number }> {
    const member = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: { leagueId, userId },
      },
    });

    if (!member) {
      throw new Error('No eres miembro de esta liga');
    }

    // Obtener apuestas pendientes de esta jornada
    const currentJornada = await this.getCurrentJornada(leagueId);
    const pendingBets = await prisma.bet.findMany({
      where: {
        leagueId,
        userId,
        jornada: currentJornada,
        status: 'pending',
      },
    });

    const usedAmount = pendingBets.reduce((sum, bet) => sum + bet.amount, 0);
    const available = member.bettingBudget - usedAmount;

    return {
      total: member.bettingBudget,
      used: usedAmount,
      available: Math.max(0, available),
    };
  }

  /**
   * Obtener todas las apuestas de una liga para la jornada actual (con nombre de usuario)
   */
  static async getLeagueBets(leagueId: string, requesterUserId: string): Promise<Array<{
    id: string;
    leagueId: string;
    userId: string;
    userName: string;
    jornada: number;
    matchId: number;
    betType: string;
    betLabel: string;
    odd: number;
    amount: number;
    potentialWin: number;
    status: string;
    createdAt: Date;
  }>> {
    // Verificar que el solicitante sea miembro de la liga
    const member = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: requesterUserId } },
      select: { userId: true }
    });

    if (!member) {
      throw new AppError(403, 'FORBIDDEN', 'No eres miembro de esta liga');
    }

    // Obtener jornada actual de la liga
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { currentJornada: true }
    });

    if (!league) {
      throw new AppError(404, 'NOT_FOUND', 'Liga no encontrada');
    }

    const bets = await prisma.bet.findMany({
      where: {
        leagueId,
        jornada: league.currentJornada,
      },
      include: {
        leagueMember: {
          include: { user: true }
        }
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
      betType: b.betType,
      betLabel: b.betLabel,
      odd: b.odd,
      amount: b.amount,
      potentialWin: b.potentialWin,
      status: b.status,
      createdAt: b.createdAt,
    }));
  }

  /**
   * Crear una nueva apuesta
   */
  static async placeBet(params: {
    userId: string;
    leagueId: string;
    matchId: number;
    betType: string;
    betLabel: string;
    odd: number;
    amount: number;
  }) {
    const { userId, leagueId, matchId, betType, betLabel, odd, amount } = params;

    // Bloquear si la jornada está abierta (bloqueada)
    await this.assertBettingAllowed(leagueId);

    // Validar que el usuario es miembro de la liga
    const member = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: { leagueId, userId },
      },
    });

    if (!member) {
      throw new Error('No eres miembro de esta liga');
    }

    // Validar monto
    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    // Verificar presupuesto disponible
    const budget = await this.getBettingBudget(userId, leagueId);
    if (amount > budget.available) {
      throw new Error(`Presupuesto insuficiente. Disponible: ${budget.available}M`);
    }

    // Crear la apuesta
    const currentJornada = await this.getCurrentJornada(leagueId);
    const potentialWin = Math.round(amount * odd);

    const bet = await prisma.bet.create({
      data: {
        leagueId,
        userId,
        jornada: currentJornada,
        matchId,
        betType,
        betLabel,
        odd,
        amount,
        potentialWin,
        status: 'pending',
      },
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
      throw new Error('Apuesta no encontrada');
    }

    if (bet.userId !== userId || bet.leagueId !== leagueId) {
      throw new Error('No tienes permiso para eliminar esta apuesta');
    }

    if (bet.status !== 'pending') {
      throw new Error('Solo puedes eliminar apuestas pendientes');
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
      throw new Error('Apuesta no encontrada');
    }

    if (bet.userId !== userId || bet.leagueId !== leagueId) {
      throw new Error('No tienes permiso para modificar esta apuesta');
    }

    if (bet.status !== 'pending') {
      throw new Error('Solo puedes modificar apuestas pendientes');
    }

    if (newAmount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    // Verificar presupuesto (excluyendo el monto actual de esta apuesta)
    const budget = await this.getBettingBudget(userId, leagueId);
    const availableWithThisBet = budget.available + bet.amount;
    
    if (newAmount > availableWithThisBet) {
      throw new Error(`Presupuesto insuficiente. Disponible: ${availableWithThisBet}M`);
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
