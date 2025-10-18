import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { AppError } from '../utils/errors.js';
import { calculatePlayerPoints, normalizeRole } from './playerPoints.service.js';

const prisma = new PrismaClient();

const FOOTBALL_API_BASE = 'https://v3.football.api-sports.io';
const FALLBACK_APISPORTS_KEY = '099ef4c6c0803639d80207d4ac1ad5da';
const DEFAULT_REQUEST_DELAY_MS = Number(process.env.FOOTBALL_API_DELAY_MS ?? 350);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildFootballApiHeaders() {
  const apiSportsKey =
    process.env.FOOTBALL_API_KEY ||
    process.env.APISPORTS_API_KEY ||
    process.env.API_FOOTBALL_KEY ||
    process.env.APISPORTS_KEY;

  if (apiSportsKey) {
    return { 'x-apisports-key': apiSportsKey };
  }

  const rapidKey =
    process.env.RAPIDAPI_KEY ||
    process.env.RAPIDAPI_FOOTBALL_KEY ||
    process.env.API_FOOTBALL_RAPID_KEY;

  if (rapidKey) {
    return {
      'x-rapidapi-key': rapidKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    };
  }

  return { 'x-apisports-key': FALLBACK_APISPORTS_KEY };
}

const FOOTBALL_API_HEADERS = buildFootballApiHeaders();

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
    baseURL: FOOTBALL_API_BASE,
    headers: FOOTBALL_API_HEADERS,
    timeout: 15000,
  });

  // Role mapping (frontend logic)
  let updatedCount = 0;
  for (const player of players) {
    try {
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
      const role = normalizeRole(player.position ?? playerStats?.games?.position);
      const points = calculatePlayerPoints(playerStats, role);

      await prisma.player.update({
        where: { id: player.id },
        data: {
          lastJornadaPoints: points,
          lastJornadaNumber: lastCompletedJornada,
        },
      });
      updatedCount++;
      console.log(`[OK] ${player.name}: ${points} pts (jornada ${lastCompletedJornada})`);
      if (DEFAULT_REQUEST_DELAY_MS > 0) {
        await delay(DEFAULT_REQUEST_DELAY_MS);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        console.error(`[API] Rate limit alcanzado. Pausando...`);
        await delay(60000);
        continue;
      }
      if (status === 403) {
        console.error(`[API] Acceso denegado para la API de fútbol. Revisa la API key configurada.`);
        throw new AppError(502, 'FOOTBALL_API_FORBIDDEN', 'La API de fútbol rechazó la petición (403). Revisa la API key configurada en el backend.');
      } else {
        console.error(`[ERROR] ${player.name}:`, err?.message || err);
      }
      if (DEFAULT_REQUEST_DELAY_MS > 0) {
        await delay(DEFAULT_REQUEST_DELAY_MS);
      }
    }
  }

  console.log(`[ADMIN] Actualización completada ✅ (${updatedCount} jugadores actualizados para jornada ${lastCompletedJornada})`);
  return { updatedPlayers: updatedCount, processedJornada: lastCompletedJornada };
}

  async updatePlayersPointsFromCurrentJornada() {
    const leagues = await prisma.league.findMany({
      select: { currentJornada: true },
    });

    if (!leagues.length) {
      throw new AppError(404, 'NO_LEAGUES', 'No hay ligas registradas');
    }

    const jornadas = leagues
      .map((league) => Number(league.currentJornada))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!jornadas.length) {
      throw new AppError(400, 'NO_JORNADA', 'No hay jornadas configuradas en las ligas');
    }

    const requestedJornada = Math.max(...jornadas);
    const summary = await this.updateAllPlayersLastJornadaPoints(requestedJornada);

    return {
      requestedJornada,
      updatedPlayers: summary?.updatedPlayers ?? 0,
      processedJornada: summary?.processedJornada ?? requestedJornada,
    };
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
