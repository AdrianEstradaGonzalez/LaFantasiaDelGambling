import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const BetCombiService = {
    /**
     * Crear una apuesta combinada
     * - Máximo 50M de apuesta
     * - Cuota total = producto de todas las cuotas
     * - Todas las selecciones deben acertar para ganar
     */
    createCombi: async (data) => {
        const { leagueId, userId, jornada, selections, amount } = data;
        // Validación: mínimo 2 selecciones
        if (selections.length < 2) {
            throw new Error('Una combi debe tener al menos 2 selecciones');
        }
        // Validación: máximo 50M
        if (amount > 50) {
            throw new Error('El monto máximo para una combi es 50M');
        }
        // Validación: mínimo 1M
        if (amount < 1) {
            throw new Error('El monto mínimo es 1M');
        }
        // Verificar presupuesto de apuestas
        const member = await prisma.leagueMember.findUnique({
            where: { leagueId_userId: { leagueId, userId } },
            select: { bettingBudget: true }
        });
        if (!member) {
            throw new Error('Usuario no encontrado en la liga');
        }
        if (member.bettingBudget < amount) {
            throw new Error(`Presupuesto insuficiente. Tienes ${member.bettingBudget}M disponibles`);
        }
        // Calcular cuota total (producto de todas las cuotas)
        const totalOdd = selections.reduce((acc, sel) => acc * sel.odd, 1);
        const potentialWin = Math.round(amount * totalOdd);
        // Crear la combinada y sus selecciones en una transacción
        const combi = await prisma.$transaction(async (tx) => {
            // Crear la combi principal
            const newCombi = await tx.betCombi.create({
                data: {
                    leagueId,
                    userId,
                    jornada,
                    totalOdd,
                    amount,
                    potentialWin,
                    status: 'pending'
                }
            });
            // Crear las apuestas individuales vinculadas a la combi
            await Promise.all(selections.map((sel) => tx.bet.create({
                data: {
                    leagueId,
                    userId,
                    jornada,
                    matchId: sel.matchId,
                    betType: sel.betType,
                    betLabel: sel.betLabel,
                    odd: sel.odd,
                    amount: 0, // Las individuales no consumen presupuesto, solo la combi
                    potentialWin: 0,
                    status: 'pending',
                    homeTeam: sel.homeTeam,
                    awayTeam: sel.awayTeam,
                    combiId: newCombi.id, // Vincular a la combi
                    apiBetId: sel.apiBetId,
                    apiEndpoint: sel.apiEndpoint,
                    apiOperator: sel.apiOperator,
                    apiStatKey: sel.apiStatKey,
                    apiValue: sel.apiValue
                }
            })));
            // Descontar presupuesto de apuestas
            await tx.leagueMember.update({
                where: { leagueId_userId: { leagueId, userId } },
                data: { bettingBudget: { decrement: amount } }
            });
            return newCombi;
        });
        console.log(`✅ Combi creada: ${selections.length} selecciones, cuota ${totalOdd.toFixed(2)}, apuesta ${amount}M, ganancia potencial ${potentialWin}M`);
        return combi;
    },
    /**
     * Obtener combinadas de un usuario en una liga
     */
    getUserCombis: async (leagueId, userId, jornada) => {
        const where = { leagueId, userId };
        if (jornada) {
            where.jornada = jornada;
        }
        const combis = await prisma.betCombi.findMany({
            where,
            include: {
                selections: {
                    select: {
                        id: true,
                        matchId: true,
                        betType: true,
                        betLabel: true,
                        odd: true,
                        status: true,
                        homeTeam: true,
                        awayTeam: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return combis;
    },
    /**
     * Evaluar una combinada después de evaluarse todas sus selecciones
     * - Si todas ganan -> combi gana
     * - Si alguna pierde -> combi pierde
     * - Si alguna está pending -> combi sigue pending
     */
    evaluateCombi: async (combiId) => {
        const combi = await prisma.betCombi.findUnique({
            where: { id: combiId },
            include: { selections: true }
        });
        if (!combi) {
            throw new Error('Combi no encontrada');
        }
        if (combi.status !== 'pending') {
            console.log(`⏭️ Combi ${combiId} ya evaluada con estado: ${combi.status}`);
            return combi;
        }
        // Verificar el estado de todas las selecciones
        const allWon = combi.selections.every((sel) => sel.status === 'won');
        const anyLost = combi.selections.some((sel) => sel.status === 'lost');
        const anyPending = combi.selections.some((sel) => sel.status === 'pending');
        let newStatus = combi.status;
        let budgetChange = 0;
        if (anyPending) {
            // Aún hay selecciones pendientes, no se puede evaluar
            console.log(`⏳ Combi ${combiId} tiene selecciones pendientes`);
            return combi;
        }
        if (allWon) {
            // Todas ganaron -> combi gana
            newStatus = 'won';
            budgetChange = combi.potentialWin;
            console.log(`🎉 Combi ${combiId} GANÓ: ${combi.potentialWin}M`);
        }
        else if (anyLost) {
            // Alguna perdió -> combi pierde
            newStatus = 'lost';
            console.log(`❌ Combi ${combiId} PERDIÓ`);
        }
        // Actualizar combi y presupuesto si ganó
        const updatedCombi = await prisma.$transaction(async (tx) => {
            const updated = await tx.betCombi.update({
                where: { id: combiId },
                data: {
                    status: newStatus,
                    evaluatedAt: new Date()
                },
                include: { selections: true }
            });
            if (newStatus === 'won') {
                await tx.leagueMember.update({
                    where: {
                        leagueId_userId: {
                            leagueId: combi.leagueId,
                            userId: combi.userId
                        }
                    },
                    data: { bettingBudget: { increment: budgetChange } }
                });
            }
            return updated;
        });
        return updatedCombi;
    },
    /**
     * Evaluar todas las combis pendientes de una jornada
     */
    evaluateJornadaCombis: async (leagueId, jornada) => {
        const pendingCombis = await prisma.betCombi.findMany({
            where: {
                leagueId,
                jornada,
                status: 'pending'
            }
        });
        console.log(`🔍 Evaluando ${pendingCombis.length} combis pendientes de jornada ${jornada}`);
        const results = await Promise.all(pendingCombis.map((combi) => BetCombiService.evaluateCombi(combi.id)));
        const won = results.filter((c) => c.status === 'won').length;
        const lost = results.filter((c) => c.status === 'lost').length;
        const pending = results.filter((c) => c.status === 'pending').length;
        console.log(`📊 Resultados: ${won} ganadas, ${lost} perdidas, ${pending} pendientes`);
        return { won, lost, pending, total: results.length };
    }
};
