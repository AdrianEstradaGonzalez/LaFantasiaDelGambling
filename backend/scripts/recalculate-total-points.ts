import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateTotalPoints() {
	try {
		console.log('🔄 Iniciando recálculo del Total acumulado para todos los usuarios...\n');

		// Obtener todas las ligas de Primera División
		const primeraLeagues = await prisma.league.findMany({
			where: { division: 'primera' },
			include: { members: true },
		});

		console.log(`📋 Ligas encontradas: ${primeraLeagues.length}\n`);

		let updatedMembers = 0;

		for (const league of primeraLeagues) {
			console.log(`\n🏆 Liga: ${league.name}`);
			
			for (const member of league.members) {
				// Obtener pointsPerJornada que ya tiene los puntos correctos de cada jornada
				const pointsPerJornada = (member.pointsPerJornada as Record<string, number>) || {};
				
				// Calcular total acumulado sumando todas las jornadas
				const totalPoints = Object.values(pointsPerJornada).reduce((sum, pts) => sum + (pts || 0), 0);

				// Actualizar solo el Total en BD
				await prisma.leagueMember.update({
					where: { leagueId_userId: { leagueId: member.leagueId, userId: member.userId } },
					data: {
						points: totalPoints
					}
				});

				const user = await prisma.user.findUnique({
					where: { id: member.userId },
					select: { name: true, email: true }
				});

				const userName = user?.name || user?.email || 'Usuario';
				const jornadas = Object.keys(pointsPerJornada).sort((a, b) => Number(a) - Number(b));
				const breakdown = jornadas.map(j => `J${j}:${pointsPerJornada[j]}`).join(', ');
				
				console.log(`  ✅ ${userName}: ${totalPoints} pts TOTAL${breakdown ? ` (${breakdown})` : ''}`);
				updatedMembers++;
			}
		}

		console.log(`\n🎉 Recálculo completado. ${updatedMembers} usuarios actualizados\n`);
	} catch (error) {
		console.error('❌ Error en recálculo:', error);
	} finally {
		await prisma.$disconnect();
	}
}

recalculateTotalPoints();

recalculateTotalPoints();
