import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const LeagueMemberRepo = {
    add: async (leagueId, userId) => {
        // Verificar si el usuario ya es miembro
        const existingMember = await prisma.leagueMember.findUnique({
            where: { leagueId_userId: { leagueId, userId } }
        });
        if (existingMember) {
            return existingMember; // Si ya es miembro, devolver el registro existente
        }
        // Contar miembros actuales en la liga
        const memberCount = await prisma.leagueMember.count({
            where: { leagueId }
        });
        // Validar límite de 20 usuarios
        if (memberCount >= 20) {
            throw new Error('Liga completa. Esta liga ya tiene el máximo de 20 usuarios');
        }
        // Inicializar pointsPerJornada con todas las jornadas a 0 (1-38)
        const initialPointsPerJornada = {};
        for (let i = 1; i <= 38; i++) {
            initialPointsPerJornada[i.toString()] = 0;
        }
        return prisma.leagueMember.create({
            data: {
                leagueId,
                userId,
                pointsPerJornada: initialPointsPerJornada
            }
        });
    },
    remove: (leagueId, userId) => prisma.leagueMember.deleteMany({ where: { leagueId, userId } }),
    listByLeague: (leagueId) => prisma.leagueMember.findMany({
        where: { leagueId },
        include: {
            user: true,
            league: { select: { id: true, name: true, code: true } }
        },
        orderBy: { points: "desc" },
    }),
};
