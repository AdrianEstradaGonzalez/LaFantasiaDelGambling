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
                next: 50 // Obtener próximos partidos para encontrar la jornada actual
            },
            timeout: 5000
        });

        const fixtures = data?.response || [];
        if (fixtures.length > 0) {
            // Buscar el primer partido con estado NS (Not Started) o en juego
            const upcomingMatch = fixtures.find((f: any) => 
                ['NS', '1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(f?.fixture?.status?.short)
            );
            
            if (upcomingMatch && upcomingMatch.league?.round) {
                // Extraer número de jornada de "Regular Season - X"
                const match = upcomingMatch.league.round.match(/Regular Season - (\d+)/);
                if (match && match[1]) {
                    const jornada = parseInt(match[1]);
                    console.log(`✅ Jornada actual detectada desde API: ${jornada}`);
                    return jornada;
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
        const primeraJornada = await getCurrentJornadaFromAPI();
        
        // Segunda división va 1 jornada por delante
        const currentJornada = division === 'segunda' ? primeraJornada + 1 : primeraJornada;
        
        // isPremium viene del parámetro (pago) o si es segunda división (backward compatibility)
        const isPremium = isPremiumParam !== undefined ? isPremiumParam : (division === 'segunda');
        console.log(`📅 Creando liga "${name}" (División: ${division})`);
        console.log(`   Jornada Primera: ${primeraJornada}`);
        console.log(`   Jornada asignada: ${currentJornada} (Premium: ${isPremium})`);
        
        return prisma.league.create({
            data: {
                name,
                code,
                leaderId,
                currentJornada,
                division,
                isPremium,
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

    getByUserId: (userId: string) =>
        prisma.league.findMany({
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
        }),

    getByCode: (code: string) =>
        prisma.league.findFirst({
            where: { code },
            include: { leader: true, members: { include: { user: true } } },
        }),

};
