import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';
import { calculatePlayerPoints as calcPointsFull, calculatePlayerPointsTotal, normalizeRole, type Role } from '../shared/pointsCalculator.js';

const prisma = new PrismaClient();

const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '07bc9c707fe2d6169fff6e17d4a9e6fd';
const LA_LIGA_LEAGUE_ID = 140;
const SEASON = 2025;

const HEADERS = {
	'x-apisports-key': API_KEY,
};

interface PlayerStats {
	playerId: number;
	points: number;
	breakdown: any[];
	fixtureId: number;
	teamId: number;
	rawStats: any;
	position: string;
}

function computePointsWithBreakdown(playerData: any, position: string): { total: number; breakdown: any[] } {
	const stats = playerData.statistics?.[0];
	if (!stats) return { total: 0, breakdown: [] };
	const role = normalizeRole(position) as Role;
	const pointsResult = calcPointsFull(stats, role);
	return { total: pointsResult.total, breakdown: pointsResult.breakdown };
}

async function getLiveMatchesFromCurrentJornada(jornada: number): Promise<any[]> {
	try {
		console.log(`🔍 Buscando partidos en curso de la jornada ${jornada}...`);
		const { data } = await axios.get(`${API_BASE}/fixtures`, {
			headers: HEADERS,
			params: {
				league: LA_LIGA_LEAGUE_ID,
				season: SEASON,
				round: `Regular Season - ${jornada}`,
				live: 'all',
			},
			timeout: 10000,
		});
		const fixtures = data?.response || [];
		console.log(`✅ Encontrados ${fixtures.length} partidos en curso`);
		return fixtures;
	} catch (error) {
		console.error('❌ Error obteniendo partidos en curso:', error);
		return [];
	}
}

async function getFixturePlayerStats(fixtureObj: any): Promise<Map<number, PlayerStats>> {
	try {
		const fixtureId = fixtureObj.fixture?.id || fixtureObj.fixtureId || fixtureObj.id;
		const { data } = await axios.get(`${API_BASE}/fixtures/players`, {
			headers: HEADERS,
			params: { fixture: fixtureId },
			timeout: 10000,
		});

		const teamsData = data?.response || [];
		const playerStatsMap = new Map<number, PlayerStats>();

			// Derivar goles del fixture para poder asignar goles encajados al equipo
			const homeGoals = Number(fixtureObj.goals?.home ?? fixtureObj.goals?.home ?? 0);
			const awayGoals = Number(fixtureObj.goals?.away ?? fixtureObj.goals?.away ?? 0);

		// 🔥 OBTENER PARADAS DEL EQUIPO desde /fixtures/statistics
		// La API no proporciona paradas individuales en /fixtures/players, solo a nivel de equipo
		const teamSaves = new Map<number, number>();
		try {
			const { data: statsData } = await axios.get(`${API_BASE}/fixtures/statistics`, {
				headers: HEADERS,
				params: { fixture: fixtureId },
				timeout: 10000,
			});
			const statistics = statsData?.response || [];
			for (const teamStats of statistics) {
				const teamId = teamStats.team?.id;
				if (!teamId) continue;
				const stats = teamStats.statistics || [];
				const saveStat = stats.find((s: any) => s.type === 'Goalkeeper Saves');
				const saves = saveStat?.value ? parseInt(String(saveStat.value), 10) : 0;
				teamSaves.set(teamId, saves);
			}
		} catch (error) {
			console.error(`⚠️  Error obteniendo estadísticas del equipo para fixture ${fixtureId}:`, error);
		}

			for (const teamData of teamsData) {
			const teamId = teamData.team?.id;
			if (!teamId) continue;
			const players = teamData.players || [];
			for (const playerData of players) {
				const playerId = playerData.player?.id;
				if (!playerId) continue;
				const dbPlayer = await prisma.player.findUnique({
					where: { id: playerId },
					select: { position: true },
				});
				if (!dbPlayer) continue;
						// Build a normalized stats object (same shape used by backfill) and inject team conceded for DEFENDERS
										const apiStats = playerData.statistics?.[0] || {};
										const role = normalizeRole(dbPlayer.position) as Role;

										// Normalize all sub-objects to avoid missing keys and to allow the calculator to read them
										const normalizedStats: any = {
											games: {
												minutes: apiStats.games?.minutes ?? 0,
												position: apiStats.games?.position ?? null,
												rating: apiStats.games?.rating ?? null,
												captain: apiStats.games?.captain ?? false,
												substitute: apiStats.games?.substitute ?? false,
											},
											goals: {
												total: apiStats.goals?.total ?? 0,
												assists: apiStats.goals?.assists ?? 0,
												conceded: apiStats.goals?.conceded ?? 0,
											},
											goalkeeper: {
												saves: apiStats.goalkeeper?.saves ?? apiStats.saves ?? 0,
												conceded: apiStats.goalkeeper?.conceded ?? apiStats.goals?.conceded ?? 0,
											},
											shots: {
												total: apiStats.shots?.total ?? apiStats.shots_total ?? 0,
												on: apiStats.shots?.on ?? apiStats.shots_on ?? 0,
											},
											passes: {
												total: apiStats.passes?.total ?? 0,
												key: apiStats.passes?.key ?? apiStats.key_passes ?? 0,
												accuracy: apiStats.passes?.accuracy ?? null,
											},
											tackles: {
												total: apiStats.tackles?.total ?? 0,
												blocks: apiStats.tackles?.blocks ?? 0,
												interceptions: apiStats.tackles?.interceptions ?? 0,
											},
											duels: {
												total: apiStats.duels?.total ?? 0,
												won: apiStats.duels?.won ?? 0,
											},
											dribbles: {
												attempts: apiStats.dribbles?.attempts ?? 0,
												success: apiStats.dribbles?.success ?? 0,
												past: apiStats.dribbles?.past ?? 0,
											},
											fouls: {
												drawn: apiStats.fouls?.drawn ?? 0,
												committed: apiStats.fouls?.committed ?? 0,
											},
											cards: {
												yellow: apiStats.cards?.yellow ?? 0,
												red: apiStats.cards?.red ?? 0,
											},
											penalty: {
												won: apiStats.penalty?.won ?? 0,
												committed: apiStats.penalty?.committed ?? 0,
												scored: apiStats.penalty?.scored ?? 0,
												missed: apiStats.penalty?.missed ?? 0,
											saved: apiStats.penalty?.saved ?? 0,
										},
									};

									// ✅ SIEMPRE inyectar goles del equipo rival para DEFENSAS
									// La API no proporciona este dato correctamente para defensas, debemos calcularlo del fixture
									// Para porteros la API SÍ lo proporciona correctamente en goalkeeper.conceded
									if (role === 'Defender') {
										const teamIsHome = teamData.team?.id === fixtureObj.teams?.home?.id;
										const teamConceded = teamIsHome ? awayGoals : homeGoals;
										normalizedStats.goals.conceded = teamConceded;
									}

									// 🔥 INYECTAR PARADAS DEL EQUIPO para PORTEROS que jugaron
									// La API /fixtures/players NO proporciona paradas individuales, solo /fixtures/statistics a nivel de equipo
									if (role === 'Goalkeeper' && normalizedStats.games.minutes > 0) {
										const teamSavesValue = teamSaves.get(teamId) ?? 0;
										normalizedStats.goalkeeper.saves = teamSavesValue;
									}

									// Compute points using the normalized stats object
										const pointsResult = calcPointsFull(normalizedStats, role);
						playerStatsMap.set(playerId, {
					playerId,
							points: pointsResult.total,
							breakdown: pointsResult.breakdown,
							fixtureId,
							teamId,
									rawStats: normalizedStats,
					position: dbPlayer.position,
				});
			}
		}

		console.log(`  📊 Calculados puntos de ${playerStatsMap.size} jugadores del partido ${fixtureId}`);
		return playerStatsMap;
		} catch (error) {
			const fid = fixtureObj?.fixture?.id ?? fixtureObj?.id ?? 'unknown';
			console.error(`❌ Error obteniendo stats del partido ${fid}:`, error);
			return new Map();
		}
}

async function savePlayerStatsToDb(
	playerId: number,
	fixtureId: number,
	jornada: number,
	teamId: number,
	rawStats: any,
	points: number,
	breakdown: any[]
): Promise<void> {
	try {
			const statsData = {
			playerId,
			fixtureId,
			jornada,
			season: SEASON,
			teamId,
				totalPoints: points,
				pointsBreakdown: breakdown && breakdown.length ? breakdown : Prisma.JsonNull,
			minutes: rawStats.games?.minutes || 0,
			position: rawStats.games?.position || null,
			rating: rawStats.games?.rating ? String(rawStats.games.rating) : null,
			captain: rawStats.games?.captain || false,
			substitute: rawStats.games?.substitute || false,
			goals: rawStats.goals?.total || 0,
			assists: rawStats.goals?.assists || 0,
			conceded: rawStats.goals?.conceded || 0,
			// Prefer explicit goalkeeper.saves, fallback to rawStats.saves, otherwise try to extract from breakdown if present
			saves: (rawStats.goalkeeper?.saves ?? rawStats.saves ?? (Array.isArray(breakdown) ? (typeof breakdown.find((b: any) => b.label === 'Paradas')?.amount === 'number' ? breakdown.find((b: any) => b.label === 'Paradas')!.amount : undefined) : undefined) ?? 0),
			shotsTotal: rawStats.shots?.total || 0,
			shotsOn: rawStats.shots?.on || 0,
			passesTotal: rawStats.passes?.total || 0,
			passesKey: rawStats.passes?.key || 0,
			passesAccuracy: rawStats.passes?.accuracy ? parseInt(String(rawStats.passes.accuracy), 10) : null,
			tacklesTotal: rawStats.tackles?.total || 0,
			tacklesBlocks: rawStats.tackles?.blocks || 0,
			tacklesInterceptions: rawStats.tackles?.interceptions || 0,
			duelsTotal: rawStats.duels?.total || 0,
			duelsWon: rawStats.duels?.won || 0,
			dribblesAttempts: rawStats.dribbles?.attempts || 0,
			dribblesSuccess: rawStats.dribbles?.success || 0,
			dribblesPast: rawStats.dribbles?.past || 0,
			foulsDrawn: rawStats.fouls?.drawn || 0,
			foulsCommitted: rawStats.fouls?.committed || 0,
			yellowCards: rawStats.cards?.yellow || 0,
			redCards: rawStats.cards?.red || 0,
			penaltyWon: rawStats.penalty?.won || 0,
			penaltyCommitted: rawStats.penalty?.committed || 0,
			penaltyScored: rawStats.penalty?.scored || 0,
			penaltyMissed: rawStats.penalty?.missed || 0,
			// Penalty saved: prefer rawStats.penalty.saved, fallback to breakdown
			penaltySaved: (rawStats.penalty?.saved ?? (Array.isArray(breakdown) ? (typeof breakdown.find((b: any) => b.label === 'Penaltis parados')?.amount === 'number' ? breakdown.find((b: any) => b.label === 'Penaltis parados')!.amount : undefined) : undefined) ?? 0),
			updatedAt: new Date(),
		} as any;

			// Guardar en PlayerStats (fuente de verdad)
		await prisma.playerStats.upsert({
			where: {
				playerId_jornada_season: {
					playerId,
					jornada,
					season: SEASON,
				},
			},
			update: statsData,
			create: statsData,
		});
	} catch (error) {
		console.error(`❌ Error guardando stats del jugador ${playerId}:`, error);
	}
}

function getJornadaFromFixture(fixture: any): number | null {
	try {
		const round = fixture.league?.round || '';
		const match = round.match(/Regular Season - (\d+)/);
		if (match) {
			return parseInt(match[1], 10);
		}
		return null;
	} catch (error) {
		console.error('❌ Error obteniendo jornada del fixture:', error);
		return null;
	}
}

async function getCurrentJornada(): Promise<number | null> {
	try {
		const league = await prisma.league.findFirst({
			where: { division: 'primera' },
			select: { currentJornada: true },
		});

		if (league?.currentJornada) {
			console.log(`📅 Jornada actual obtenida de BD: ${league.currentJornada}`);
			return league.currentJornada;
		}

		console.log('⚠️  No se pudo obtener la jornada actual de la BD');
		return null;
	} catch (error) {
		console.error('❌ Error obteniendo jornada actual:', error);
		return null;
	}
}

export async function updateLiveLeagueRankings() {
	try {
		console.log('\n🚀 Iniciando actualización de rankings EN VIVO...');
		console.log(`⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}\n`);

		const jornada = await getCurrentJornada();
		if (!jornada) {
			console.log('⚠️  No se pudo determinar la jornada actual. Finalizando...\n');
			return;
		}

		const liveFixtures = await getLiveMatchesFromCurrentJornada(jornada);
		if (liveFixtures.length === 0) {
			console.log('⏸️  No hay partidos en curso en la jornada actual. Esperando...\n');
			return;
		}

		console.log(`⚽ Partidos en curso: ${liveFixtures.map((f: any) => `${f.teams.home.name} vs ${f.teams.away.name} (${f.fixture.status.elapsed}')`).join(', ')}\n`);

		const allPlayerStats = new Map<number, PlayerStats>();
			for (const fixture of liveFixtures) {
				const fixtureStats = await getFixturePlayerStats(fixture);
			for (const [playerId, stats] of fixtureStats) {
				if (!allPlayerStats.has(playerId)) {
					allPlayerStats.set(playerId, stats);
				}
			}
		}

		if (allPlayerStats.size === 0) {
			console.log('⚠️  No se obtuvieron estadísticas de jugadores\n');
			return;
		}

		console.log(`✨ Total de jugadores únicos procesados: ${allPlayerStats.size}`);

		console.log('\n💾 Guardando estadísticas EN VIVO en BD...');
		let savedStats = 0;
		for (const [playerId, stats] of allPlayerStats) {
			await savePlayerStatsToDb(
				playerId,
						stats.fixtureId,
						jornada,
						stats.teamId,
						stats.rawStats,
						stats.points,
						stats.breakdown
			);
			savedStats++;
		}
		console.log(`✅ ${savedStats} jugadores actualizados en PlayerStats (EN VIVO)\n`);

		const primeraLeagues = await prisma.league.findMany({
			where: { division: 'primera' },
			include: { members: true },
		});
		console.log(`🏆 Ligas de Primera División encontradas: ${primeraLeagues.length}\n`);

		let updatedMembers = 0;
		for (const league of primeraLeagues) {
			console.log(`\n📋 Procesando liga: ${league.name}`);
			for (const member of league.members) {
				const squad = await prisma.squad.findUnique({
					where: { userId_leagueId: { userId: member.userId, leagueId: member.leagueId } },
					include: { players: { select: { playerId: true, isCaptain: true } } },
				});
				if (!squad) continue;

				let totalPoints = 0;
				for (const squadPlayer of squad.players) {
					const playerStats = allPlayerStats.get(squadPlayer.playerId);
					if (playerStats) {
						const points = squadPlayer.isCaptain ? playerStats.points * 2 : playerStats.points;
						totalPoints += points;
					}
				}

				await prisma.leagueMember.update({
					where: { leagueId_userId: { leagueId: member.leagueId, userId: member.userId } },
					data: { points: totalPoints },
				});

				const user = await prisma.user.findUnique({ where: { id: member.userId }, select: { name: true, email: true } });
				const userName = user?.name || user?.email || 'Usuario';
				console.log(`  ✅ ${userName}: ${totalPoints} puntos EN VIVO`);
				updatedMembers++;
			}
		}

		console.log(`\n🎉 Actualización EN VIVO completada. ${updatedMembers} miembros actualizados\n`);
		console.log('═'.repeat(70));
	} catch (error) {
		console.error('\n❌ Error en updateLiveLeagueRankings:', error);
	}
}