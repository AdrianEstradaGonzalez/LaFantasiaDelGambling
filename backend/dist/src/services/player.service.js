import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { PlayerRepository } from '../repositories/player.repo.js';
import { PlayerJornadaPointsRepo } from '../repositories/playerJornadaPoints.repo.js';
import { getPlayerMatchdayStats } from './playerPoints.service.js';
const prisma = new PrismaClient();
const API_BASE = 'https://v3.football.api-sports.io';
const LA_LIGA_LEAGUE_ID = 140;
const SEASON_DEFAULT = 2025;
const HEADERS = {
    'x-apisports-key': '66ba89a63115cb5dc1155294ad753e09',
};
export class PlayerService {
    /**
     * Genera un precio aleatorio entre 1M y 250M basado en la posición
     */
    static generatePrice(position) {
        const ranges = {
            Goalkeeper: { min: 1, max: 80 },
            Defender: { min: 1, max: 150 },
            Midfielder: { min: 5, max: 200 },
            Attacker: { min: 10, max: 250 },
        };
        const range = ranges[position] || { min: 1, max: 100 };
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }
    /**
     * Normalizar posición de la API
     * Mapea todas las variantes de posiciones a las 4 categorías canónicas
     */
    static normalizePosition(pos) {
        if (!pos)
            return 'Midfielder';
        const normalized = pos.trim().toLowerCase();
        // Porteros
        if (normalized === 'g' || normalized === 'goalkeeper' || normalized.includes('goal') || normalized.includes('keeper')) {
            return 'Goalkeeper';
        }
        // Defensas
        if (normalized === 'd' || normalized === 'defender' || normalized.includes('defen') || normalized.includes('back')) {
            return 'Defender';
        }
        // Centrocampistas (incluye mediocentros defensivos, centrales, ofensivos)
        // Se evalúa ANTES que delanteros para capturar "Defensive Midfield", "Central Midfield", etc.
        if (normalized === 'm' || normalized === 'midfielder' || normalized.includes('midfield') || normalized.includes('midf')) {
            return 'Midfielder';
        }
        // Delanteros (incluye extremos/wingers, atacantes, delanteros centro)
        if (normalized === 'f' || normalized === 'attacker' || normalized === 'forward' || normalized.includes('attack') || normalized.includes('forward') || normalized.includes('striker') || normalized.includes('wing')) {
            return 'Attacker';
        }
        // Default
        return 'Midfielder';
    }
    /**
     * Sincronizar jugadores desde la API de LaLiga
     */
    static async syncPlayersFromAPI() {
        const allPlayersMap = new Map();
        let page = 1;
        let totalPages = 1;
        let errors = 0;
        try {
            console.log('🚀 Iniciando sincronización de jugadores desde API...');
            do {
                try {
                    const { data } = await axios.get(`${API_BASE}/players`, {
                        headers: HEADERS,
                        timeout: 15000,
                        params: {
                            league: LA_LIGA_LEAGUE_ID,
                            season: SEASON_DEFAULT,
                            page
                        },
                    });
                    const list = data?.response ?? [];
                    totalPages = data?.paging?.total ?? 1; // SIN límite - obtener TODAS las páginas
                    for (const item of list) {
                        const player = item?.player;
                        if (!player?.id)
                            continue;
                        // 🔍 LOG COMPLETO: Mostrar objeto raw de la API para jugadores específicos
                        const playerNameLower = (player.name || '').toLowerCase();
                        if (playerNameLower.includes('yamal') || playerNameLower.includes('nico williams') || playerNameLower.includes('vinícius') || playerNameLower.includes('eyong')) {
                            console.log(`\n🔍 ===== DATOS RAW DE LA API PARA ${player.name.toUpperCase()} =====`);
                            console.log(JSON.stringify(item, null, 2));
                            console.log('===== FIN DATOS RAW =====\n');
                        }
                        // ⚠️ IMPORTANTE: Un jugador puede tener múltiples estadísticas (equipos diferentes)
                        // Por ejemplo, jugadores cedidos aparecen con stats del equipo original Y del equipo cedido
                        const allStats = item?.statistics || [];
                        for (const stats of allStats) {
                            // Posición ORIGINAL de la API (antes de normalizar)
                            const rawPosition = stats?.games?.position || player.position;
                            const position = this.normalizePosition(rawPosition);
                            const price = this.generatePrice(position);
                            // Número de apariciones (partidos jugados)
                            const appearances = stats?.games?.appearences || stats?.games?.lineups || 0;
                            // 🔍 LOG: Ver posición original vs normalizada
                            if (page === 1 && allPlayersMap.size < 5) {
                                console.log(`📊 Jugador: ${player.name} | Posición API: "${rawPosition}" → Normalizada: "${position}"`);
                            }
                            const playerData = {
                                id: player.id,
                                name: player.name,
                                position,
                                teamId: stats?.team?.id,
                                teamName: stats?.team?.name,
                                teamCrest: stats?.team?.logo,
                                nationality: player.nationality,
                                shirtNumber: stats?.games?.number,
                                photo: player.photo,
                                price,
                                appearances
                            };
                            // Si el jugador ya existe, quedarse con el que tiene más apariciones
                            // (el equipo donde está cedido/jugando actualmente)
                            const existing = allPlayersMap.get(player.id);
                            if (!existing || appearances > existing.appearances) {
                                if (existing && appearances > existing.appearances) {
                                    console.log(`🔄 ${player.name}: Reemplazando ${existing.teamName} (${existing.appearances} partidos) por ${stats?.team?.name} (${appearances} partidos)`);
                                }
                                allPlayersMap.set(player.id, playerData);
                            }
                            else if (existing && appearances < existing.appearances) {
                                console.log(`⏭️ ${player.name}: Manteniendo ${existing.teamName} (${existing.appearances} partidos), ignorando ${stats?.team?.name} (${appearances} partidos)`);
                            }
                        }
                    }
                    console.log(`📄 Página ${page}/${totalPages} procesada: ${list.length} jugadores (Total únicos: ${allPlayersMap.size})`);
                    page += 1;
                    await new Promise(r => setTimeout(r, 200)); // Aumentar delay para evitar rate limit
                }
                catch (e) {
                    const status = e?.response?.status;
                    if (status === 429 || status === 403) {
                        console.warn('⚠️ Rate limit alcanzado, esperando 2 segundos...');
                        await new Promise(r => setTimeout(r, 2000));
                        // Reintentar la misma página
                        continue;
                    }
                    console.warn('Error en página:', e?.message);
                    errors++;
                    break;
                }
            } while (page <= totalPages);
            // Convertir el Map a array de jugadores (sin el campo 'appearances')
            const allPlayers = Array.from(allPlayersMap.values()).map(({ appearances, ...player }) => player);
            console.log(`✅ Total de jugadores obtenidos de la API: ${allPlayers.length}`);
            // Guardar en la base de datos en lotes
            const batchSize = 50;
            let playersAdded = 0;
            let playersUpdated = 0;
            for (let i = 0; i < allPlayers.length; i += batchSize) {
                const batch = allPlayers.slice(i, i + batchSize);
                try {
                    // Verificar cuáles existen
                    const existingIds = await Promise.all(batch.map(p => PlayerRepository.getPlayerById(p.id)));
                    const newPlayers = batch.filter((_, idx) => !existingIds[idx]);
                    const updatedPlayers = batch.filter((_, idx) => existingIds[idx]);
                    await PlayerRepository.upsertMany(batch);
                    playersAdded += newPlayers.length;
                    playersUpdated += updatedPlayers.length;
                    console.log(`💾 Lote ${Math.floor(i / batchSize) + 1}: ${newPlayers.length} nuevos, ${updatedPlayers.length} actualizados`);
                }
                catch (e) {
                    console.warn('Error guardando lote:', e);
                    errors++;
                }
            }
            console.log(`🎉 Sincronización completada: ${playersAdded} añadidos, ${playersUpdated} actualizados`);
            return {
                success: true,
                playersAdded,
                playersUpdated,
                errors,
            };
        }
        catch (error) {
            console.error('❌ Error en sincronización:', error);
            return {
                success: false,
                playersAdded: 0,
                playersUpdated: 0,
                errors: errors + 1,
            };
        }
    }
    /**
     * Obtener todos los jugadores de la base de datos con puntuación total
     */
    static async getAllPlayers(division = 'primera') {
        const players = division === 'segunda'
            ? await PlayerRepository.getAllSegundaPlayers()
            : await PlayerRepository.getAllPlayers();
        // Obtener puntuación total de cada jugador (suma de todas las jornadas)
        const playersWithTotalPoints = await Promise.all(players.map(async (player) => {
            const stats = await prisma.playerStats.aggregate({
                where: { playerId: player.id },
                _sum: { totalPoints: true },
            });
            return {
                ...player,
                totalPoints: stats._sum.totalPoints || 0,
            };
        }));
        // Ordenar por equipo y luego por posición en el orden lógico
        const positionOrder = {
            'Goalkeeper': 1,
            'Defender': 2,
            'Midfielder': 3,
            'Attacker': 4
        };
        return playersWithTotalPoints.sort((a, b) => {
            // Primero ordenar por equipo (alfabéticamente)
            const teamCompare = a.teamName.localeCompare(b.teamName);
            if (teamCompare !== 0)
                return teamCompare;
            // Luego por posición (orden lógico)
            const posA = positionOrder[a.position] || 999;
            const posB = positionOrder[b.position] || 999;
            if (posA !== posB)
                return posA - posB;
            // Finalmente por nombre
            return a.name.localeCompare(b.name);
        });
    }
    /**
     * Obtener jugador por ID
     */
    static async getPlayerById(id) {
        const player = await PlayerRepository.getPlayerById(id);
        if (!player) {
            throw new Error('Jugador no encontrado');
        }
        return player;
    }
    /**
     * Obtener jugadores por equipo
     */
    static async getPlayersByTeam(teamId, division = 'primera') {
        return division === 'segunda'
            ? PlayerRepository.getSegundaPlayersByTeam(teamId)
            : PlayerRepository.getPlayersByTeam(teamId);
    }
    /**
     * Obtener jugadores por posición
     */
    static async getPlayersByPosition(position, division = 'primera') {
        return division === 'segunda'
            ? PlayerRepository.getSegundaPlayersByPosition(position)
            : PlayerRepository.getPlayersByPosition(position);
    }
    /**
     * Buscar jugadores
     */
    static async searchPlayers(query, division = 'primera') {
        return division === 'segunda'
            ? PlayerRepository.searchSegundaPlayers(query)
            : PlayerRepository.searchPlayers(query);
    }
    /**
     * Actualizar precio de jugador
     */
    static async updatePlayerPrice(id, price) {
        if (price < 1 || price > 250) {
            throw new Error('El precio debe estar entre 1M y 250M');
        }
        return PlayerRepository.updatePlayerPrice(id, price);
    }
    /**
     * Actualizar posición de jugador
     */
    static async updatePlayerPosition(id, position) {
        const validPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];
        if (!validPositions.includes(position)) {
            throw new Error(`La posición debe ser una de: ${validPositions.join(', ')}`);
        }
        return PlayerRepository.updatePlayerPosition(id, position);
    }
    /**
     * Actualizar equipo de jugador
     */
    static async updatePlayerTeam(id, teamId) {
        if (!Number.isInteger(teamId) || teamId <= 0) {
            throw new Error('El ID del equipo debe ser un número válido');
        }
        return PlayerRepository.updatePlayerTeam(id, teamId);
    }
    /**
     * Actualizar puntos cacheados de la última jornada para un jugador
     */
    static async updateLastJornadaPoints(id, points, jornada, season) {
        if (!Number.isFinite(points)) {
            throw new Error('Puntos inválidos');
        }
        // Aceptamos rango razonable por seguridad
        if (points < -1000 || points > 1000) {
            throw new Error('Puntos fuera de rango');
        }
        const sanitized = Math.trunc(points);
        const finalSeason = Number(season ?? process.env.FOOTBALL_API_SEASON ?? SEASON_DEFAULT);
        const [playerUpdate] = await Promise.all([
            PlayerRepository.updateLastJornadaPoints(id, sanitized, jornada),
            jornada != null
                ? PlayerJornadaPointsRepo.upsertPoints(id, finalSeason, {
                    [PlayerJornadaPointsRepo.getColumnName(jornada)]: sanitized,
                })
                : Promise.resolve(),
        ]);
        return playerUpdate;
    }
    static async getJornadaPoints(playerId, matchdays, options) {
        if (!matchdays.length) {
            throw new Error('Debes proporcionar al menos una jornada');
        }
        const uniqueMatchdays = Array.from(new Set(matchdays.filter((md) => Number.isInteger(md) && md > 0 && md <= 38))).sort((a, b) => a - b);
        if (!uniqueMatchdays.length) {
            throw new Error('Jornadas inválidas');
        }
        const season = Number(options?.season ?? process.env.FOOTBALL_API_SEASON ?? SEASON_DEFAULT);
        const refreshLast = options?.refreshLast !== false;
        const lastMatchday = uniqueMatchdays[uniqueMatchdays.length - 1];
        const player = await PlayerRepository.getPlayerById(playerId);
        if (!player) {
            throw new Error('Jugador no encontrado');
        }
        const record = await PlayerJornadaPointsRepo.findByPlayerSeason(playerId, season);
        const updates = {};
        const updatedMatchdays = [];
        const pointsMap = new Map();
        for (const jornada of uniqueMatchdays) {
            const column = PlayerJornadaPointsRepo.getColumnName(jornada);
            const stored = record?.[column] ?? null;
            const shouldRefresh = refreshLast && jornada === lastMatchday;
            if (stored === null || shouldRefresh) {
                const stats = await getPlayerMatchdayStats(playerId, jornada, player.position);
                const computedPoints = stats?.points != null ? Math.trunc(stats.points) : 0;
                updates[column] = computedPoints;
                updatedMatchdays.push(jornada);
                pointsMap.set(jornada, computedPoints);
            }
            else {
                pointsMap.set(jornada, stored);
            }
        }
        if (Object.keys(updates).length) {
            await PlayerJornadaPointsRepo.upsertPoints(playerId, season, updates);
            await PlayerRepository.updateLastJornadaPoints(playerId, pointsMap.get(lastMatchday) ?? 0, lastMatchday);
        }
        const points = uniqueMatchdays.map((jornada) => ({
            matchday: jornada,
            points: pointsMap.get(jornada) ?? null,
            source: updatedMatchdays.includes(jornada) ? 'api' : 'cache',
        }));
        return {
            season,
            matchdays: uniqueMatchdays,
            points,
            updatedMatchdays,
        };
    }
    /**
     * Obtener estadísticas
     */
    static async getStats() {
        return PlayerRepository.getPriceStats();
    }
    /**
     * Eliminar un jugador de la base de datos
     * - Verifica si el jugador está asignado a alguna plantilla (SquadPlayer) antes de eliminar
     */
    static async deletePlayer(id) {
        // Verificar referencias en SquadPlayer (no permitir eliminación si está en una plantilla)
        const inSquad = await prisma.squadPlayer.findFirst({ where: { playerId: id } });
        if (inSquad) {
            throw new Error('El jugador está asignado a alguna plantilla. Eliminar primero de las plantillas.');
        }
        return PlayerRepository.deletePlayer(id);
    }
}
