import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { generateBetOptionsForLeaguePublic } from '../utils/betOptionsGenerator.js';
const prisma = new PrismaClient();
// Configuración de la API de fútbol
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const HEADERS = {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
};
const LA_LIGA_LEAGUE_ID = 140;
const CURRENT_SEASON = 2025;
export class BetOptionService {
    /**
     * Obtener opciones de apuesta para una liga y jornada
     */
    static async getBetOptions(leagueId, jornada) {
        const options = await prisma.bet_option.findMany({
            where: {
                leagueId,
                jornada,
            },
            orderBy: [
                { matchId: 'asc' },
                { betType: 'asc' },
            ],
        });
        return options;
    }
    /**
     * Crear/actualizar opciones de apuesta para una liga y jornada
     * Si ya existen opciones para esa liga/jornada, las reemplaza
     *
     * RESTRICCIÓN CRÍTICA:
     * - Para cada (leagueId, matchId): máximo 3 apuestas de betType "Resultado"
     * - Para cada (leagueId, matchId): máximo 2 apuestas de cualquier otro betType
     */
    static async saveBetOptions(leagueId, jornada, options) {
        console.log(`\n🔍 Iniciando validación de ${options.length} opciones para liga ${leagueId}, jornada ${jornada}`);
        // PASO 1: Filtrar "Doble oportunidad"
        let validOptions = options.filter(opt => opt.betType !== 'Doble oportunidad');
        if (validOptions.length < options.length) {
            console.log(`⚠️  Filtradas ${options.length - validOptions.length} opciones de "Doble oportunidad"`);
        }
        // PASO 2: Deduplicación por (matchId, betType, betLabel)
        const uniqueMap = new Map();
        for (const opt of validOptions) {
            const key = `${opt.matchId}_${opt.betType}_${opt.betLabel.toLowerCase().trim()}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, opt);
            }
        }
        validOptions = Array.from(uniqueMap.values());
        if (uniqueMap.size < options.length) {
            console.log(`🔄 Deduplicadas ${options.length - uniqueMap.size} opciones idénticas`);
        }
        // PASO 3: Agrupar por (leagueId, matchId, betType) y aplicar límites
        const groupedByMatchAndType = new Map();
        for (const opt of validOptions) {
            // Usar separador único que no aparezca en los datos
            const key = `${leagueId}|||${opt.matchId}|||${opt.betType}`;
            if (!groupedByMatchAndType.has(key)) {
                groupedByMatchAndType.set(key, []);
            }
            groupedByMatchAndType.get(key).push(opt);
        }
        // Aplicar límites: Resultado=3, Otros=2
        const limitedOptions = [];
        let totalDiscarded = 0;
        for (const [key, opts] of groupedByMatchAndType.entries()) {
            const [, matchId, betType] = key.split('|||');
            const limit = betType === 'Resultado' ? 3 : 2;
            if (opts.length > limit) {
                const discarded = opts.length - limit;
                totalDiscarded += discarded;
                console.log(`⚠️  Liga ${leagueId}, Match ${matchId}, Tipo "${betType}": ` +
                    `${opts.length} opciones encontradas, límite: ${limit}. ` +
                    `Descartando ${discarded} opciones.`);
                console.log(`   ✅ Manteniendo: ${opts.slice(0, limit).map(o => o.betLabel).join(', ')}`);
                console.log(`   ❌ Descartando: ${opts.slice(limit).map(o => o.betLabel).join(', ')}`);
                limitedOptions.push(...opts.slice(0, limit));
            }
            else {
                limitedOptions.push(...opts);
            }
        }
        if (totalDiscarded > 0) {
            console.log(`� Total de opciones descartadas por límites: ${totalDiscarded}`);
        }
        // PASO 4: Verificación final de restricciones (sin lanzar error)
        const finalCheck = new Map();
        for (const opt of limitedOptions) {
            const matchKey = `${leagueId}_${opt.matchId}`;
            if (!finalCheck.has(matchKey)) {
                finalCheck.set(matchKey, new Map());
            }
            const typeMap = finalCheck.get(matchKey);
            typeMap.set(opt.betType, (typeMap.get(opt.betType) || 0) + 1);
        }
        // Validar y filtrar opciones que excedan los límites
        const safeOptions = [];
        const countByMatchAndType = new Map();
        for (const opt of limitedOptions) {
            const key = `${leagueId}_${opt.matchId}_${opt.betType}`;
            const currentCount = countByMatchAndType.get(key) || 0;
            const limit = opt.betType === 'Resultado' ? 3 : 2;
            if (currentCount < limit) {
                safeOptions.push(opt);
                countByMatchAndType.set(key, currentCount + 1);
            }
            else {
                console.warn(`⚠️  Opción descartada por límite: Liga ${leagueId}, Match ${opt.matchId}, ` +
                    `Tipo "${opt.betType}", Label "${opt.betLabel}" (ya hay ${limit} opciones)`);
            }
        }
        // Si no hay opciones después de validar, retornar
        if (safeOptions.length === 0) {
            console.log(`⚠️  No hay opciones válidas para guardar después de validación`);
            return {
                success: true,
                created: 0,
                message: 'No se crearon apuestas porque todas excedían los límites permitidos',
            };
        }
        console.log(`✅ ${safeOptions.length} opciones validadas y listas para guardar`);
        // PASO 5: Eliminar opciones existentes para esta liga/jornada
        const deleted = await prisma.bet_option.deleteMany({
            where: {
                leagueId,
                jornada,
            },
        });
        if (deleted.count > 0) {
            console.log(`🗑️  Eliminadas ${deleted.count} opciones antiguas`);
        }
        // PASO 6: Crear nuevas opciones con las opciones seguras
        const created = await prisma.bet_option.createMany({
            data: safeOptions.map((opt) => ({
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
            skipDuplicates: true,
        });
        console.log(`✅ Guardadas ${created.count} opciones de apuesta validadas\n`);
        return {
            success: true,
            created: created.count,
        };
    }
    /**
     * Verificar si una liga tiene opciones de apuesta para una jornada
     */
    static async hasOptions(leagueId, jornada) {
        const count = await prisma.bet_option.count({
            where: {
                leagueId,
                jornada,
            },
        });
        return count > 0;
    }
    /**
     * Generar opciones de apuesta automáticamente para una liga y jornada
     * REGLA: 1 APUESTA por partido (1 tipo de bet con sus opciones complementarias)
     * Ejemplo: "Goles totales" con opciones "Más de 2.5" y "Menos de 2.5"
     */
    static async generateBetOptions(leagueId, jornada) {
        console.log(`\n🎲 Delegando generación de apuestas para liga ${leagueId}, jornada ${jornada} al generador compartido`);
        // Mantener la excepción de Jornada 9 para testing
        if (jornada === 9) {
            return this.generateJornada9Options(leagueId);
        }
        try {
            const res = await generateBetOptionsForLeaguePublic(leagueId, jornada);
            return {
                success: res.success,
                created: res.optionsCount || 0,
            };
        }
        catch (error) {
            console.error('❌ Error delegating generation to betOptionsGenerator:', error?.message || error);
            throw new AppError(500, 'GENERATION_ERROR', `Error al generar apuestas: ${error?.message || error}`);
        }
    }
    /**
     * Generar apuestas sintéticas de un tipo específico
     */
    static generateSyntheticBetsOfType(matchId, homeTeam, awayTeam, type) {
        const bets = [];
        if (type === 'Resultado') {
            // Cuotas típicas para resultados: Local (1.8-2.5), Empate (3.0-3.8), Visitante (2.0-3.2)
            bets.push({ matchId, homeTeam, awayTeam, betType: type, betLabel: `Ganará ${homeTeam}`, odd: parseFloat((1.8 + Math.random() * 0.7).toFixed(2)) }, { matchId, homeTeam, awayTeam, betType: type, betLabel: 'Empate', odd: parseFloat((3.0 + Math.random() * 0.8).toFixed(2)) }, { matchId, homeTeam, awayTeam, betType: type, betLabel: `Ganará ${awayTeam}`, odd: parseFloat((2.0 + Math.random() * 1.2).toFixed(2)) });
        }
        else if (type === 'Goles totales') {
            const thresholds = [0.5, 1.5, 2.5, 3.5];
            const n = thresholds[Math.floor(Math.random() * thresholds.length)];
            // Cuotas según el umbral de goles
            let overOdd, underOdd;
            if (n === 0.5) {
                overOdd = parseFloat((1.15 + Math.random() * 0.1).toFixed(2)); // Más de 0.5: 1.15-1.25
                underOdd = parseFloat((4.5 + Math.random() * 1.5).toFixed(2)); // Menos de 0.5: 4.5-6.0
            }
            else if (n === 1.5) {
                overOdd = parseFloat((1.3 + Math.random() * 0.2).toFixed(2)); // Más de 1.5: 1.3-1.5
                underOdd = parseFloat((3.0 + Math.random() * 1.0).toFixed(2)); // Menos de 1.5: 3.0-4.0
            }
            else if (n === 2.5) {
                overOdd = parseFloat((1.6 + Math.random() * 0.3).toFixed(2)); // Más de 2.5: 1.6-1.9
                underOdd = parseFloat((2.1 + Math.random() * 0.4).toFixed(2)); // Menos de 2.5: 2.1-2.5
            }
            else { // 3.5
                overOdd = parseFloat((2.3 + Math.random() * 0.5).toFixed(2)); // Más de 3.5: 2.3-2.8
                underOdd = parseFloat((1.5 + Math.random() * 0.3).toFixed(2)); // Menos de 3.5: 1.5-1.8
            }
            bets.push({ matchId, homeTeam, awayTeam, betType: type, betLabel: `Más de ${n} goles`, odd: overOdd }, { matchId, homeTeam, awayTeam, betType: type, betLabel: `Menos de ${n} goles`, odd: underOdd });
        }
        else if (type === 'Ambos marcan') {
            // Cuotas típicas: Sí (1.7-2.0), No (1.8-2.2)
            bets.push({ matchId, homeTeam, awayTeam, betType: type, betLabel: 'Ambos equipos marcarán', odd: parseFloat((1.7 + Math.random() * 0.3).toFixed(2)) }, { matchId, homeTeam, awayTeam, betType: type, betLabel: 'Al menos un equipo no marcará', odd: parseFloat((1.8 + Math.random() * 0.4).toFixed(2)) });
        }
        else if (type === 'Córners') {
            const thresholds = [6.5, 8.5, 9.5, 10.5];
            const n = thresholds[Math.floor(Math.random() * thresholds.length)];
            // Cuotas para córners (generalmente más equilibradas)
            bets.push({ matchId, homeTeam, awayTeam, betType: type, betLabel: `Más de ${n} córners`, odd: parseFloat((1.7 + Math.random() * 0.5).toFixed(2)) }, { matchId, homeTeam, awayTeam, betType: type, betLabel: `Menos de ${n} córners`, odd: parseFloat((1.8 + Math.random() * 0.5).toFixed(2)) });
        }
        else if (type === 'Tarjetas') {
            const thresholds = [3.5, 4.5, 5.5, 6.5];
            const n = thresholds[Math.floor(Math.random() * thresholds.length)];
            // Cuotas para tarjetas (similar a córners)
            bets.push({ matchId, homeTeam, awayTeam, betType: type, betLabel: `Más de ${n} tarjetas`, odd: parseFloat((1.75 + Math.random() * 0.45).toFixed(2)) }, { matchId, homeTeam, awayTeam, betType: type, betLabel: `Menos de ${n} tarjetas`, odd: parseFloat((1.85 + Math.random() * 0.45).toFixed(2)) });
        }
        return bets;
    }
    /**
     * Generar opciones de apuesta predefinidas para la Jornada 9 (testing)
     */
    static async generateJornada9Options(leagueId) {
        console.log(`\n🎯 Generando opciones de apuesta predefinidas para Jornada 9`);
        const allBets = [
            // 1. Real Madrid vs Villarreal - Resultado
            { matchId: 1211419, homeTeam: 'Real Madrid', awayTeam: 'Villarreal', betType: 'Resultado', betLabel: 'Ganará Real Madrid', odd: 1.4 },
            { matchId: 1211419, homeTeam: 'Real Madrid', awayTeam: 'Villarreal', betType: 'Resultado', betLabel: 'Empate', odd: 4.5 },
            { matchId: 1211419, homeTeam: 'Real Madrid', awayTeam: 'Villarreal', betType: 'Resultado', betLabel: 'Ganará Villarreal', odd: 7.0 },
            // 2. Real Madrid vs Villarreal - Goles totales
            { matchId: 1211419, homeTeam: 'Real Madrid', awayTeam: 'Villarreal', betType: 'Goles totales', betLabel: 'Más de 2.5 goles', odd: 1.6 },
            { matchId: 1211419, homeTeam: 'Real Madrid', awayTeam: 'Villarreal', betType: 'Goles totales', betLabel: 'Menos de 2.5 goles', odd: 2.3 },
            // 3. Barcelona vs Alavés - Resultado
            { matchId: 1211415, homeTeam: 'Barcelona', awayTeam: 'Alavés', betType: 'Resultado', betLabel: 'Ganará Barcelona', odd: 1.2 },
            { matchId: 1211415, homeTeam: 'Barcelona', awayTeam: 'Alavés', betType: 'Resultado', betLabel: 'Empate', odd: 6.5 },
            { matchId: 1211415, homeTeam: 'Barcelona', awayTeam: 'Alavés', betType: 'Resultado', betLabel: 'Ganará Alavés', odd: 12.0 },
            // 4. Atlético Madrid vs Real Sociedad - Resultado
            { matchId: 1211414, homeTeam: 'Atlético Madrid', awayTeam: 'Real Sociedad', betType: 'Resultado', betLabel: 'Ganará Atlético Madrid', odd: 1.7 },
            { matchId: 1211414, homeTeam: 'Atlético Madrid', awayTeam: 'Real Sociedad', betType: 'Resultado', betLabel: 'Empate', odd: 3.8 },
            { matchId: 1211414, homeTeam: 'Atlético Madrid', awayTeam: 'Real Sociedad', betType: 'Resultado', betLabel: 'Ganará Real Sociedad', odd: 4.5 },
            // 5. Sevilla vs Betis - Resultado (Derbi)
            { matchId: 1211420, homeTeam: 'Sevilla', awayTeam: 'Betis', betType: 'Resultado', betLabel: 'Ganará Sevilla', odd: 2.4 },
            { matchId: 1211420, homeTeam: 'Sevilla', awayTeam: 'Betis', betType: 'Resultado', betLabel: 'Empate', odd: 3.3 },
            { matchId: 1211420, homeTeam: 'Sevilla', awayTeam: 'Betis', betType: 'Resultado', betLabel: 'Ganará Betis', odd: 2.9 },
            // 6. Sevilla vs Betis - Ambos marcan
            { matchId: 1211420, homeTeam: 'Sevilla', awayTeam: 'Betis', betType: 'Ambos marcan', betLabel: 'Ambos equipos marcarán', odd: 1.7 },
            { matchId: 1211420, homeTeam: 'Sevilla', awayTeam: 'Betis', betType: 'Ambos marcan', betLabel: 'Al menos un equipo no marcará', odd: 2.1 },
            // 7. Athletic Bilbao vs Espanyol - Resultado
            { matchId: 1211413, homeTeam: 'Athletic Bilbao', awayTeam: 'Espanyol', betType: 'Resultado', betLabel: 'Ganará Athletic Bilbao', odd: 1.5 },
            { matchId: 1211413, homeTeam: 'Athletic Bilbao', awayTeam: 'Espanyol', betType: 'Resultado', betLabel: 'Empate', odd: 4.2 },
            { matchId: 1211413, homeTeam: 'Athletic Bilbao', awayTeam: 'Espanyol', betType: 'Resultado', betLabel: 'Ganará Espanyol', odd: 6.5 },
            // 8. Getafe vs Osasuna - Goles totales
            { matchId: 1211417, homeTeam: 'Getafe', awayTeam: 'Osasuna', betType: 'Goles totales', betLabel: 'Más de 1.5 goles', odd: 1.9 },
            { matchId: 1211417, homeTeam: 'Getafe', awayTeam: 'Osasuna', betType: 'Goles totales', betLabel: 'Menos de 1.5 goles', odd: 1.9 },
            // 9. Valencia vs Las Palmas - Resultado
            { matchId: 1211421, homeTeam: 'Valencia', awayTeam: 'Las Palmas', betType: 'Resultado', betLabel: 'Ganará Valencia', odd: 2.0 },
            { matchId: 1211421, homeTeam: 'Valencia', awayTeam: 'Las Palmas', betType: 'Resultado', betLabel: 'Empate', odd: 3.4 },
            { matchId: 1211421, homeTeam: 'Valencia', awayTeam: 'Las Palmas', betType: 'Resultado', betLabel: 'Ganará Las Palmas', odd: 3.8 },
            // 10. Girona vs Athletic - Ambos marcan
            { matchId: 1211416, homeTeam: 'Girona', awayTeam: 'Athletic Club', betType: 'Ambos marcan', betLabel: 'Ambos equipos marcarán', odd: 1.8 },
            { matchId: 1211416, homeTeam: 'Girona', awayTeam: 'Athletic Club', betType: 'Ambos marcan', betLabel: 'Al menos un equipo no marcará', odd: 2.0 },
        ];
        console.log(`📊 Total de apuestas generadas para J9: ${allBets.length}`);
        const result = await this.saveBetOptions(leagueId, 9, allBets);
        console.log(`✅ Opciones de J9 guardadas: ${result.created}\n`);
        return result;
    }
}
