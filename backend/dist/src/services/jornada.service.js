import { PrismaClient } from '@prisma/client';
import axios from 'axios';
const prisma = new PrismaClient();
export class JornadaService {
    /**
     * Evaluar una apuesta individual
     */
    static async evaluateBet(bet) {
        try {
            // Obtener estadísticas del partido
            const { data } = await axios.get(`${this.API_BASE}/fixtures`, {
                headers: {
                    'x-rapidapi-key': this.API_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io',
                },
                params: { id: bet.matchId },
            });
            const fixture = data?.response?.[0];
            if (!fixture)
                return false;
            // Verificar que el partido haya terminado
            const status = fixture.fixture?.status?.short;
            if (!['FT', 'AET', 'PEN'].includes(status)) {
                console.log(`Partido ${bet.matchId} no ha terminado aún (status: ${status})`);
                return false;
            }
            // Obtener estadísticas detalladas
            const statsResponse = await axios.get(`${this.API_BASE}/fixtures/statistics`, {
                headers: {
                    'x-rapidapi-key': this.API_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io',
                },
                params: { fixture: bet.matchId },
            });
            const stats = statsResponse.data?.response || [];
            const homeStats = stats[0]?.statistics || [];
            const awayStats = stats[1]?.statistics || [];
            // Helper para obtener valores
            const getValue = (teamStats, type) => {
                const stat = teamStats.find((s) => s.type === type);
                return stat ? parseInt(stat.value) || 0 : 0;
            };
            const goalsHome = fixture.goals?.home || 0;
            const goalsAway = fixture.goals?.away || 0;
            const totalGoals = goalsHome + goalsAway;
            const cornersHome = getValue(homeStats, 'Corner Kicks');
            const cornersAway = getValue(awayStats, 'Corner Kicks');
            const totalCorners = cornersHome + cornersAway;
            const yellowHome = getValue(homeStats, 'Yellow Cards');
            const yellowAway = getValue(awayStats, 'Yellow Cards');
            const redHome = getValue(homeStats, 'Red Cards');
            const redAway = getValue(awayStats, 'Red Cards');
            const totalCards = yellowHome + yellowAway + redHome + redAway;
            const labelLower = bet.betLabel.toLowerCase();
            const type = bet.betType;
            // Evaluar según el tipo de apuesta
            if (type === 'Goles totales') {
                const match = bet.betLabel.match(/(\d+\.?\d*)/);
                if (match) {
                    const threshold = parseFloat(match[1]);
                    if (labelLower.includes('más de'))
                        return totalGoals > threshold;
                    if (labelLower.includes('menos de'))
                        return totalGoals < threshold;
                }
            }
            if (type === 'Goles exactos') {
                const match = bet.betLabel.match(/(\d+)/);
                if (match)
                    return totalGoals === parseInt(match[1]);
            }
            if (type === 'Córners') {
                const match = bet.betLabel.match(/(\d+\.?\d*)/);
                if (match) {
                    const threshold = parseFloat(match[1]);
                    if (labelLower.includes('más de'))
                        return totalCorners > threshold;
                    if (labelLower.includes('menos de'))
                        return totalCorners < threshold;
                }
            }
            if (type === 'Córners exactos') {
                const match = bet.betLabel.match(/(\d+)/);
                if (match)
                    return totalCorners === parseInt(match[1]);
            }
            if (type === 'Córners par/impar') {
                if (labelLower.includes('impar'))
                    return totalCorners % 2 === 1;
                if (labelLower.includes('par'))
                    return totalCorners % 2 === 0;
            }
            if (type === 'Tarjetas') {
                const match = bet.betLabel.match(/(\d+\.?\d*)/);
                if (match) {
                    const threshold = parseFloat(match[1]);
                    if (labelLower.includes('más de'))
                        return totalCards > threshold;
                    if (labelLower.includes('menos de'))
                        return totalCards < threshold;
                }
            }
            if (type === 'Tarjetas exactas') {
                const match = bet.betLabel.match(/(\d+)/);
                if (match)
                    return totalCards === parseInt(match[1]);
            }
            if (type === 'Tarjetas par/impar') {
                if (labelLower.includes('impar'))
                    return totalCards % 2 === 1;
                if (labelLower.includes('par'))
                    return totalCards % 2 === 0;
            }
            if (type === 'Resultado') {
                const homeTeam = fixture.teams?.home?.name?.toLowerCase();
                const awayTeam = fixture.teams?.away?.name?.toLowerCase();
                if (labelLower.includes('ganará') && labelLower.includes(homeTeam)) {
                    return goalsHome > goalsAway;
                }
                if (labelLower.includes('ganará') && labelLower.includes(awayTeam)) {
                    return goalsAway > goalsHome;
                }
                if (labelLower.includes('empate')) {
                    return goalsHome === goalsAway;
                }
            }
            if (type === 'Ambos marcan') {
                if (labelLower.includes('marcan') || labelLower.includes('marcarán')) {
                    return goalsHome > 0 && goalsAway > 0;
                }
                if (labelLower.includes('no marcará') || labelLower.includes('al menos un equipo no')) {
                    return goalsHome === 0 || goalsAway === 0;
                }
            }
            if (type === 'Par/Impar') {
                if (labelLower.includes('impar'))
                    return totalGoals % 2 === 1;
                if (labelLower.includes('par'))
                    return totalGoals % 2 === 0;
            }
            if (type === 'Doble oportunidad') {
                const homeWin = goalsHome > goalsAway;
                const draw = goalsHome === goalsAway;
                const awayWin = goalsAway > goalsHome;
                const homeTeam = fixture.teams?.home?.name?.toLowerCase();
                const awayTeam = fixture.teams?.away?.name?.toLowerCase();
                if (labelLower.includes('empate') && labelLower.includes(homeTeam)) {
                    return homeWin || draw;
                }
                if (labelLower.includes('empate') && labelLower.includes(awayTeam)) {
                    return awayWin || draw;
                }
                if (labelLower.includes(homeTeam) && labelLower.includes(awayTeam)) {
                    return homeWin || awayWin;
                }
            }
            return false;
        }
        catch (error) {
            console.error(`Error evaluando apuesta ${bet.id}:`, error);
            return false;
        }
    }
    /**
     * Evaluar todas las apuestas pendientes de una jornada
     */
    static async evaluateJornadaBets(jornada, leagueId) {
        try {
            // Obtener todas las apuestas pendientes de la jornada
            const where = {
                status: 'pending',
                // Aquí asumimos que las apuestas tienen relación con partidos de la jornada
                // Si no tienes un campo jornada en Bet, necesitarás ajustar esto
            };
            if (leagueId) {
                where.leagueId = leagueId;
            }
            const bets = await prisma.bet.findMany({ where });
            console.log(`📊 Evaluando ${bets.length} apuestas de la jornada ${jornada}...`);
            const evaluations = [];
            for (const bet of bets) {
                try {
                    const won = await this.evaluateBet(bet);
                    // Calcular ganancia
                    const profit = won ? (bet.amount * bet.odd) - bet.amount : -bet.amount;
                    evaluations.push({
                        betId: bet.id,
                        won,
                        profit,
                    });
                    // Actualizar estado de la apuesta
                    await prisma.bet.update({
                        where: { id: bet.id },
                        data: { status: won ? 'won' : 'lost' },
                    });
                    console.log(`  ${won ? '✅' : '❌'} Apuesta ${bet.id}: ${bet.betType} - ${bet.betLabel} ` +
                        `(${bet.amount}M × ${bet.odd}) = ${won ? '+' : ''}${profit}M`);
                    // Pequeña pausa para rate limit de la API
                    await new Promise((r) => setTimeout(r, 100));
                }
                catch (error) {
                    console.error(`Error procesando apuesta ${bet.id}:`, error);
                }
            }
            return evaluations;
        }
        catch (error) {
            console.error('Error evaluando apuestas de jornada:', error);
            throw error;
        }
    }
    /**
     * Calcular balance de cada usuario en una liga
     */
    static async calculateUserBalances(leagueId, evaluations) {
        const balances = new Map();
        // Obtener todas las apuestas evaluadas con información de usuario
        const bets = await prisma.bet.findMany({
            where: {
                id: { in: evaluations.map((e) => e.betId) },
                leagueId,
            },
            include: {
                leagueMember: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        // Calcular balance por usuario
        for (const bet of bets) {
            const evaluation = evaluations.find((e) => e.betId === bet.id);
            if (!evaluation)
                continue;
            if (!balances.has(bet.userId)) {
                balances.set(bet.userId, {
                    userId: bet.userId,
                    totalProfit: 0,
                    wonBets: 0,
                    lostBets: 0,
                    squadPoints: 0,
                });
            }
            const userBalance = balances.get(bet.userId);
            userBalance.totalProfit += evaluation.profit;
            if (evaluation.won) {
                userBalance.wonBets++;
            }
            else {
                userBalance.lostBets++;
            }
        }
        return balances;
    }
    /**
     * Calcular puntos de la plantilla de un usuario en una jornada
     */
    static async calculateSquadPoints(userId, leagueId, jornada) {
        try {
            console.log(`    🔍 Buscando plantilla para userId=${userId}, leagueId=${leagueId}, jornada=${jornada}`);
            // Obtener la plantilla del usuario
            const squad = await prisma.squad.findUnique({
                where: {
                    userId_leagueId: { userId, leagueId },
                },
                include: {
                    players: true,
                },
            });
            if (!squad || !squad.players || squad.players.length === 0) {
                console.log(`    ⚠️  Sin plantilla o plantilla vacía`);
                return 0;
            }
            console.log(`    📋 Plantilla encontrada con ${squad.players.length} jugadores`);
            // 🔴 REGLA: Si no tiene 11 jugadores, 0 puntos
            if (squad.players.length < 11) {
                console.log(`    ❌ REGLA DE 11 JUGADORES: Solo ${squad.players.length}/11 jugadores - 0 puntos`);
                return 0;
            }
            console.log(`    ✅ Plantilla válida (${squad.players.length} jugadores). Calculando puntos...`);
            let totalPoints = 0;
            // Obtener estadísticas de cada jugador para la jornada
            for (const squadPlayer of squad.players) {
                try {
                    console.log(`      🔍 Buscando estadísticas de ${squadPlayer.playerName} (ID: ${squadPlayer.playerId}) para jornada ${jornada}`);
                    // Obtener partidos de la jornada donde jugó este jugador
                    const { data } = await axios.get(`${this.API_BASE}/fixtures`, {
                        headers: {
                            'x-rapidapi-key': this.API_KEY,
                            'x-rapidapi-host': 'v3.football.api-sports.io',
                        },
                        params: {
                            league: 140, // La Liga
                            season: 2024,
                            round: `Regular Season - ${jornada}`,
                        },
                    });
                    const fixtures = data?.response || [];
                    console.log(`      📅 Encontrados ${fixtures.length} partidos en jornada ${jornada}`);
                    let playerPoints = 0;
                    // Buscar el partido del equipo del jugador
                    for (const fixture of fixtures) {
                        // Obtener estadísticas del jugador en este partido
                        const statsResponse = await axios.get(`${this.API_BASE}/fixtures/players`, {
                            headers: {
                                'x-rapidapi-key': this.API_KEY,
                                'x-rapidapi-host': 'v3.football.api-sports.io',
                            },
                            params: { fixture: fixture.fixture.id },
                        });
                        const teamsData = statsResponse.data?.response || [];
                        let playerStats = null;
                        // Buscar las estadísticas del jugador
                        for (const teamData of teamsData) {
                            const players = teamData.players || [];
                            const found = players.find((p) => p.player?.id === squadPlayer.playerId);
                            if (found) {
                                playerStats = found.statistics?.[0];
                                break;
                            }
                        }
                        if (playerStats) {
                            // Calcular puntos según el rol del jugador
                            playerPoints += this.calculatePlayerPoints(playerStats, squadPlayer.role);
                            console.log(`      ⚽ ${squadPlayer.playerName}: ${playerPoints} puntos`);
                            break; // Solo contar el primer partido encontrado
                        }
                    }
                    if (playerPoints === 0) {
                        console.log(`      ⚠️  ${squadPlayer.playerName}: No se encontraron estadísticas o 0 puntos`);
                    }
                    totalPoints += playerPoints;
                    // Pequeña pausa para rate limit
                    await new Promise((r) => setTimeout(r, 100));
                }
                catch (error) {
                    console.error(`      ❌ Error obteniendo estadísticas del jugador ${squadPlayer.playerName}:`, error);
                }
            }
            console.log(`    📊 TOTAL PUNTOS PLANTILLA: ${totalPoints}`);
            return totalPoints;
        }
        catch (error) {
            console.error('❌ Error calculando puntos de plantilla:', error);
            return 0;
        }
    }
    /**
     * Calcular puntos de un jugador según DreamLeague
     */
    static calculatePlayerPoints(stats, role) {
        if (!stats || !stats.games)
            return 0;
        let points = 0;
        const minutes = stats.games?.minutes || 0;
        // BASE GENERAL (para todos)
        if (minutes > 0 && minutes < 45)
            points += 1;
        else if (minutes >= 45)
            points += 2;
        const goals = stats.goals || {};
        const cards = stats.cards || {};
        const penalty = stats.penalty || {};
        const passes = stats.passes || {};
        const shots = stats.shots || {};
        const dribbles = stats.dribbles || {};
        const tackles = stats.tackles || {};
        const duels = stats.duels || {};
        const fouls = stats.fouls || {};
        points += (goals.assists || 0) * 3;
        points -= (cards.yellow || 0) * 1;
        points -= (cards.red || 0) * 3;
        points += (penalty.won || 0) * 2;
        points -= (penalty.committed || 0) * 2;
        points += (penalty.scored || 0) * 3;
        points -= (penalty.missed || 0) * 2;
        // ESPECÍFICO POR POSICIÓN
        if (role === 'GK') {
            // Portero
            const conceded = stats.goals?.conceded || 0;
            if (minutes >= 60 && conceded === 0)
                points += 5;
            points -= conceded * 2;
            points += (stats.goals?.saves || 0) * 1;
            points += (penalty.saved || 0) * 5;
            points += (goals.total || 0) * 10;
            points += Math.floor((tackles.interceptions || 0) / 5);
        }
        else if (role === 'DEF') {
            // Defensa
            const conceded = stats.goals?.conceded || 0;
            if (minutes >= 60 && conceded === 0)
                points += 4;
            points += (goals.total || 0) * 6;
            points += Math.floor((duels.won || 0) / 2);
            points += Math.floor((tackles.interceptions || 0) / 5);
            points -= conceded * 1;
            points += (shots.on || 0) * 1;
        }
        else if (role === 'MID') {
            // Centrocampista
            const conceded = stats.goals?.conceded || 0;
            if (minutes >= 60 && conceded === 0)
                points += 1;
            points += (goals.total || 0) * 5;
            points -= Math.floor(conceded / 2);
            points += (passes.key || 0) * 1;
            points += Math.floor((dribbles.success || 0) / 2);
            points += Math.floor((fouls.drawn || 0) / 3);
            points += Math.floor((tackles.interceptions || 0) / 3);
            points += (shots.on || 0) * 1;
        }
        else if (role === 'ATT') {
            // Delantero
            points += (goals.total || 0) * 4;
            points += (passes.key || 0) * 1;
            points += Math.floor((fouls.drawn || 0) / 3);
            points += Math.floor((dribbles.success || 0) / 2);
            points += (shots.on || 0) * 1;
        }
        return points;
    }
    /**
     * Resetear presupuestos para nueva jornada
     */
    static async resetJornada(leagueId, jornada) {
        try {
            console.log(`\n🔄 Iniciando cambio de jornada ${jornada} para liga ${leagueId}...\n`);
            // 1. Evaluar apuestas de la jornada anterior
            const evaluations = await this.evaluateJornadaBets(jornada, leagueId);
            console.log(`\n✅ ${evaluations.length} apuestas evaluadas\n`);
            // 2. Calcular balances por usuario
            const balances = await this.calculateUserBalances(leagueId, evaluations);
            console.log(`💰 Balances de apuestas calculados para ${balances.size} usuarios\n`);
            // 3. Calcular puntos de plantilla para cada usuario
            const allMembers = await prisma.leagueMember.findMany({
                where: { leagueId },
                include: {
                    user: true,
                },
            });
            console.log(`\n⚽ Calculando puntos de plantilla para ${allMembers.length} miembros...\n`);
            for (const member of allMembers) {
                console.log(`\n📊 Procesando usuario: ${member.user.name} (${member.userId})`);
                const squadPoints = await this.calculateSquadPoints(member.userId, leagueId, jornada);
                // Actualizar o crear balance del usuario
                if (!balances.has(member.userId)) {
                    balances.set(member.userId, {
                        userId: member.userId,
                        totalProfit: 0,
                        wonBets: 0,
                        lostBets: 0,
                        squadPoints: 0,
                    });
                }
                const userBalance = balances.get(member.userId);
                userBalance.squadPoints = squadPoints;
                console.log(`  ✅ ${member.user.name}: ${squadPoints} puntos de plantilla`);
            }
            console.log(`\n✅ Puntos de plantilla calculados\n`);
            // 4. Actualizar presupuestos de los miembros y vaciar plantillas
            let updatedMembers = 0;
            for (const [userId, balance] of balances) {
                const member = await prisma.leagueMember.findUnique({
                    where: {
                        leagueId_userId: { leagueId, userId },
                    },
                });
                if (member) {
                    // Calcular nuevo presupuesto: budget actual + profit apuestas + 1M por cada punto de plantilla
                    const budgetFromBets = balance.totalProfit;
                    const budgetFromSquad = balance.squadPoints; // 1M por punto
                    const newBudget = member.budget + budgetFromBets + budgetFromSquad;
                    // Actualizar también los puntos totales del miembro en la liga
                    const newTotalPoints = member.points + balance.squadPoints;
                    await prisma.leagueMember.update({
                        where: {
                            leagueId_userId: { leagueId, userId },
                        },
                        data: {
                            budget: newBudget,
                            initialBudget: newBudget,
                            bettingBudget: 250, // Resetear presupuesto de apuestas
                            points: newTotalPoints, // Actualizar puntos totales
                        },
                    });
                    console.log(`  👤 Usuario ${userId}:\n` +
                        `     Budget anterior: ${member.budget}M\n` +
                        `     Apuestas: ${balance.wonBets}W/${balance.lostBets}L = ${budgetFromBets >= 0 ? '+' : ''}${budgetFromBets}M\n` +
                        `     Plantilla: ${balance.squadPoints} puntos = +${budgetFromSquad}M\n` +
                        `     Nuevo presupuesto: ${newBudget}M\n` +
                        `     Puntos totales: ${member.points} + ${balance.squadPoints} = ${newTotalPoints}`);
                    updatedMembers++;
                }
            }
            console.log(`\n✨ Cambio de jornada completado: ${updatedMembers} miembros actualizados\n`);
            // 5. Vaciar TODAS las plantillas de la liga (incluso usuarios sin balance)
            console.log(`🗑️  Vaciando todas las plantillas de la liga ${leagueId}...\n`);
            const allSquads = await prisma.squad.findMany({
                where: { leagueId },
            });
            let clearedSquads = 0;
            for (const squad of allSquads) {
                const deletedPlayers = await prisma.squadPlayer.deleteMany({
                    where: { squadId: squad.id },
                });
                if (deletedPlayers.count > 0) {
                    console.log(`  🗑️  Usuario ${squad.userId}: ${deletedPlayers.count} jugadores eliminados de plantilla`);
                    clearedSquads++;
                }
            }
            console.log(`\n✅ ${clearedSquads} plantillas vaciadas en total\n`);
            // 6. Eliminar apuestas evaluadas (ya pagadas)
            const deletedBets = await prisma.bet.deleteMany({
                where: {
                    leagueId,
                    jornada,
                    status: { in: ['won', 'lost'] },
                },
            });
            console.log(`🗑️  ${deletedBets.count} apuestas evaluadas eliminadas\n`);
            return {
                success: true,
                evaluations,
                balances,
                updatedMembers,
                clearedSquads,
                deletedBets: deletedBets.count,
            };
        }
        catch (error) {
            console.error('❌ Error en cambio de jornada:', error);
            throw error;
        }
    }
    /**
     * Resetear todas las ligas para una nueva jornada
     */
    static async resetAllLeagues(jornada) {
        try {
            console.log(`\n🌍 Iniciando cambio de jornada ${jornada} para TODAS las ligas...\n`);
            const leagues = await prisma.league.findMany();
            let totalEvaluations = 0;
            for (const league of leagues) {
                console.log(`\n📋 Procesando liga: ${league.name} (${league.id})`);
                const result = await this.resetJornada(league.id, jornada);
                totalEvaluations += result.evaluations.length;
            }
            console.log(`\n✨ Cambio de jornada completado para ${leagues.length} ligas\n`);
            return {
                success: true,
                leaguesProcessed: leagues.length,
                totalEvaluations,
            };
        }
        catch (error) {
            console.error('❌ Error en cambio de jornada global:', error);
            throw error;
        }
    }
    /**
     * Abrir jornada (era "Cerrar") - Bloquea apuestas y modificaciones de plantilla
     * Usa la jornada actual de la liga
     */
    static async openJornada(leagueId) {
        try {
            // Obtener liga con su jornada actual
            const league = await prisma.league.findUnique({
                where: { id: leagueId }
            });
            if (!league) {
                throw new Error('Liga no encontrada');
            }
            const jornada = league.currentJornada;
            console.log(`🔒 Abriendo jornada ${jornada} para liga ${leagueId}...`);
            // Actualizar estado de la jornada a "closed" (bloqueado)
            await prisma.league.update({
                where: { id: leagueId },
                data: {
                    jornadaStatus: 'closed'
                }
            });
            console.log(`✅ Jornada ${jornada} abierta (bloqueada) para liga "${league.name}"`);
            return {
                success: true,
                message: `Jornada ${jornada} abierta (bloqueada) exitosamente`,
                leagueName: league.name,
                jornada
            };
        }
        catch (error) {
            console.error('❌ Error abriendo jornada:', error);
            throw error;
        }
    }
    /**
     * Cerrar jornada (era "Abrir") - Permite apuestas y modificaciones de plantilla
     * Usa la jornada actual de la liga
     */
    static async closeJornada(leagueId) {
        try {
            // Obtener liga con su jornada actual
            const league = await prisma.league.findUnique({
                where: { id: leagueId }
            });
            if (!league) {
                throw new Error('Liga no encontrada');
            }
            const jornada = league.currentJornada;
            console.log(`✅ Cerrando jornada ${jornada} para liga ${leagueId}...`);
            // Actualizar estado de la jornada a "open" (abierto)
            await prisma.league.update({
                where: { id: leagueId },
                data: {
                    jornadaStatus: 'open'
                }
            });
            console.log(`✅ Jornada ${jornada} cerrada (abierta) para liga "${league.name}"`);
            return {
                success: true,
                message: `Jornada ${jornada} cerrada (abierta) exitosamente`,
                leagueName: league.name,
                jornada
            };
        }
        catch (error) {
            console.error('❌ Error cerrando jornada:', error);
            throw error;
        }
    }
    /**
     * Obtener estado de la jornada actual
     */
    static async getJornadaStatus(leagueId) {
        try {
            const league = await prisma.league.findUnique({
                where: { id: leagueId },
                select: {
                    name: true,
                    currentJornada: true,
                    jornadaStatus: true
                }
            });
            if (!league) {
                throw new Error('Liga no encontrada');
            }
            return {
                currentJornada: league.currentJornada,
                status: league.jornadaStatus,
                leagueName: league.name
            };
        }
        catch (error) {
            console.error('❌ Error obteniendo estado de jornada:', error);
            throw error;
        }
    }
    /**
     * Abrir jornada para TODAS las ligas (bloquea cambios)
     */
    static async openAllJornadas() {
        try {
            console.log('🌍 Abriendo jornada para TODAS las ligas...');
            const leagues = await prisma.league.findMany();
            const processedLeagues = [];
            for (const league of leagues) {
                const jornada = league.currentJornada;
                console.log(`  🔓 Abriendo jornada ${jornada} para liga "${league.name}"...`);
                // Actualizar estado de la jornada a "closed" (cerrado/bloqueado)
                await prisma.league.update({
                    where: { id: league.id },
                    data: {
                        jornadaStatus: 'closed'
                    }
                });
                processedLeagues.push({
                    id: league.id,
                    name: league.name,
                    jornada
                });
                console.log(`  ✅ Jornada ${jornada} abierta (bloqueada) para liga "${league.name}"`);
            }
            console.log(`\n✨ ${leagues.length} ligas actualizadas exitosamente\n`);
            return {
                success: true,
                message: `Jornada abierta (bloqueada) para ${leagues.length} ligas`,
                leaguesProcessed: leagues.length,
                leagues: processedLeagues
            };
        }
        catch (error) {
            console.error('❌ Error abriendo jornadas:', error);
            throw error;
        }
    }
    /**
     * Cerrar jornada para TODAS las ligas (permite cambios)
     */
    static async closeAllJornadas() {
        try {
            console.log('🌍 Cerrando jornada para TODAS las ligas...');
            const leagues = await prisma.league.findMany();
            const processedLeagues = [];
            for (const league of leagues) {
                const jornada = league.currentJornada;
                console.log(`  🔒 Cerrando jornada ${jornada} para liga "${league.name}"...`);
                // Actualizar estado de la jornada a "open" (abierto/desbloqueado)
                await prisma.league.update({
                    where: { id: league.id },
                    data: {
                        jornadaStatus: 'open'
                    }
                });
                processedLeagues.push({
                    id: league.id,
                    name: league.name,
                    jornada
                });
                console.log(`  ✅ Jornada ${jornada} cerrada (abierta) para liga "${league.name}"`);
            }
            console.log(`\n✨ ${leagues.length} ligas actualizadas exitosamente\n`);
            return {
                success: true,
                message: `Jornada cerrada (abierta) para ${leagues.length} ligas`,
                leaguesProcessed: leagues.length,
                leagues: processedLeagues
            };
        }
        catch (error) {
            console.error('❌ Error cerrando jornadas:', error);
            throw error;
        }
    }
}
JornadaService.API_BASE = 'https://v3.football.api-sports.io';
JornadaService.API_KEY = process.env.FOOTBALL_API_KEY || '099ef4c6c0803639d80207d4ac1ad5da';
