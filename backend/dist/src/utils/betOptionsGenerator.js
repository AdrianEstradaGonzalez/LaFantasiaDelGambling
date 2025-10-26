/**
 * UTILIDAD PARA GENERAR OPCIONES DE APUESTA
 *
 * Esta función obtiene todas las apuestas disponibles de la API para una jornada
 * y genera opciones aleatorias para cada liga (1 apuesta por partido).
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const HEADERS = {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
};
const LA_LIGA_LEAGUE_ID = 140;
const SEASON = 2025;
async function fetchFixtures(jornada) {
    const url = `${API_BASE}/fixtures`;
    const params = {
        league: LA_LIGA_LEAGUE_ID,
        season: SEASON,
        round: `Regular Season - ${jornada}`
    };
    const response = await axios.get(url, { headers: HEADERS, params });
    if (response.data.results === 0) {
        return [];
    }
    return response.data.response;
}
async function fetchOddsForFixture(fixtureId, homeTeam, awayTeam) {
    try {
        const url = `${API_BASE}/odds`;
        const params = { fixture: fixtureId };
        const response = await axios.get(url, { headers: HEADERS, params });
        if (response.data.results === 0) {
            return createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam);
        }
        const oddsData = response.data.response[0];
        if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
            return createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam);
        }
        const bookmaker = oddsData.bookmakers[0];
        const validBets = [];
        bookmaker.bets.forEach((bet) => {
            if (bet.name.toLowerCase().includes('handicap')) {
                return;
            }
            const betNameLower = bet.name.toLowerCase();
            const isOverUnder = betNameLower.includes('over') || betNameLower.includes('under') ||
                betNameLower.includes('goals') || betNameLower.includes('corners') ||
                betNameLower.includes('cards');
            if (isOverUnder) {
                const allInRange = bet.values.every((value) => {
                    const odd = parseFloat(value.odd);
                    return odd >= 1.40 && odd <= 3.00;
                });
                if (allInRange && bet.values.length > 0) {
                    bet.values.forEach((value) => {
                        validBets.push({
                            tipo: bet.name,
                            opcion: value.value,
                            cuota: value.odd
                        });
                    });
                }
            }
            else {
                const validValues = bet.values.filter((value) => {
                    const odd = parseFloat(value.odd);
                    return odd >= 1.40 && odd <= 3.00;
                });
                const isMatchWinner = betNameLower.includes('match winner') ||
                    betNameLower.includes('winner') ||
                    bet.values.length === 3;
                if (isMatchWinner && validValues.length < 3) {
                    return;
                }
                const isBinary = bet.values.length === 2;
                if (isBinary && validValues.length < 2) {
                    return;
                }
                if (validValues.length > 0) {
                    validValues.forEach((value) => {
                        validBets.push({
                            tipo: bet.name,
                            opcion: value.value,
                            cuota: value.odd
                        });
                    });
                }
            }
        });
        addSyntheticBets(validBets);
        return {
            idPartido: fixtureId,
            equipoLocal: homeTeam,
            equipoVisitante: awayTeam,
            apuestas: validBets
        };
    }
    catch (error) {
        console.error(`Error obteniendo cuotas para partido ${fixtureId}:`, error.message);
        return createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam);
    }
}
function addSyntheticBets(validBets) {
    validBets.push({
        tipo: 'Corners Over/Under',
        opcion: 'Over 8.5',
        cuota: '2.10'
    }, {
        tipo: 'Corners Over/Under',
        opcion: 'Under 8.5',
        cuota: '1.90'
    }, {
        tipo: 'Cards Over/Under',
        opcion: 'Over 4.5',
        cuota: '2.10'
    }, {
        tipo: 'Cards Over/Under',
        opcion: 'Under 4.5',
        cuota: '1.90'
    });
}
function createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam) {
    const validBets = [];
    addSyntheticBets(validBets);
    return {
        idPartido: fixtureId,
        equipoLocal: homeTeam,
        equipoVisitante: awayTeam,
        apuestas: validBets
    };
}
function groupBetsByType(bets) {
    const grouped = new Map();
    for (const bet of bets) {
        if (!grouped.has(bet.tipo)) {
            grouped.set(bet.tipo, []);
        }
        grouped.get(bet.tipo).push(bet);
    }
    return grouped;
}
function selectRandomBetForMatch(matchBets) {
    const grouped = groupBetsByType(matchBets.apuestas);
    const betTypes = Array.from(grouped.keys());
    if (betTypes.length === 0) {
        return [];
    }
    const randomType = betTypes[Math.floor(Math.random() * betTypes.length)];
    return grouped.get(randomType);
}
async function generateBetOptionsForLeague(leagueId, jornada, allMatchBets) {
    const betOptionsToSave = [];
    for (const matchBets of allMatchBets) {
        const selectedBets = selectRandomBetForMatch(matchBets);
        for (const bet of selectedBets) {
            betOptionsToSave.push({
                matchId: matchBets.idPartido,
                homeTeam: matchBets.equipoLocal,
                awayTeam: matchBets.equipoVisitante,
                betType: bet.tipo,
                betLabel: bet.opcion,
                odd: parseFloat(bet.cuota)
            });
        }
    }
    if (betOptionsToSave.length > 0) {
        await saveBetOptions(leagueId, jornada, betOptionsToSave);
    }
    return betOptionsToSave.length;
}
async function saveBetOptions(leagueId, jornada, options) {
    await prisma.bet_option.deleteMany({
        where: { leagueId, jornada },
    });
    await prisma.bet_option.createMany({
        data: options.map(opt => ({
            id: `${leagueId}_${jornada}_${opt.matchId}_${opt.betType}_${opt.betLabel}`.replace(/\s+/g, '_'),
            leagueId,
            jornada,
            matchId: opt.matchId,
            homeTeam: opt.homeTeam,
            awayTeam: opt.awayTeam,
            betType: opt.betType,
            betLabel: opt.betLabel,
            odd: opt.odd,
        })),
    });
}
export async function generateBetOptionsForAllLeagues(jornada) {
    console.log(`\n🎲 Generando apuestas para jornada ${jornada}...\n`);
    try {
        // 1. Obtener fixtures
        const fixtures = await fetchFixtures(jornada);
        if (fixtures.length === 0) {
            console.log('⚠️  No hay fixtures disponibles');
            return {
                success: false,
                matchesProcessed: 0,
                leaguesUpdated: 0,
                totalOptions: 0,
            };
        }
        console.log(`✅ ${fixtures.length} partidos encontrados`);
        // 2. Obtener todas las apuestas posibles
        const allMatchBets = [];
        for (const fixture of fixtures) {
            const matchBets = await fetchOddsForFixture(fixture.fixture.id, fixture.teams.home.name, fixture.teams.away.name);
            if (matchBets) {
                allMatchBets.push(matchBets);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log(`✅ Apuestas obtenidas para ${allMatchBets.length} partidos\n`);
        // 3. Obtener todas las ligas
        const leagues = await prisma.league.findMany({
            select: { id: true, name: true },
        });
        console.log(`📋 ${leagues.length} ligas activas\n`);
        // 4. Generar apuestas para cada liga
        let totalOptions = 0;
        for (const league of leagues) {
            const optionsCount = await generateBetOptionsForLeague(league.id, jornada, allMatchBets);
            totalOptions += optionsCount;
            console.log(`   ✅ Liga "${league.name}": ${optionsCount} opciones`);
        }
        console.log(`\n✅ Total: ${totalOptions} opciones de apuesta generadas\n`);
        return {
            success: true,
            matchesProcessed: allMatchBets.length,
            leaguesUpdated: leagues.length,
            totalOptions,
        };
    }
    catch (error) {
        console.error('❌ Error generando apuestas:', error.message);
        throw error;
    }
}
