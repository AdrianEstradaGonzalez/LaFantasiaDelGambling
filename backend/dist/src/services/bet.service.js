import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class BetService {
    /**
     * Obtener presupuesto de apuestas disponible para un usuario en una liga
     */
    static async getBettingBudget(userId, leagueId) {
        const member = await prisma.leagueMember.findUnique({
            where: {
                leagueId_userId: { leagueId, userId },
            },
        });
        if (!member) {
            throw new Error('No eres miembro de esta liga');
        }
        // Obtener apuestas pendientes de esta jornada
        const currentJornada = await this.getCurrentJornada();
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
     * Crear una nueva apuesta
     */
    static async placeBet(params) {
        const { userId, leagueId, matchId, betType, betLabel, odd, amount } = params;
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
        const currentJornada = await this.getCurrentJornada();
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
    static async getUserBets(userId, leagueId) {
        const currentJornada = await this.getCurrentJornada();
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
    static async deleteBet(betId, userId, leagueId) {
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
    static async updateBetAmount(betId, userId, leagueId, newAmount) {
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
    static async getCurrentJornada() {
        // TODO: Obtener de la API de LaLiga o configuración
        return 10; // Por ahora retorna jornada 10
    }
    /**
     * Resetear presupuesto de apuestas (se ejecuta al inicio de cada jornada)
     */
    static async resetBettingBudgets(leagueId) {
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
