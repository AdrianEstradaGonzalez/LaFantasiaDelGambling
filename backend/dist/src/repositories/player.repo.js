import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class PlayerRepository {
    /**
     * Crear o actualizar un jugador
     * ⚠️ IMPORTANTE: NO sobrescribe el precio si el jugador ya existe
     */
    static async upsertPlayer(data) {
        return prisma.player.upsert({
            where: { id: data.id },
            update: {
                name: data.name,
                position: data.position,
                teamId: data.teamId,
                teamName: data.teamName,
                teamCrest: data.teamCrest,
                nationality: data.nationality,
                shirtNumber: data.shirtNumber,
                photo: data.photo,
                // ⚠️ NO actualizar el precio - mantener el valor existente en BD
                // price: data.price, <-- COMENTADO para preservar precios manuales
            },
            create: data,
        });
    }
    /**
     * Crear o actualizar múltiples jugadores
     * ⚠️ IMPORTANTE: NO sobrescribe el precio si el jugador ya existe
     */
    static async upsertMany(players) {
        const operations = players.map((player) => prisma.player.upsert({
            where: { id: player.id },
            update: {
                name: player.name,
                position: player.position,
                teamId: player.teamId,
                teamName: player.teamName,
                teamCrest: player.teamCrest,
                nationality: player.nationality,
                shirtNumber: player.shirtNumber,
                photo: player.photo,
                // ⚠️ NO actualizar el precio - mantener el valor existente en BD
                // price: player.price, <-- COMENTADO para preservar precios manuales
            },
            create: player,
        }));
        return prisma.$transaction(operations);
    }
    /**
     * Obtener todos los jugadores
     */
    static async getAllPlayers() {
        return prisma.player.findMany({
            orderBy: [
                { teamName: 'asc' },
                { position: 'asc' },
                { name: 'asc' },
            ],
        });
    }
    /**
     * Obtener jugador por ID
     */
    static async getPlayerById(id) {
        return prisma.player.findUnique({
            where: { id },
        });
    }
    /**
     * Actualizar puntos de la última jornada en caché
     */
    static async updateLastJornadaPoints(id, points) {
        return prisma.player.update({
            where: { id },
            // Cast temporal para evitar discrepancias de tipos si el cliente Prisma no se ha refrescado
            data: { lastJornadaPoints: points },
        });
    }
    /**
     * Obtener jugadores por equipo
     */
    static async getPlayersByTeam(teamId) {
        return prisma.player.findMany({
            where: { teamId },
            orderBy: [
                { position: 'asc' },
                { name: 'asc' },
            ],
        });
    }
    /**
     * Obtener jugadores por posición
     */
    static async getPlayersByPosition(position) {
        return prisma.player.findMany({
            where: { position },
            orderBy: [
                { teamName: 'asc' },
                { name: 'asc' },
            ],
        });
    }
    /**
     * Obtener jugadores por rango de precio
     */
    static async getPlayersByPriceRange(minPrice, maxPrice) {
        return prisma.player.findMany({
            where: {
                price: {
                    gte: minPrice,
                    lte: maxPrice,
                },
            },
            orderBy: [
                { price: 'desc' },
                { name: 'asc' },
            ],
        });
    }
    /**
     * Buscar jugadores por nombre
     */
    static async searchPlayers(query) {
        return prisma.player.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    /**
     * Actualizar precio de un jugador
     */
    static async updatePlayerPrice(id, price) {
        return prisma.player.update({
            where: { id },
            data: { price },
        });
    }
    /**
     * Actualizar posición de un jugador
     */
    static async updatePlayerPosition(id, position) {
        return prisma.player.update({
            where: { id },
            data: { position },
        });
    }
    /**
     * Eliminar un jugador
     */
    static async deletePlayer(id) {
        return prisma.player.delete({
            where: { id },
        });
    }
    /**
     * Eliminar todos los jugadores
     */
    static async deleteAllPlayers() {
        return prisma.player.deleteMany({});
    }
    /**
     * Contar jugadores totales
     */
    static async countPlayers() {
        return prisma.player.count();
    }
    /**
     * Obtener estadísticas de precios
     */
    static async getPriceStats() {
        const stats = await prisma.player.aggregate({
            _avg: { price: true },
            _min: { price: true },
            _max: { price: true },
            _count: true,
        });
        return {
            average: stats._avg.price || 0,
            min: stats._min.price || 0,
            max: stats._max.price || 0,
            total: stats._count,
        };
    }
}
