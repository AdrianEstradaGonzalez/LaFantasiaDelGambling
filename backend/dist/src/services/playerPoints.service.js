import axios from 'axios';
import { AppError } from '../utils/errors.js';
const API_BASE = 'https://v3.football.api-sports.io';
const FALLBACK_APISPORTS_KEY = '099ef4c6c0803639d80207d4ac1ad5da';
const CLEAN_SHEET_MINUTES = 60;
function buildHeaders() {
    const candidates = [
        process.env.FOOTBALL_API_KEY,
        process.env.APISPORTS_API_KEY,
        process.env.API_FOOTBALL_KEY,
        process.env.APISPORTS_KEY,
    ].filter(Boolean);
    if (candidates.length > 0)
        return { 'x-apisports-key': candidates[0] };
    const rapidCandidates = [
        process.env.RAPIDAPI_KEY,
        process.env.RAPIDAPI_FOOTBALL_KEY,
        process.env.API_FOOTBALL_RAPID_KEY,
    ].filter(Boolean);
    if (rapidCandidates.length > 0)
        return { 'x-rapidapi-key': rapidCandidates[0], 'x-rapidapi-host': 'v3.football.api-sports.io' };
    return { 'x-apisports-key': FALLBACK_APISPORTS_KEY };
}
const api = axios.create({ baseURL: API_BASE, timeout: 15000, headers: buildHeaders() });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const roleMap = {
    gk: 'Goalkeeper',
    goalkeeper: 'Goalkeeper',
    g: 'Goalkeeper',
    defender: 'Defender',
    d: 'Defender',
    df: 'Defender',
    back: 'Defender',
    lb: 'Defender',
    rb: 'Defender',
    cb: 'Defender',
    midfielder: 'Midfielder',
    m: 'Midfielder',
    mf: 'Midfielder',
    cm: 'Midfielder',
    dm: 'Midfielder',
    am: 'Midfielder',
    winger: 'Attacker',
    wing: 'Attacker',
    forward: 'Attacker',
    attacker: 'Attacker',
    f: 'Attacker',
    cf: 'Attacker',
    st: 'Attacker',
};
export function normalizeRole(position) {
    if (!position)
        return 'Midfielder';
    const key = position.trim().toLowerCase();
    return roleMap[key] ?? 'Midfielder';
}
export function calculatePlayerPoints(stats, role) {
    if (!stats || !stats.games)
        return 0;
    let points = 0;
    const minutes = Number(stats.games?.minutes ?? 0);
    const meetsCleanSheetMinutes = minutes >= CLEAN_SHEET_MINUTES;
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
    if (role === 'Goalkeeper') {
        const conceded = Number(stats.goalkeeper?.conceded ?? goals.conceded ?? 0);
        const saves = Number(stats.goalkeeper?.saves ?? goals.saves ?? 0);
        const savedPens = Number(penalty.saved ?? stats.goalkeeper?.savedPenalties ?? stats.goalkeeper?.saved ?? 0);
        points += (goals.total || 0) * 10;
        points += (goals.assists || 0) * 3;
        points += saves;
        points -= conceded * 2;
        points += savedPens * 5;
    }
    else if (role === 'Defender') {
        const conceded = Number(goals.conceded ?? stats.goalkeeper?.conceded ?? 0);
        if (meetsCleanSheetMinutes && conceded === 0)
            points += 4;
        points += (goals.total || 0) * 6;
        points += Math.floor((duels.won || 0) / 2);
        points += Math.floor((tackles.interceptions || 0) / 5);
        points -= conceded;
        points += (shots.on || 0);
    }
    else if (role === 'Midfielder') {
        const conceded = Number(goals.conceded ?? 0);
        // Portería a cero (>=60 min): +1
        if (meetsCleanSheetMinutes && conceded === 0)
            points += 1;
        points += (goals.total || 0) * 5;
        points -= Math.floor(conceded / 2);
        points += (passes.key || 0);
        points += Math.floor((dribbles.success || 0) / 2);
        points += Math.floor((fouls.drawn || 0) / 3);
        points += Math.floor((tackles.interceptions || 0) / 3);
        points += (shots.on || 0);
    }
    else if (role === 'Attacker') {
        points += (goals.total || 0) * 4;
        points += (passes.key || 0);
        points += Math.floor((fouls.drawn || 0) / 3);
        points += Math.floor((dribbles.success || 0) / 2);
        points += (shots.on || 0);
    }
    const rawRating = stats.games?.rating;
    if (rawRating != null && rawRating !== '') {
        const rating = Number(rawRating);
        if (!Number.isNaN(rating)) {
            if (rating >= 9)
                points += 3;
            else if (rating >= 8)
                points += 2;
            else if (rating >= 7)
                points += 1;
        }
    }
    return points;
}
export function createEmptyStats() {
    return {
        games: {
            minutes: 0,
            position: null,
            number: null,
            rating: null,
            captain: false,
            substitute: false,
        },
        shots: { total: 0, on: 0 },
        goals: { total: 0, assists: 0, conceded: 0 },
        passes: { total: 0, key: 0 },
        tackles: { total: 0, interceptions: 0 },
        duels: { total: 0, won: 0 },
        dribbles: { attempts: 0, success: 0 },
        fouls: { drawn: 0, committed: 0 },
        cards: { yellow: 0, red: 0 },
        penalty: { won: 0, committed: 0, scored: 0, missed: 0, saved: 0 },
        goalkeeper: { saves: 0, conceded: 0, cleanSheets: 0, savedPenalties: 0 },
    };
}
async function fetchMatchdayFixtures(matchday) {
    const response = await api.get('/fixtures', {
        params: {
            league: 140,
            season: process.env.FOOTBALL_API_SEASON ?? 2025,
            round: `Regular Season - ${matchday}`,
        },
    });
    return response.data?.response ?? [];
}
async function fetchPlayerSeasonInfo(playerId) {
    const response = await api.get('/players', {
        params: {
            id: playerId,
            season: process.env.FOOTBALL_API_SEASON ?? 2025,
            league: 140,
        },
    });
    return response.data?.response?.[0] ?? null;
}
async function fetchFixturePlayers(fixtureId) {
    const response = await api.get('/fixtures/players', { params: { fixture: fixtureId } });
    return response.data?.response ?? [];
}
export async function getPlayerMatchdayStats(playerId, matchday, roleInput) {
    if (!matchday || matchday < 1) {
        throw new AppError(400, 'INVALID_MATCHDAY', 'La jornada debe ser un número positivo');
    }
    try {
        const fixtures = await fetchMatchdayFixtures(matchday);
        const playerInfo = await fetchPlayerSeasonInfo(playerId);
        if (!playerInfo)
            return { matchday, points: null, stats: null };
        const statsArray = Array.isArray(playerInfo.statistics) ? playerInfo.statistics : [];
        const preferredStats = statsArray.filter((s) => s?.league?.id === 140);
        const statsSource = preferredStats.length ? preferredStats : statsArray;
        const playerTeamIds = statsSource.map((s) => s?.team?.id).filter((id) => typeof id === 'number');
        if (!playerTeamIds.length)
            return { matchday, points: null, stats: null };
        let teamFixture = null;
        for (const teamId of playerTeamIds) {
            teamFixture = fixtures.find((f) => f?.teams?.home?.id === teamId || f?.teams?.away?.id === teamId);
            if (teamFixture)
                break;
        }
        if (!teamFixture)
            return { matchday, points: 0, stats: createEmptyStats() };
        const teamsData = await fetchFixturePlayers(teamFixture.fixture.id);
        let playerStats = null;
        for (const teamData of teamsData) {
            const players = teamData?.players || [];
            const found = players.find((p) => p?.player?.id === playerId);
            if (found?.statistics?.[0]) {
                playerStats = found.statistics[0];
                break;
            }
        }
        // Fallback 1: coincidencia por nombre (normalizado) cuando el ID no aparece
        if (!playerStats && playerInfo?.player?.name) {
            const target = String(playerInfo.player.name)
                .normalize('NFD')
                .replace(/̀-ͯ/g, '')
                .toLowerCase();
            for (const teamData of teamsData) {
                const players = teamData?.players || [];
                const foundByName = players.find((p) => {
                    const name = String(p?.player?.name || '')
                        .normalize('NFD')
                        .replace(/̀-ͯ/g, '')
                        .toLowerCase();
                    return name && name === target && p?.statistics?.[0];
                });
                if (foundByName?.statistics?.[0]) {
                    playerStats = foundByName.statistics[0];
                    break;
                }
            }
        }
        // Fallback 2: si el rol esperado es portero, tomar el portero con minutos > 0
        const expectedRole = normalizeRole(roleInput ?? playerInfo?.statistics?.[0]?.games?.position);
        if (!playerStats && expectedRole === 'Goalkeeper') {
            for (const teamData of teamsData) {
                const players = teamData?.players || [];
                const gk = players.find((p) => {
                    const pos = String(p?.statistics?.[0]?.games?.position || '')
                        .trim()
                        .toLowerCase();
                    const mins = Number(p?.statistics?.[0]?.games?.minutes || 0);
                    return mins > 0 && (pos === 'g' || pos === 'gk' || pos.includes('goal'));
                });
                if (gk?.statistics?.[0]) {
                    playerStats = gk.statistics[0];
                    break;
                }
            }
        }
        if (!playerStats)
            return { matchday, points: 0, stats: createEmptyStats() };
        const role = normalizeRole(roleInput ?? playerStats?.games?.position);
        const points = calculatePlayerPoints(playerStats, role);
        return { matchday, points, stats: playerStats };
    }
    catch (error) {
        const status = error?.response?.status;
        if (status === 403) {
            throw new AppError(502, 'FOOTBALL_API_FORBIDDEN', 'La API de Fútbol rechazó la petición. Revisa la API key configurada.');
        }
        if (status === 429) {
            await delay(2000);
            return getPlayerMatchdayStats(playerId, matchday, roleInput);
        }
        throw error;
    }
}
