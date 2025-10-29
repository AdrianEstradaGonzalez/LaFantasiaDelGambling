/**
 * SCRIPT PARA GENERAR OPCIONES DE APUESTA PARA TODAS LAS LIGAS
 *
 * Este script obtiene todas las apuestas disponibles de la API para la próxima jornada
 * y genera opciones aleatorias para cada liga (1 apuesta por partido).
 *
 * Uso: npx tsx scripts/generate-bet-options.ts <jornada> [season]
 * Ejemplo: npx tsx scripts/generate-bet-options.ts 12 2025
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Configuración de la API
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const HEADERS = {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
};
const LA_LIGA_LEAGUE_ID = 140;
async function fetchFixtures(jornada, season) {
    console.log(`📅 Obteniendo fixtures de la jornada ${jornada}...`);
    try {
        const url = `${API_BASE}/fixtures`;
        const params = {
            league: LA_LIGA_LEAGUE_ID,
            season: season,
            round: `Regular Season - ${jornada}`
        };
        const response = await axios.get(url, { headers: HEADERS, params });
        if (response.data.results === 0) {
            console.log('⚠️  No se encontraron fixtures para esta jornada');
            return [];
        }
        const fixtures = response.data.response;
        console.log(`✅ Se encontraron ${fixtures.length} partidos\n`);
        return fixtures;
    }
    catch (error) {
        console.error('❌ Error al obtener fixtures:', error.message);
        return [];
    }
}
async function fetchOddsForFixture(fixtureId, homeTeam, awayTeam) {
    console.log(`🎲 Obteniendo cuotas para: ${homeTeam} vs ${awayTeam}`);
    try {
        const url = `${API_BASE}/odds`;
        const params = {
            fixture: fixtureId
        };
        const response = await axios.get(url, { headers: HEADERS, params });
        if (response.data.results === 0) {
            console.log('   ⚠️  No hay cuotas disponibles, usando solo sintéticas');
            return createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam);
        }
        const oddsData = response.data.response[0];
        if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
            console.log('   ⚠️  No hay bookmakers, usando solo sintéticas');
            return createSyntheticOnlyBets(fixtureId, homeTeam, awayTeam);
        }
        const bookmaker = oddsData.bookmakers[0];
        const validBets = [];
        // Procesar apuestas de la API
        bookmaker.bets.forEach((bet) => {
            // Filtrar handicap
            if (bet.name.toLowerCase().includes('handicap')) {
                return;
            }
            const betNameLower = bet.name.toLowerCase();
            const isOverUnder = betNameLower.includes('over') || betNameLower.includes('under') ||
                betNameLower.includes('goals') || betNameLower.includes('corners') ||
                betNameLower.includes('cards');
            if (isOverUnder) {
                // Para apuestas Over/Under, TODAS las opciones deben estar en rango
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
                // Para otras apuestas, verificar completitud
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
        // Añadir apuestas sintéticas
        addSyntheticBets(validBets);
        console.log(`   ✅ ${validBets.length} opciones válidas`);
        return {
            idPartido: fixtureId,
            equipoLocal: homeTeam,
            equipoVisitante: awayTeam,
            apuestas: validBets
        };
    }
    catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
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
function selectRandomBetForMatch(matchBets, usedBetTypes) {
    const grouped = groupBetsByType(matchBets.apuestas);
    // Convertir a array de tipos de apuesta
    let betTypes = Array.from(grouped.keys());
    if (betTypes.length === 0) {
        return [];
    }
    // Filtrar tipos que ya se han usado 2 o más veces
    const availableTypes = betTypes.filter(type => {
        const count = usedBetTypes.get(type) || 0;
        return count < 2;
    });
    // Si todos los tipos ya se usaron 2 veces, usar cualquiera
    const typesToChooseFrom = availableTypes.length > 0 ? availableTypes : betTypes;
    // Elegir un tipo de apuesta al azar
    const randomType = typesToChooseFrom[Math.floor(Math.random() * typesToChooseFrom.length)];
    // Incrementar contador de uso
    usedBetTypes.set(randomType, (usedBetTypes.get(randomType) || 0) + 1);
    // Retornar todas las opciones de ese tipo (para Over/Under, 1X2, etc)
    return grouped.get(randomType);
}
async function generateBetOptionsForLeague(leagueId, jornada, allMatchBets) {
    console.log(`\n🎰 Generando apuestas aleatorias para liga ${leagueId}...`);
    const betOptionsToSave = [];
    const usedBetTypes = new Map(); // Contador de tipos usados
    for (const matchBets of allMatchBets) {
        const selectedBets = selectRandomBetForMatch(matchBets, usedBetTypes);
        if (selectedBets.length > 0) {
            const betType = selectedBets[0].tipo;
            const useCount = usedBetTypes.get(betType) || 0;
            console.log(`   Partido ${matchBets.idPartido}: ${betType} (${selectedBets.length} opciones) [Uso: ${useCount}/2]`);
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
    }
    // Mostrar resumen de uso de tipos
    console.log('\n📊 Resumen de tipos de apuesta usados:');
    for (const [type, count] of usedBetTypes.entries()) {
        console.log(`   ${type}: ${count} veces`);
    }
    // Guardar en base de datos usando el servicio existente
    if (betOptionsToSave.length > 0) {
        await saveBetOptions(leagueId, jornada, betOptionsToSave);
        console.log(`\n   ✅ ${betOptionsToSave.length} opciones guardadas en BD`);
    }
}
async function saveBetOptions(leagueId, jornada, options) {
    // Eliminar opciones existentes para esta liga/jornada
    await prisma.bet_option.deleteMany({
        where: {
            leagueId,
            jornada,
        },
    });
    // Crear nuevas opciones
    await prisma.bet_option.createMany({
        data: options.map(opt => ({
            // El campo `id` es requerido por el schema Prisma (no tiene default), lo generamos aquí
            id: `${leagueId}_${jornada}_${opt.matchId}_${opt.betType}_${opt.betLabel}`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, ''),
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
async function main() {
    const jornada = parseInt(process.argv[2]);
    const season = parseInt(process.argv[3]) || 2025;
    if (!jornada || isNaN(jornada)) {
        console.error('❌ Debes especificar el número de jornada');
        console.log('Uso: npx tsx scripts/generate-bet-options.ts <jornada> [season]');
        console.log('Ejemplo: npx tsx scripts/generate-bet-options.ts 12 2025');
        process.exit(1);
    }
    if (!API_KEY) {
        console.error('❌ No se encontró FOOTBALL_API_KEY en las variables de entorno');
        process.exit(1);
    }
    console.log('\n' + '='.repeat(70));
    console.log(`🏆 GENERANDO APUESTAS PARA LA JORNADA ${jornada} - TEMPORADA ${season}`);
    console.log('='.repeat(70) + '\n');
    try {
        // 1. Obtener fixtures de la jornada
        const fixtures = await fetchFixtures(jornada, season);
        if (fixtures.length === 0) {
            console.error('❌ No hay fixtures disponibles');
            process.exit(1);
        }
        // 2. Obtener todas las apuestas posibles para cada partido
        console.log('='.repeat(70));
        console.log('📊 OBTENIENDO TODAS LAS APUESTAS DISPONIBLES');
        console.log('='.repeat(70) + '\n');
        const allMatchBets = [];
        for (const fixture of fixtures) {
            const matchBets = await fetchOddsForFixture(fixture.fixture.id, fixture.teams.home.name, fixture.teams.away.name);
            if (matchBets) {
                allMatchBets.push(matchBets);
            }
            // Esperar 1 segundo entre peticiones
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log(`\n✅ Se obtuvieron apuestas para ${allMatchBets.length} partidos`);
        // 3. Obtener todas las ligas activas
        console.log('\n' + '='.repeat(70));
        console.log('🎲 GENERANDO APUESTAS ALEATORIAS POR LIGA');
        console.log('='.repeat(70));
        const leagues = await prisma.league.findMany({
            select: {
                id: true,
                name: true,
            },
        });
        console.log(`\n📋 Se encontraron ${leagues.length} ligas activas\n`);
        // 4. Generar apuestas aleatorias para cada liga
        for (const league of leagues) {
            await generateBetOptionsForLeague(league.id, jornada, allMatchBets);
        }
        // 5. Resumen final
        console.log('\n' + '='.repeat(70));
        console.log('📊 RESUMEN FINAL');
        console.log('='.repeat(70));
        console.log(`Partidos procesados: ${allMatchBets.length}`);
        console.log(`Ligas actualizadas: ${leagues.length}`);
        console.log(`Jornada: ${jornada}`);
        const totalOptions = await prisma.bet_option.count({
            where: { jornada },
        });
        console.log(`Total de opciones de apuesta generadas: ${totalOptions}`);
        console.log('\n✅ Script completado exitosamente\n');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ Error en el script:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
