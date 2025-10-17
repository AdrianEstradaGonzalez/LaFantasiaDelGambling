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
     * Buscar la última jornada con partidos terminados (con estadísticas disponibles)
     */
    static async findLastCompletedJornada(targetJornada) {
        try {
            console.log(`🔍 Buscando última jornada con estadísticas disponibles (objetivo: ${targetJornada})...`);
            // Intentar desde la jornada objetivo hacia atrás hasta encontrar una con partidos terminados
            for (let j = targetJornada; j >= 1; j--) {
                try {
                    // Probar con temporada actual y, si no hay datos, con la anterior
                    const seasonsToTry = [this.SEASON, this.SEASON - 1];
                    let fixtures = [];
                    let usedSeason = null;
                    for (const season of seasonsToTry) {
                        const { data } = await axios.get(`${this.API_BASE}/fixtures`, {
                            headers: {
                                'x-rapidapi-key': this.API_KEY,
                                'x-rapidapi-host': 'v3.football.api-sports.io',
                            },
                            params: {
                                league: 140,
                                season,
                                round: `Regular Season - ${j}`,
                            },
                            timeout: 10000,
                        });
                        fixtures = data?.response || [];
                        if (fixtures.length > 0) {
                            usedSeason = season;
                            break;
                        }
                        await new Promise(r => setTimeout(r, 150));
                    }
                    if (usedSeason) {
                        console.log(`   🔁 Jornada ${j}: usando season ${usedSeason} (fixtures: ${fixtures.length})`);
                    }
                    if (fixtures.length > 0) {
                        // Verificar si al menos un partido está terminado
                        const hasFinishedMatches = fixtures.some((f) => ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short));
                        if (hasFinishedMatches) {
                            console.log(`✅ Jornada ${j} tiene partidos terminados. Usando esta jornada para calcular puntos.`);
                            return j;
                        }
                        else {
                            console.log(`⚠️ Jornada ${j} encontrada pero sin partidos terminados. Continuando búsqueda...`);
                        }
                    }
                    // Pausa para evitar rate limiting
                    await new Promise(r => setTimeout(r, 200));
                }
                catch (error) {
                    console.log(`⚠️ Error consultando jornada ${j}, continuando búsqueda...`);
                }
            }
            // Si no encuentra ninguna jornada con estadísticas, usar la objetivo
            console.log(`⚠️ No se encontraron jornadas con estadísticas. Usando jornada objetivo ${targetJornada}.`);
            return targetJornada;
        }
        catch (error) {
            console.error(`❌ Error buscando última jornada completada:`, error);
            return targetJornada; // Fallback a jornada objetivo
        }
    }
    /**
     * Calcular puntos de la plantilla de un usuario en una jornada
     * Busca automáticamente la última jornada con estadísticas disponibles
     */
    static async calculateSquadPoints(userId, leagueId, jornadaObjetivo) {
        try {
            // Buscar la última jornada con estadísticas disponibles
            const jornada = await this.findLastCompletedJornada(jornadaObjetivo);
            console.log(`    🔍 Calculando puntos para userId=${userId}, leagueId=${leagueId}, jornadaObjetivo=${jornadaObjetivo}, jornadaUsada=${jornada}`);
            // Obtener jornada actual de la liga para decidir uso de cache
            const league = await prisma.league.findUnique({ where: { id: leagueId } });
            const leagueJornada = league?.currentJornada ?? jornada;
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
                    console.log(`\n      🔍 ===== PROCESANDO JUGADOR =====`);
                    console.log(`         Nombre: ${squadPlayer.playerName}`);
                    console.log(`         ID: ${squadPlayer.playerId}`);
                    console.log(`         Rol: ${squadPlayer.role}`);
                    console.log(`         Posición: ${squadPlayer.position}`);
                    console.log(`         Jornada a buscar: ${jornada}`);
                    let playerPoints = 0;
                    // Preferir puntos cacheados si estamos calculando la jornada actual de la liga
                    const localPlayer = await prisma.player.findUnique({ where: { id: squadPlayer.playerId } });
                    if (localPlayer && leagueJornada === jornada) {
                        playerPoints = localPlayer.lastJornadaPoints ?? 0;
                        console.log(`         ♻️ Usando cache (liga.jornada=${leagueJornada}): ${playerPoints} puntos`);
                        totalPoints += playerPoints;
                        console.log(`         💰 Total acumulado: ${totalPoints}`);
                        console.log(`         ====================================\n`);
                        await new Promise((r) => setTimeout(r, 50));
                        continue;
                    }
                    // PASO 1: Obtener información del jugador para saber su equipo
                    // Preferimos nuestra BD local (más fiable y sin rate-limit)
                    let playerTeamId;
                    let playerTeamName;
                    try {
                        const localPlayer = await prisma.player.findUnique({ where: { id: squadPlayer.playerId } });
                        if (localPlayer?.teamId) {
                            playerTeamId = localPlayer.teamId;
                            playerTeamName = localPlayer.teamName || undefined;
                            console.log(`         🗂️ Equipo (BD local): ${playerTeamName ?? 'desconocido'} (ID: ${playerTeamId})`);
                        }
                    }
                    catch (e) {
                        console.log(`         ⚠️ No se pudo leer el equipo desde BD local`);
                    }
                    // Si no lo tenemos en BD, intentamos API (fallback)
                    if (!playerTeamId) {
                        try {
                            const playerInfoResponse = await axios.get(`${this.API_BASE}/players`, {
                                headers: {
                                    'x-rapidapi-key': this.API_KEY,
                                    'x-rapidapi-host': 'v3.football.api-sports.io',
                                },
                                params: {
                                    id: squadPlayer.playerId,
                                    season: this.SEASON,
                                    league: 140
                                },
                                timeout: 10000,
                            });
                            const playerInfo = playerInfoResponse.data?.response?.[0];
                            if (playerInfo?.statistics?.[0]?.team?.id) {
                                playerTeamId = playerInfo.statistics[0].team.id;
                                playerTeamName = playerInfo.statistics[0].team.name;
                                console.log(`         🌐 Equipo (API): ${playerTeamName} (ID: ${playerTeamId})`);
                            }
                        }
                        catch (e) {
                            console.log(`         ⚠️ Error consultando API de jugador: ${e?.message || e}`);
                        }
                    }
                    if (!playerTeamId) {
                        console.log(`         ❌ No se pudo determinar el equipo del jugador. Saltando.`);
                        continue;
                    }
                    console.log(`         🏟️ Equipo usado: ${playerTeamName ?? 'desconocido'} (ID: ${playerTeamId})`);
                    // PASO 2: Obtener partidos de la jornada
                    // Intentar fixtures con season actual y fallback a anterior
                    let fixtures = [];
                    let usedSeason = null;
                    for (const season of [this.SEASON, this.SEASON - 1]) {
                        const fixturesResponse = await axios.get(`${this.API_BASE}/fixtures`, {
                            headers: {
                                'x-rapidapi-key': this.API_KEY,
                                'x-rapidapi-host': 'v3.football.api-sports.io',
                            },
                            params: {
                                league: 140,
                                season,
                                round: `Regular Season - ${jornada}`,
                            },
                        });
                        fixtures = fixturesResponse.data?.response || [];
                        if (Array.isArray(fixtures) && fixtures.length > 0) {
                            usedSeason = season;
                            break;
                        }
                        await new Promise(r => setTimeout(r, 120));
                    }
                    if (!Array.isArray(fixtures) || fixtures.length === 0) {
                        console.log(`         ⚠️ No hay fixtures para la jornada ${jornada} (tried seasons: ${this.SEASON}, ${this.SEASON - 1})`);
                        continue;
                    }
                    console.log(`         📅 ${fixtures.length} partidos en jornada ${jornada} (season ${usedSeason ?? this.SEASON})`);
                    // PASO 3: Buscar el partido donde jugó su equipo
                    const teamFixture = fixtures.find((f) => f.teams?.home?.id === playerTeamId || f.teams?.away?.id === playerTeamId);
                    if (!teamFixture) {
                        console.log(`         ⚠️ ${playerTeamName ?? 'Equipo'} no tiene partido en jornada ${jornada}`);
                        continue;
                    }
                    const isHomeTeam = teamFixture.teams?.home?.id === playerTeamId;
                    console.log(`         🔎 Partido: ${teamFixture.teams?.home?.name} vs ${teamFixture.teams?.away?.name}`);
                    console.log(`         📊 Estado: ${teamFixture.fixture?.status?.short} | Fixture ID: ${teamFixture.fixture.id}`);
                    const statusShort = teamFixture.fixture?.status?.short;
                    // Opcional: solo contar si el partido al menos ha empezado
                    if (!statusShort || ['CANC', 'PST', 'TBD', 'NS'].includes(statusShort)) {
                        console.log(`         ⏭️ Partido no iniciado o inválido para puntos (status: ${statusShort})`);
                        continue;
                    }
                    // PASO 4: Obtener estadísticas del partido
                    const statsResponse = await axios.get(`${this.API_BASE}/fixtures/players`, {
                        headers: {
                            'x-rapidapi-key': this.API_KEY,
                            'x-rapidapi-host': 'v3.football.api-sports.io',
                        },
                        params: { fixture: teamFixture.fixture.id },
                    });
                    const teamsData = statsResponse.data?.response || [];
                    if (!Array.isArray(teamsData) || teamsData.length === 0) {
                        console.log(`         ⚠️ Sin estadísticas disponibles para este partido`);
                        continue;
                    }
                    // PASO 5: Buscar las estadísticas del jugador
                    let playerStats = null;
                    for (const teamData of teamsData) {
                        const teamName = teamData?.team?.name;
                        const playersArr = Array.isArray(teamData?.players) ? teamData.players : [];
                        const found = playersArr.find((p) => p?.player?.id === squadPlayer.playerId);
                        if (found?.statistics?.[0]) {
                            playerStats = found.statistics[0];
                            console.log(`         ✅ ¡Encontrado en ${teamName}!`);
                            console.log(`         ⏱️ Minutos: ${playerStats?.games?.minutes || 0}`);
                            break;
                        }
                    }
                    if (!playerStats) {
                        console.log(`         ⚠️ No participó en el partido (no convocado/lesionado/suplente sin jugar)`);
                        continue;
                    }
                    // PASO 6: Calcular puntos
                    playerPoints = this.calculatePlayerPoints(playerStats, squadPlayer.role);
                    console.log(`         ⚽ PUNTOS: ${playerPoints}`);
                    totalPoints += playerPoints;
                    console.log(`         💰 Total acumulado: ${totalPoints}`);
                    console.log(`         ====================================\n`);
                    // Pequeña pausa para evitar rate limit
                    await new Promise((r) => setTimeout(r, 150));
                }
                catch (error) {
                    console.error(`      ❌ Error con ${squadPlayer.playerName}:`, error.message);
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
        console.log(`\n🎯 ===== CALCULANDO PUNTOS DE JUGADOR =====`);
        console.log(`   Rol: ${role}`);
        console.log(`   Stats recibidas:`, JSON.stringify(stats, null, 2));
        if (!stats || !stats.games) {
            console.log(`   ⚠️ Sin stats o games, retornando 0`);
            return 0;
        }
        let points = 0;
        const minutes = stats.games?.minutes || 0;
        console.log(`   ⏱️ Minutos jugados: ${minutes}`);
        // BASE GENERAL (para todos)
        if (minutes > 0 && minutes < 45) {
            points += 1;
            console.log(`   ✅ +1 punto por jugar < 45 min`);
        }
        else if (minutes >= 45) {
            points += 2;
            console.log(`   ✅ +2 puntos por jugar >= 45 min`);
        }
        const goals = stats.goals || {};
        const cards = stats.cards || {};
        const penalty = stats.penalty || {};
        const passes = stats.passes || {};
        const shots = stats.shots || {};
        const dribbles = stats.dribbles || {};
        const tackles = stats.tackles || {};
        const duels = stats.duels || {};
        const fouls = stats.fouls || {};
        console.log(`\n   📊 Estadísticas base:`);
        console.log(`      - Goles: ${goals.total || 0}`);
        console.log(`      - Asistencias: ${goals.assists || 0}`);
        console.log(`      - Tarjetas amarillas: ${cards.yellow || 0}`);
        console.log(`      - Tarjetas rojas: ${cards.red || 0}`);
        const assistPoints = (goals.assists || 0) * 3;
        points += assistPoints;
        if (assistPoints > 0)
            console.log(`   ✅ +${assistPoints} puntos por asistencias`);
        const yellowCardPenalty = (cards.yellow || 0) * 1;
        points -= yellowCardPenalty;
        if (yellowCardPenalty > 0)
            console.log(`   ❌ -${yellowCardPenalty} puntos por tarjetas amarillas`);
        const redCardPenalty = (cards.red || 0) * 3;
        points -= redCardPenalty;
        if (redCardPenalty > 0)
            console.log(`   ❌ -${redCardPenalty} puntos por tarjetas rojas`);
        const penaltyWonPoints = (penalty.won || 0) * 2;
        points += penaltyWonPoints;
        if (penaltyWonPoints > 0)
            console.log(`   ✅ +${penaltyWonPoints} puntos por penaltis ganados`);
        const penaltyCommittedPenalty = (penalty.committed || 0) * 2;
        points -= penaltyCommittedPenalty;
        if (penaltyCommittedPenalty > 0)
            console.log(`   ❌ -${penaltyCommittedPenalty} puntos por penaltis cometidos`);
        const penaltyScoredPoints = (penalty.scored || 0) * 3;
        points += penaltyScoredPoints;
        if (penaltyScoredPoints > 0)
            console.log(`   ✅ +${penaltyScoredPoints} puntos por penaltis marcados`);
        const penaltyMissedPenalty = (penalty.missed || 0) * 2;
        points -= penaltyMissedPenalty;
        if (penaltyMissedPenalty > 0)
            console.log(`   ❌ -${penaltyMissedPenalty} puntos por penaltis fallados`);
        console.log(`\n   🎭 Calculando puntos específicos por posición: ${role}`);
        // ESPECÍFICO POR POSICIÓN
        if (role === 'GK' || role === 'POR') {
            console.log(`   🧤 PORTERO`);
            // Portero
            const conceded = stats.goals?.conceded || 0;
            console.log(`      - Goles encajados: ${conceded}`);
            console.log(`      - Paradas: ${stats.goals?.saves || 0}`);
            if (minutes >= 60 && conceded === 0) {
                points += 5;
                console.log(`      ✅ +5 puntos por portería a cero (>= 60 min)`);
            }
            const concededPenalty = conceded * 2;
            points -= concededPenalty;
            if (concededPenalty > 0)
                console.log(`      ❌ -${concededPenalty} puntos por goles encajados`);
            const savesPoints = (stats.goals?.saves || 0) * 1;
            points += savesPoints;
            if (savesPoints > 0)
                console.log(`      ✅ +${savesPoints} puntos por paradas`);
            const penaltySavedPoints = (penalty.saved || 0) * 5;
            points += penaltySavedPoints;
            if (penaltySavedPoints > 0)
                console.log(`      ✅ +${penaltySavedPoints} puntos por penaltis parados`);
            const goalPoints = (goals.total || 0) * 10;
            points += goalPoints;
            if (goalPoints > 0)
                console.log(`      ✅ +${goalPoints} puntos por goles marcados`);
            const interceptionPoints = Math.floor((tackles.interceptions || 0) / 5);
            points += interceptionPoints;
            if (interceptionPoints > 0)
                console.log(`      ✅ +${interceptionPoints} puntos por intercepciones`);
        }
        else if (role === 'DEF') {
            console.log(`   🛡️ DEFENSA`);
            // Defensa
            const conceded = stats.goals?.conceded || 0;
            console.log(`      - Goles encajados: ${conceded}`);
            console.log(`      - Duelos ganados: ${duels.won || 0}`);
            if (minutes >= 60 && conceded === 0) {
                points += 4;
                console.log(`      ✅ +4 puntos por portería a cero (>= 60 min)`);
            }
            const goalPoints = (goals.total || 0) * 6;
            points += goalPoints;
            if (goalPoints > 0)
                console.log(`      ✅ +${goalPoints} puntos por goles marcados`);
            const duelsPoints = Math.floor((duels.won || 0) / 2);
            points += duelsPoints;
            if (duelsPoints > 0)
                console.log(`      ✅ +${duelsPoints} puntos por duelos ganados`);
            const interceptionPoints = Math.floor((tackles.interceptions || 0) / 5);
            points += interceptionPoints;
            if (interceptionPoints > 0)
                console.log(`      ✅ +${interceptionPoints} puntos por intercepciones`);
            const concededPenalty = conceded * 1;
            points -= concededPenalty;
            if (concededPenalty > 0)
                console.log(`      ❌ -${concededPenalty} puntos por goles encajados`);
            const shotsPoints = (shots.on || 0) * 1;
            points += shotsPoints;
            if (shotsPoints > 0)
                console.log(`      ✅ +${shotsPoints} puntos por tiros a puerta`);
        }
        else if (role === 'MID' || role === 'CEN') {
            console.log(`   ⚙️ CENTROCAMPISTA`);
            // Centrocampista
            const conceded = stats.goals?.conceded || 0;
            console.log(`      - Goles encajados: ${conceded}`);
            console.log(`      - Pases clave: ${passes.key || 0}`);
            console.log(`      - Regates: ${dribbles.success || 0}`);
            if (minutes >= 60 && conceded === 0) {
                points += 1;
                console.log(`      ✅ +1 punto por portería a cero (>= 60 min)`);
            }
            const goalPoints = (goals.total || 0) * 5;
            points += goalPoints;
            if (goalPoints > 0)
                console.log(`      ✅ +${goalPoints} puntos por goles marcados`);
            const concededPenalty = Math.floor(conceded / 2);
            points -= concededPenalty;
            if (concededPenalty > 0)
                console.log(`      ❌ -${concededPenalty} puntos por goles encajados`);
            const passesPoints = (passes.key || 0) * 1;
            points += passesPoints;
            if (passesPoints > 0)
                console.log(`      ✅ +${passesPoints} puntos por pases clave`);
            const dribblesPoints = Math.floor((dribbles.success || 0) / 2);
            points += dribblesPoints;
            if (dribblesPoints > 0)
                console.log(`      ✅ +${dribblesPoints} puntos por regates`);
            const foulsPoints = Math.floor((fouls.drawn || 0) / 3);
            points += foulsPoints;
            if (foulsPoints > 0)
                console.log(`      ✅ +${foulsPoints} puntos por faltas recibidas`);
            const interceptionPoints = Math.floor((tackles.interceptions || 0) / 3);
            points += interceptionPoints;
            if (interceptionPoints > 0)
                console.log(`      ✅ +${interceptionPoints} puntos por intercepciones`);
            const shotsPoints = (shots.on || 0) * 1;
            points += shotsPoints;
            if (shotsPoints > 0)
                console.log(`      ✅ +${shotsPoints} puntos por tiros a puerta`);
        }
        else if (role === 'ATT' || role === 'DEL') {
            console.log(`   ⚽ DELANTERO`);
            // Delantero
            console.log(`      - Goles: ${goals.total || 0}`);
            console.log(`      - Pases clave: ${passes.key || 0}`);
            console.log(`      - Regates: ${dribbles.success || 0}`);
            const goalPoints = (goals.total || 0) * 4;
            points += goalPoints;
            if (goalPoints > 0)
                console.log(`      ✅ +${goalPoints} puntos por goles marcados`);
            const passesPoints = (passes.key || 0) * 1;
            points += passesPoints;
            if (passesPoints > 0)
                console.log(`      ✅ +${passesPoints} puntos por pases clave`);
            const foulsPoints = Math.floor((fouls.drawn || 0) / 3);
            points += foulsPoints;
            if (foulsPoints > 0)
                console.log(`      ✅ +${foulsPoints} puntos por faltas recibidas`);
            const dribblesPoints = Math.floor((dribbles.success || 0) / 2);
            points += dribblesPoints;
            if (dribblesPoints > 0)
                console.log(`      ✅ +${dribblesPoints} puntos por regates`);
            const shotsPoints = (shots.on || 0) * 1;
            points += shotsPoints;
            if (shotsPoints > 0)
                console.log(`      ✅ +${shotsPoints} puntos por tiros a puerta`);
        }
        console.log(`\n   🏆 TOTAL PUNTOS: ${points}`);
        console.log(`   ========================================\n`);
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
            console.log(`\n🔒 CERRANDO JORNADA ${jornada} para liga "${league.name}" (${leagueId})...\n`);
            // 1. Evaluar apuestas de la jornada actual
            console.log(`📊 1. Evaluando apuestas de jornada ${jornada}...`);
            const evaluations = await this.evaluateJornadaBets(jornada, leagueId);
            console.log(`✅ ${evaluations.length} apuestas evaluadas\n`);
            // 2. Calcular balances por usuario (apuestas)
            console.log(`💰 2. Calculando balances de apuestas...`);
            const balances = await this.calculateUserBalances(leagueId, evaluations);
            console.log(`✅ Balances calculados para ${balances.size} usuarios\n`);
            // 3. Calcular puntos de plantilla para cada usuario
            console.log(`⚽ 3. Calculando puntos de plantilla...`);
            const allMembers = await prisma.leagueMember.findMany({
                where: { leagueId },
                include: { user: true },
            });
            for (const member of allMembers) {
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
            }
            console.log(`✅ Puntos de plantilla calculados\n`);
            // 4. Actualizar presupuestos y puntos de los miembros
            console.log(`💵 4. Actualizando presupuestos...`);
            let updatedMembers = 0;
            for (const [userId, balance] of balances) {
                const member = await prisma.leagueMember.findUnique({
                    where: { leagueId_userId: { leagueId, userId } },
                    include: { user: true },
                });
                if (member) {
                    // Calcular nuevo presupuesto: 500 (base) + puntos plantilla + resultado apuestas
                    const budgetFromBets = balance.totalProfit;
                    const budgetFromSquad = balance.squadPoints; // 1M por punto
                    const newBudget = 500 + budgetFromSquad + budgetFromBets;
                    // Actualizar puntos totales
                    const newTotalPoints = member.points + balance.squadPoints;
                    await prisma.leagueMember.update({
                        where: { leagueId_userId: { leagueId, userId } },
                        data: {
                            budget: newBudget,
                            bettingBudget: 250, // Siempre resetear a 250
                            points: newTotalPoints,
                            // initialBudget NO se toca, siempre es 500
                        },
                    });
                    console.log(`  👤 Usuario ${member.user.name}:\n` +
                        `     Presupuesto anterior: ${member.budget}M\n` +
                        `     Base: 500M\n` +
                        `     Apuestas: ${balance.wonBets}W/${balance.lostBets}L = ${budgetFromBets >= 0 ? '+' : ''}${budgetFromBets}M\n` +
                        `     Plantilla: ${balance.squadPoints} puntos = +${budgetFromSquad}M\n` +
                        `     Nuevo presupuesto: ${newBudget}M\n` +
                        `     Puntos totales: ${member.points} → ${newTotalPoints}`);
                    updatedMembers++;
                }
            }
            console.log(`✅ ${updatedMembers} miembros actualizados\n`);
            // 5. Vaciar TODAS las plantillas de la liga
            console.log(`🗑️  5. Vaciando plantillas...`);
            const allSquads = await prisma.squad.findMany({
                where: { leagueId },
            });
            let clearedSquads = 0;
            for (const squad of allSquads) {
                const deletedPlayers = await prisma.squadPlayer.deleteMany({
                    where: { squadId: squad.id },
                });
                if (deletedPlayers.count > 0) {
                    clearedSquads++;
                }
            }
            console.log(`✅ ${clearedSquads} plantillas vaciadas\n`);
            // 6. Eliminar opciones de apuestas de la jornada actual
            console.log(`🗑️  6. Eliminando opciones de apuestas antiguas...`);
            const deletedBetOptions = await prisma.bet_option.deleteMany({
                where: {
                    leagueId,
                    jornada,
                },
            });
            console.log(`✅ ${deletedBetOptions.count} opciones de apuestas eliminadas\n`);
            // 7. Eliminar apuestas evaluadas
            console.log(`🗑️  7. Eliminando apuestas evaluadas...`);
            const deletedBets = await prisma.bet.deleteMany({
                where: {
                    leagueId,
                    jornada,
                    status: { in: ['won', 'lost'] },
                },
            });
            console.log(`✅ ${deletedBets.count} apuestas eliminadas\n`);
            // 8. Avanzar jornada y cambiar estado
            console.log(`⏭️  8. Avanzando jornada...`);
            const nextJornada = jornada + 1;
            await prisma.league.update({
                where: { id: leagueId },
                data: {
                    currentJornada: nextJornada,
                    jornadaStatus: 'open',
                },
            });
            console.log(`✅ Liga avanzada a jornada ${nextJornada} con estado "open"\n`);
            console.log(`\n🎉 JORNADA ${jornada} CERRADA EXITOSAMENTE\n`);
            console.log(`📊 Resumen:`);
            console.log(`   - ${evaluations.length} apuestas evaluadas`);
            console.log(`   - ${updatedMembers} miembros actualizados`);
            console.log(`   - ${clearedSquads} plantillas vaciadas`);
            console.log(`   - ${deletedBetOptions.count} opciones de apuestas eliminadas`);
            console.log(`   - Jornada actual: ${nextJornada}\n`);
            return {
                success: true,
                message: `Jornada ${jornada} cerrada exitosamente. Nueva jornada: ${nextJornada}`,
                leagueName: league.name,
                jornada: nextJornada,
                evaluations,
                updatedMembers,
                clearedSquads,
                deletedBetOptions: deletedBetOptions.count,
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
     * Cerrar jornada para TODAS las ligas (proceso completo)
     */
    static async closeAllJornadas() {
        try {
            console.log('\n🌍 CERRANDO JORNADA PARA TODAS LAS LIGAS...\n');
            const leagues = await prisma.league.findMany();
            const processedLeagues = [];
            let totalEvaluations = 0;
            let totalUpdatedMembers = 0;
            let totalClearedSquads = 0;
            for (const league of leagues) {
                console.log(`\n${'='.repeat(60)}`);
                console.log(`� Procesando liga: ${league.name}`);
                console.log(`${'='.repeat(60)}\n`);
                try {
                    const result = await this.closeJornada(league.id);
                    processedLeagues.push({
                        id: league.id,
                        name: league.name,
                        oldJornada: league.currentJornada,
                        newJornada: result.jornada,
                        evaluations: result.evaluations.length,
                        updatedMembers: result.updatedMembers,
                        clearedSquads: result.clearedSquads,
                    });
                    totalEvaluations += result.evaluations.length;
                    totalUpdatedMembers += result.updatedMembers;
                    totalClearedSquads += result.clearedSquads;
                    console.log(`✅ Liga "${league.name}" procesada exitosamente\n`);
                }
                catch (error) {
                    console.error(`❌ Error procesando liga "${league.name}":`, error);
                    // Continuar con la siguiente liga
                }
            }
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🎉 PROCESO COMPLETADO`);
            console.log(`${'='.repeat(60)}\n`);
            console.log(`📊 Resumen Global:`);
            console.log(`   - Ligas procesadas: ${processedLeagues.length}/${leagues.length}`);
            console.log(`   - Total apuestas evaluadas: ${totalEvaluations}`);
            console.log(`   - Total miembros actualizados: ${totalUpdatedMembers}`);
            console.log(`   - Total plantillas vaciadas: ${totalClearedSquads}\n`);
            return {
                success: true,
                message: `Jornada cerrada para ${processedLeagues.length} ligas`,
                leaguesProcessed: processedLeagues.length,
                totalEvaluations,
                totalUpdatedMembers,
                totalClearedSquads,
                leagues: processedLeagues,
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
JornadaService.SEASON = 2025; // Temporada actual de La Liga
