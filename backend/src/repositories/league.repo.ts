import { PrismaClient } from "@prisma/client";
import axios from 'axios';

const prisma = new PrismaClient();

// Función helper para obtener la jornada actual desde la API
async function getCurrentJornadaFromAPI(): Promise<number> {
    try {
        const API_BASE = 'https://v3.football.api-sports.io';
        const API_KEY = process.env.FOOTBALL_API_KEY || '';
        
        const { data } = await axios.get(`${API_BASE}/fixtures`, {
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io',
            },
            params: {
                league: 140, // La Liga
                season: 2025,
                next: 50 // Obtener próximos partidos
            },
            timeout: 5000
        });

        const fixtures = data?.response || [];
        if (fixtures.length > 0) {
            // Primero buscar partidos EN JUEGO (estos son definitivamente de la jornada actual)
            const liveMatch = fixtures.find((f: any) => 
                ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(f?.fixture?.status?.short)
            );
            
            if (liveMatch && liveMatch.league?.round) {
                const match = liveMatch.league.round.match(/Regular Season - (\d+)/);
                if (match && match[1]) {
                    const jornada = parseInt(match[1]);
                    console.log(`✅ Jornada actual detectada desde partidos EN JUEGO: ${jornada}`);
                    return jornada;
                }
            }
            
            // Si no hay partidos en juego, buscar partidos NS (Not Started)
            // pero verificar que sean de la jornada más baja (no la siguiente)
            const nsMatches = fixtures.filter((f: any) => f?.fixture?.status?.short === 'NS');
            if (nsMatches.length > 0) {
                // Obtener todas las jornadas de partidos NS
                const nsJornadas = nsMatches
                    .map((f: any) => {
                        const match = f.league?.round?.match(/Regular Season - (\d+)/);
                        return match && match[1] ? parseInt(match[1]) : null;
                    })
                    .filter((j: number | null) => j !== null);
                
                if (nsJornadas.length > 0) {
                    // Usar la jornada MÁS BAJA (la actual, no la siguiente)
                    const minJornada = Math.min(...nsJornadas);
                    console.log(`✅ Jornada actual detectada desde partidos NS (mínima): ${minJornada}`);
                    return minJornada;
                }
            }
        }
        
        // Si no se encuentra, buscar en ligas existentes
        const firstLeague = await prisma.league.findFirst({
            select: { currentJornada: true }
        });
        
        if (firstLeague?.currentJornada) {
            console.log(`ℹ️  Usando jornada de liga existente: ${firstLeague.currentJornada}`);
            return firstLeague.currentJornada;
        }
        
        // Fallback: jornada 10 (más realista que 9)
        console.log('⚠️  No se pudo detectar jornada actual, usando fallback: 10');
        return 10;
    } catch (error) {
        console.error('❌ Error obteniendo jornada actual desde API:', error);
        
        // Intentar con liga existente como fallback
        const firstLeague = await prisma.league.findFirst({
            select: { currentJornada: true }
        });
        
        return firstLeague?.currentJornada || 10;
    }
}

export const LeagueRepo = {
    create: async (name: string, leaderId: string, code: string, division: string = 'primera', isPremiumParam?: boolean) => {
        // Obtener la jornada actual desde la API de football (Primera División)
        const jornadaFromAPI = await getCurrentJornadaFromAPI();
        
        // Segunda División va 2 jornadas adelante, Primera y Premier usan la misma
        const currentJornada = division === 'segunda' 
            ? jornadaFromAPI + 2  // Segunda División va 2 jornadas adelante
            : jornadaFromAPI;      // Primera y Premier usan la misma jornada
        
        // isPremium viene del parámetro (pago) o si es segunda división/premier (backward compatibility)
        const isPremium = isPremiumParam !== undefined ? isPremiumParam : (division === 'segunda' || division === 'premier');
        console.log(`📅 Creando liga "${name}" (División: ${division})`);
        console.log(`   Jornada Primera: ${primeraJornada}`);
        console.log(`   Jornada asignada: ${currentJornada} (Premium: ${isPremium})`);
        
        // Verificar si hay alguna liga con estado 'closed' (jornada en curso)
        // Si es así, crear esta liga también cerrada para que no puedan hacer cambios hasta la próxima jornada
        const anyClosedLeague = await prisma.league.findFirst({
            where: { jornadaStatus: 'closed' },
            select: { id: true, jornadaStatus: true }
        });
        
        const initialStatus = anyClosedLeague ? 'closed' : 'open';
        console.log(`   Estado inicial: ${initialStatus} (${anyClosedLeague ? 'Jornada en curso' : 'Jornada abierta'})`);
        
        return prisma.league.create({
            data: {
                name,
                code,
                leaderId,
                currentJornada,
                division,
                isPremium,
                jornadaStatus: initialStatus, // ✅ Crear cerrada si hay jornada en curso
                members: { create: { userId: leaderId, points: 0 } },
            } as any,
        });
    },

    deleteIfLeader: (leagueId: string, leaderId: string) =>
        prisma.league.deleteMany({ where: { id: leagueId, leaderId } }),

    getById: (leagueId: string) =>
        prisma.league.findUnique({
            where: { id: leagueId },
            include: { members: { include: { user: true } }, leader: true },
        }),

    getByUserId: async (userId: string) => {
        try {
            // Validar userId
            if (!userId || typeof userId !== 'string' || userId.trim() === '') {
                console.warn('⚠️  getByUserId called with invalid userId:', userId);
                return [];
            }
            
            const leagues = await prisma.league.findMany({
                where: { members: { some: { userId } } },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    division: true,
                    isPremium: true,
                    currentJornada: true,
                    createdAt: true,
                    leader: { select: { id: true, name: true, email: true } },
                    members: { select: { userId: true, points: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            
            console.log(`✅ Found ${leagues.length} leagues for user ${userId}`);
            return leagues || [];
        } catch (error: any) {
            console.error('❌ Error in getByUserId:', error);
            // En caso de error, devolver array vacío en lugar de fallar
            return [];
        }
    },

    getByCode: (code: string) =>
        prisma.league.findFirst({
            where: { code },
            include: { leader: true, members: { include: { user: true } } },
        }),

};
