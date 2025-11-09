import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanPointsPerJornada() {
	try {
		console.log('🧹 Limpiando puntos incorrectos de jornadas 1-10...\n');

		// 1. Obtener TODOS los LeagueMember
		const allMembers = await prisma.leagueMember.findMany({
			include: {
				user: { select: { name: true, email: true } },
				league: { select: { name: true } }
			}
		});

		console.log(`📋 Total de miembros encontrados: ${allMembers.length}\n`);

		let updatedCount = 0;

		for (const member of allMembers) {
			const currentPointsPerJornada = (member.pointsPerJornada as any) || {};
			
			// Limpiar jornadas 1-10 (poner a 0)
			const cleanedPointsPerJornada: any = {};
			
			// Jornadas 1-10: forzar a 0
			for (let j = 1; j <= 10; j++) {
				cleanedPointsPerJornada[j.toString()] = 0;
			}
			
			// Jornadas 11-38: mantener el valor existente o 0 si no existe
			for (let j = 11; j <= 38; j++) {
				cleanedPointsPerJornada[j.toString()] = currentPointsPerJornada[j.toString()] || 0;
			}
			
			// Calcular nuevo total (suma de TODAS las jornadas)
			let newTotal = 0;
			for (let j = 1; j <= 38; j++) {
				newTotal += cleanedPointsPerJornada[j.toString()] || 0;
			}
			
			// Actualizar en BD
			await prisma.leagueMember.update({
				where: { 
					leagueId_userId: { 
						leagueId: member.leagueId, 
						userId: member.userId 
					} 
				},
				data: {
					pointsPerJornada: cleanedPointsPerJornada,
					points: newTotal
				}
			});
			
			const userName = member.user.name || member.user.email;
			const leagueName = member.league.name;
			
			console.log(
				`✅ [${leagueName}] ${userName}: ` +
				`Total=${newTotal} pts ` +
				`(J11=${cleanedPointsPerJornada['11']}, J12=${cleanedPointsPerJornada['12']})`
			);
			
			updatedCount++;
		}

		console.log(`\n🎉 Limpieza completada. ${updatedCount} miembros actualizados.\n`);
		console.log('✅ Jornadas 1-10: forzadas a 0');
		console.log('✅ Jornadas 11-38: mantenidas');
		console.log('✅ Total: recalculado como suma de todas las jornadas\n');
		
	} catch (error) {
		console.error('❌ Error en limpieza:', error);
	} finally {
		await prisma.$disconnect();
	}
}

cleanPointsPerJornada();
