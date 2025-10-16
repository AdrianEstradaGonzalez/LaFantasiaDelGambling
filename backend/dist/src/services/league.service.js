import { LeagueRepo } from "../repositories/league.repo.js";
import { LeagueMemberRepo } from "../repositories/leagueMember.js";
// Generar código único de 8 caracteres (letras mayúsculas y números)
const generateUniqueCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
export const LeagueService = {
    createLeague: async (name, leaderId) => {
        // Generar código único, reintentar si hay colisión
        let code = generateUniqueCode();
        let attempts = 0;
        while (attempts < 10) {
            try {
                return await LeagueRepo.create(name, leaderId, code);
            }
            catch (error) {
                // Si es error de código duplicado, generar otro
                if (error?.code === 'P2002' && error?.meta?.target?.includes('code')) {
                    code = generateUniqueCode();
                    attempts++;
                }
                else {
                    throw error;
                }
            }
        }
        throw new Error('No se pudo generar un código único');
    },
    deleteLeague: async (leagueId, leaderId) => {
        const res = await LeagueRepo.deleteIfLeader(leagueId, leaderId);
        if (res.count === 0)
            throw new Error("Not leader or league not found");
        return { deleted: true };
    },
    addMember: (leagueId, userId) => LeagueMemberRepo.add(leagueId, userId),
    addMemberByCode: async (code, userId) => {
        const league = await LeagueRepo.getByCode(code);
        if (!league) {
            throw new Error('Código de liga inválido');
        }
        const member = await LeagueMemberRepo.add(league.id, userId);
        return {
            ...member,
            league: {
                id: league.id,
                name: league.name,
                code: league.code
            }
        };
    },
    removeMember: (leagueId, userId) => LeagueMemberRepo.remove(leagueId, userId),
    listMembers: async (leagueId) => {
        // Obtener información de la liga
        const league = await LeagueRepo.getById(leagueId);
        if (!league) {
            throw new Error('Liga no encontrada');
        }
        // Obtener miembros con información de la liga incluida
        const members = await LeagueMemberRepo.listByLeague(leagueId);
        // Agregar información de la liga a cada miembro
        return members.map(member => ({
            ...member,
            league: {
                id: league.id,
                name: league.name,
                code: league.code
            }
        }));
    },
    getLeaguesByUser: (userId) => LeagueRepo.getByUserId(userId),
};
