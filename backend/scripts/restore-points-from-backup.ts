import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const SEASON = 2025;

interface BackupSquadPlayer {
	squadId: string;
	playerId: number;
	isCaptain: boolean;
}

interface BackupSquad {
	id: string;
	userId: string;
	leagueId: string;
}

async function restorePointsFromBackup() {
	try {
		console.log('🔄 Restaurando puntos desde backup...\n');

		// 1. Leer backup JSON
		const backupPath = path.join(__dirname, '../backups/full-backup-2025-11-03T22-58-27.json');
		console.log(`📂 Leyendo backup: ${backupPath}`);
		
		const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
		const squads: BackupSquad[] = backupData.tables.squads || [];
		const squadPlayers: BackupSquadPlayer[] = backupData.tables.squadPlayers || [];
		
		console.log(`✅ Backup cargado: ${squads.length} plantillas, ${squadPlayers.length} jugadores\n`);

		// 2. Agrupar jugadores por squad
		const playersBySquad = new Map<string, BackupSquadPlayer[]>();
		for (const sp of squadPlayers) {
			if (!playersBySquad.has(sp.squadId)) {
				playersBySquad.set(sp.squadId, []);
			}
			playersBySquad.get(sp.squadId)!.push(sp);
		}

		// 3. Obtener ligas de Primera División
		const primeraLeagues = await prisma.league.findMany({
			where: { division: 'primera' },
			include: { members: true },
		});

		console.log(`📋 Ligas encontradas: ${primeraLeagues.length}\n`);

		let updatedMembers = 0;

		for (const league of primeraLeagues) {
			console.log(`\n🏆 Liga: ${league.name}`);
			
			for (const member of league.members) {
				// Encontrar la plantilla del backup para este usuario/liga
				const squad = squads.find(s => s.userId === member.userId && s.leagueId === member.leagueId);
				
				if (!squad) {
					console.log(`  ⚠️  No se encontró plantilla en backup para usuario ${member.userId}`);
					continue;
				}

				const players = playersBySquad.get(squad.id) || [];
				
				if (players.length === 0) {
					console.log(`  ⚠️  Plantilla vacía en backup para usuario ${member.userId}`);
					continue;
				}

				// Calcular puntos para jornada 11 y 12 con la plantilla del backup
				const pointsByJornada: Record<number, number> = {};

				// Inicializar TODAS las jornadas a 0 (1-38)
				for (let j = 1; j <= 38; j++) {
					pointsByJornada[j] = 0;
				}

				// Calcular solo jornadas 11 y 12
				for (const jornada of [11, 12]) {
					let jornadaPoints = 0;

					for (const sp of players) {
						// Obtener stats del jugador en esta jornada
						const playerStats = await prisma.playerStats.findUnique({
							where: {
								playerId_jornada_season: {
									playerId: sp.playerId,
									jornada: jornada,
									season: SEASON
								}
							},
							select: { totalPoints: true }
						});

						if (playerStats) {
							const points = sp.isCaptain ? playerStats.totalPoints * 2 : playerStats.totalPoints;
							jornadaPoints += points;
						}
					}

					pointsByJornada[jornada] = jornadaPoints;
				}

				// Calcular total acumulado (solo J11 + J12)
				const totalPoints = pointsByJornada[11] + pointsByJornada[12];

				// Preparar pointsPerJornada
				const pointsPerJornada: Record<string, number> = {};
				for (const [jornada, points] of Object.entries(pointsByJornada)) {
					pointsPerJornada[jornada] = points;
				}

				// Actualizar en BD
				await prisma.leagueMember.update({
					where: { leagueId_userId: { leagueId: member.leagueId, userId: member.userId } },
					data: {
						points: totalPoints,
						pointsPerJornada: pointsPerJornada
					}
				});

				const user = await prisma.user.findUnique({
					where: { id: member.userId },
					select: { name: true, email: true }
				});

				const userName = user?.name || user?.email || 'Usuario';
				const leagueName = league.name;
				console.log(`  ✅ [${leagueName}] ${userName}: ${totalPoints} pts TOTAL (J11:${pointsByJornada[11]}, J12:${pointsByJornada[12]})`);
				updatedMembers++;
			}
		}

		console.log(`\n🎉 Restauración completada. ${updatedMembers} usuarios actualizados\n`);
	} catch (error) {
		console.error('❌ Error en restauración:', error);
	} finally {
		await prisma.$disconnect();
	}
}

restorePointsFromBackup();
