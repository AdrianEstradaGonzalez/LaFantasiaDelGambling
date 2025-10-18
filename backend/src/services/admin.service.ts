import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

// --- Cálculo de puntos DreamLeague ---
const calculatePlayerPoints = (stats: any, role: string): number => {
  if (!stats) return 0;

  let points = 0;
  const minutes = stats.games?.minutes || 0;

  // BASE GENERAL - Minutos jugados
  if (minutes > 0 && minutes < 45) points += 1;
  if (minutes >= 45) points += 2;

  // --- PORTERO ---
  if (role === "Goalkeeper") {
    points += (stats.goals?.total || 0) * 10;
    points += (stats.goals?.assists || 0) * 3;
    // Bonus solo si juega >= 60 min
    if ((stats.goalkeeper?.conceded || 0) === 0 && (stats.games?.minutes || 0) >= 60) points += 5;
    points += stats.goalkeeper?.saves || 0;
    points -= (stats.goalkeeper?.conceded || 0) * 2;
    points += (stats.penalty?.saved || 0) * 5;
  }

  // --- DEFENSOR ---
  if (role === "Defender") {
    points += (stats.goals?.total || 0) * 6;
    points += (stats.goals?.assists || 0) * 3;
    // Bonus solo si juega >= 60 min
    if ((stats.goals?.conceded || 0) === 0 && (stats.games?.minutes || 0) >= 60) points += 4;
    points += stats.shots?.on || 0;
    points -= stats.goals?.conceded || 0;
    points += Math.floor((stats.duels?.won || 0) / 2);
  }

  // --- MEDIOCAMPISTA ---
  if (role === "Midfielder") {
    points += (stats.goals?.total || 0) * 5;
    points += (stats.goals?.assists || 0) * 3;
    // Bonus solo si juega >= 60 min
    if ((stats.goals?.conceded || 0) === 0 && (stats.games?.minutes || 0) >= 60) points += 1;
    points += stats.shots?.on || 0;
    points -= Math.floor((stats.goals?.conceded || 0) / 2);
    points += Math.floor((stats.passes?.key || 0) / 2);
    points += Math.floor((stats.dribbles?.success || 0) / 2);
    points += Math.floor((stats.fouls?.drawn || 0) / 3);
  }

  // --- DELANTERO ---
  if (role === "Attacker") {
    points += (stats.goals?.total || 0) * 4;
    points += (stats.goals?.assists || 0) * 3;
    points += stats.shots?.on || 0;
    points += Math.floor((stats.passes?.key || 0) / 2);
    points += Math.floor((stats.dribbles?.success || 0) / 2);
    points += Math.floor((stats.fouls?.drawn || 0) / 3);
  }

  // --- BASE GENERAL ---
  points += (stats.penalty?.won || 0) * 2;
  points -= (stats.penalty?.committed || 0) * 2;
  points -= (stats.penalty?.missed || 0) * 2;

  points -= (stats.cards?.yellow || 0);
  points -= (stats.cards?.red || 0) * 3;

  const rating = stats.rating ? parseFloat(stats.rating) : 0;
  if (rating > 8) points += 3;
  else if (rating >= 6.5 && rating <= 8) points += 2;
  else if (rating >= 5) points += 1;

  return points;
};


export class AdminService {
  // Get all users
  async getAllUsers() {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          email: 'asc',
        },
      });

      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new AppError(500, 'ADMIN_ERROR', 'Error obteniendo usuarios');
    }
  }

// Actualizar lastJornadaPoints y lastJornadaNumber de todos los jugadores usando lógica exacta del frontend y jornada.service
async updateAllPlayersLastJornadaPoints(jornada: number) {
  console.log(`[ADMIN] Actualizando puntos jornada ${jornada} (usando lógica frontend/jornada.service)`);

  // Importar helpers de jornada.service
  const { JornadaService } = await import('./jornada.service.js');

  // Detectar la última jornada con partidos terminados
  const lastCompletedJornada = await JornadaService.findLastCompletedJornada(jornada);
  console.log(`[ADMIN] Última jornada completada detectada: ${lastCompletedJornada}`);

  const players = await prisma.player.findMany();
  console.log(`[ADMIN] Total jugadores encontrados: ${players.length}`);

  // API config
  const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: {
      "x-rapidapi-key": process.env.API_FOOTBALL_KEY!,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });

  // Role mapping (frontend logic)
  const normalizePosition = (pos?: string): string | undefined => {
    if (!pos) return undefined;
    const p = pos.trim().toLowerCase();
    if (p === 'goalkeeper' || p.includes('goal') || p.includes('keeper')) return 'Goalkeeper';
    if (p === 'defender' || p.includes('defen') || p.includes('back')) return 'Defender';
    if (p === 'midfielder' || p.includes('midfield') || p.includes('midf') || p === 'mid') return 'Midfielder';
    if (p === 'attacker' || p.includes('attack') || p.includes('forward') || p.includes('striker') || p.includes('wing')) return 'Attacker';
    return undefined;
  };

  let updatedCount = 0;
  for (const player of players) {
    try {
      await new Promise((r) => setTimeout(r, 1200)); // 1.2 segundos entre requests

      // Buscar equipo del jugador
      let playerTeamId: number | undefined = player.teamId as unknown as number;
      if (!playerTeamId) {
        // Fallback: buscar por API
        const infoRes = await api.get("/players", {
          params: {
            id: player.id,
            season: 2025,
            league: 140,
          },
        });
        const info = infoRes.data?.response?.[0]?.statistics?.[0];
        if (info?.team?.id) playerTeamId = info.team.id;
      }
      if (!playerTeamId) {
        console.log(`[WARN] No se pudo determinar el equipo para ${player.name}`);
        continue;
      }

      // Buscar partidos de la jornada
      const fixturesRes = await api.get("/fixtures", {
        params: {
          league: 140,
          season: 2025,
          round: `Regular Season - ${lastCompletedJornada}`,
        },
      });
      const fixtures = fixturesRes.data?.response || [];
      const teamFixture = fixtures.find((f: any) =>
        f.teams?.home?.id === playerTeamId || f.teams?.away?.id === playerTeamId
      );
      if (!teamFixture) {
        console.log(`[WARN] ${player.name} (${playerTeamId}) no tiene partido en jornada ${lastCompletedJornada}`);
        continue;
      }
      const fixtureId = teamFixture.fixture?.id;
      if (!fixtureId) {
        console.log(`[WARN] Sin fixtureId para partido de ${player.name}`);
        continue;
      }

      // Buscar estadísticas del partido
      const statsRes = await api.get("/fixtures/players", {
        params: { fixture: fixtureId },
      });
      const teamsData = statsRes.data?.response || [];
      let playerStats: any = null;
      for (const teamData of teamsData) {
        const playersArr = Array.isArray(teamData?.players) ? teamData.players : [];
        const found = playersArr.find((p: any) => p?.player?.id === player.id);
        if (found?.statistics?.[0]) {
          playerStats = found.statistics[0];
          break;
        }
      }
      if (!playerStats) {
        console.log(`[WARN] No stats para ${player.name} en jornada ${lastCompletedJornada}`);
        continue;
      }

      // Calcular puntos usando lógica frontend
      const role = normalizePosition(player.position);
      const points = calculatePlayerPoints(playerStats, role ?? "Unknown");

  await prisma.player.update({
        where: { id: player.id },
        data: {
          lastJornadaPoints: points,
          lastJornadaNumber: lastCompletedJornada,
        },
      });
      updatedCount++;
      console.log(`[OK] ${player.name}: ${points} pts (jornada ${lastCompletedJornada})`);
    } catch (err: any) {
      if (err.response?.status === 429) {
        console.error(`[API] Rate limit alcanzado. Pausando...`);
        await new Promise((r) => setTimeout(r, 60000));
      } else {
        console.error(`[ERROR] ${player.name}:`, err.message);
      }
    }
  }

  console.log(`[ADMIN] Actualización completada ✅ (${updatedCount} jugadores actualizados para jornada ${lastCompletedJornada})`);
}

  // Delete a user
  async deleteUser(userId: string, requestingUserId: string) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');
      }

      // Prevent self-deletion
      if (userId === requestingUserId) {
        throw new AppError(403, 'FORBIDDEN', 'No puedes eliminarte a ti mismo');
      }

      // Delete user (cascades to squads, league memberships, bets, etc.)
      await prisma.user.delete({
        where: { id: userId },
      });

      return { message: 'Usuario eliminado correctamente' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error deleting user:', error);
      throw new AppError(500, 'ADMIN_ERROR', 'Error eliminando usuario');
    }
  }

  // Get all leagues
  async getAllLeagues() {
    try {
      const leagues = await prisma.league.findMany({
        select: {
          id: true,
          name: true,
          leaderId: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return leagues;
    } catch (error) {
      console.error('Error getting all leagues:', error);
      throw new AppError(500, 'ADMIN_ERROR', 'Error obteniendo ligas');
    }
  }

  // Delete a league
  async deleteLeague(leagueId: string) {
    try {
      // Check if league exists
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
      });

      if (!league) {
        throw new AppError(404, 'NOT_FOUND', 'Liga no encontrada');
      }

      // Delete league (cascades to squads, bets, members, etc.)
      await prisma.league.delete({
        where: { id: leagueId },
      });

      return { message: 'Liga eliminada correctamente' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error deleting league:', error);
      throw new AppError(500, 'ADMIN_ERROR', 'Error eliminando liga');
    }
  }
}

export default new AdminService();
