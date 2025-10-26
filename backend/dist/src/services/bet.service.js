import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { mapBetToApiConfig } from '../utils/apiBetMapping.js';
const prisma = new PrismaClient();
export class BetService {
    // Verifica si la liga permite cambios (jornada no bloqueada)
    static async assertBettingAllowed(leagueId) {
        const league = await prisma.league.findUnique({
            where: { id: leagueId },
            select: { jornadaStatus: true, name: true }
        });
        if (!league) {
            throw new AppError(404, 'NOT_FOUND', 'Liga no encontrada');
        }
        if (league.jornadaStatus === 'closed') {
            throw new AppError(403, 'JORNADA_BLOQUEADA', 'La jornada está abierta (bloqueada). No se pueden crear, modificar ni eliminar apuestas en este momento.');
        }
    }
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
            throw new AppError(404, 'NOT_MEMBER', 'No eres miembro de esta liga');
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
    static async getLeagueBets(leagueId, requesterUserId) {
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
    static async placeBet(params) {
        const { userId, leagueId, matchId, homeTeam, awayTeam, betType, betLabel, odd, amount } = params;
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
        // Validar monto
        if (amount <= 0) {
            throw new AppError(400, 'INVALID_AMOUNT', 'El monto debe ser mayor a 0');
        }
        if (amount > 50) {
            throw new AppError(400, 'AMOUNT_TOO_HIGH', 'El monto máximo por apuesta es 50M');
        }
        // Verificar presupuesto disponible
        const budget = await this.getBettingBudget(userId, leagueId);
        if (amount > budget.available) {
            throw new AppError(400, 'INSUFFICIENT_BUDGET', `Presupuesto insuficiente. Disponible: ${budget.available}M`);
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
            throw new AppError(400, 'ONE_BET_PER_MATCH', 'Solo puedes tener una apuesta por partido en esta jornada. Borra o edita tu apuesta existente.');
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
            status: 'pending',
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
    static async getUserBets(userId, leagueId) {
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
    static async deleteBet(betId, userId, leagueId) {
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
    static async updateBetAmount(betId, userId, leagueId, newAmount) {
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
            throw new AppError(400, 'INSUFFICIENT_BUDGET', `Presupuesto insuficiente. Disponible: ${availableWithThisBet}M`);
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
    static async getCurrentJornada(leagueId) {
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
