import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

function calculatePlayerPointsBackend(stats: any, role: string): number {
  if (!stats) return 0;

  let points = 0;
  const minutes = stats.games?.minutes || 0;

  // BASE GENERAL
  if (minutes > 0 && minutes < 45) points += 1;
  if (minutes >= 45) points += 2;

  if (role === 'Goalkeeper') {
    points += (stats.goals?.total || 0) * 10;
    points += (stats.goals?.assists || 0) * 3;
    if ((stats.goalkeeper?.conceded || 0) === 0) points += 5;
    points += (stats.goalkeeper?.saves || 0);
    points -= (stats.goalkeeper?.conceded || 0) * 2;
    points += (stats.penalty?.saved || 0) * 5;
  }

  if (role === 'Defender') {
    points += (stats.goals?.total || 0) * 6;
    points += (stats.goals?.assists || 0) * 3;
    if ((stats.goals?.conceded || 0) === 0) points += 4;
    points += (stats.shots?.on || 0);
    points -= (stats.goals?.conceded || 0);
    points += Math.floor((stats.duels?.won || 0) / 2);
  }

  if (role === 'Midfielder') {
    points += (stats.goals?.total || 0) * 5;
    points += (stats.goals?.assists || 0) * 3;
    if ((stats.goals?.conceded || 0) === 0) points += 1;
    points += (stats.shots?.on || 0);
    points -= Math.floor((stats.goals?.conceded || 0) / 2);
    points += Math.floor((stats.passes?.key || 0) / 2);
    points += Math.floor((stats.dribbles?.success || 0) / 2);
    points += Math.floor((stats.fouls?.drawn || 0) / 3);
  }

  if (role === 'Attacker') {
    points += (stats.goals?.total || 0) * 4;
    points += (stats.goals?.assists || 0) * 3;
    points += (stats.shots?.on || 0);
    points += Math.floor((stats.passes?.key || 0) / 2);
    points += Math.floor((stats.dribbles?.success || 0) / 2);
    points += Math.floor((stats.fouls?.drawn || 0) / 3);
  }

  // BASE GENERAL - Penaltis
  points += (stats.penalty?.won || 0) * 2;
  points -= (stats.penalty?.committed || 0) * 2;
  points -= (stats.penalty?.missed || 0) * 2;

  // BASE GENERAL - Tarjetas
  points -= (stats.cards?.yellow || 0);
  points -= (stats.cards?.red || 0) * 3;

  // BASE GENERAL - Rating
  const rating = stats.rating ? parseFloat(stats.rating) : 0;
  if (rating > 8) points += 3;
  else if (rating >= 6.5 && rating <= 8) points += 2;
  else if (rating >= 5) points += 1;

  return points;
}


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

  // Actualizar lastJornadaPoints y lastJornadaNumber de todos los jugadores
async updateAllPlayersLastJornadaPoints() {
  const API_BASE = 'https://v3.football.api-sports.io';
  const API_KEY = process.env.FOOTBALL_API_KEY || '099ef4c6c0803639d80207d4ac1ad5da';
  const SEASON = 2025;

  // --- 1️⃣ Buscar la última jornada completada ---
  let lastJornada = 1;
  try {
    const { data } = await axios.get(`${API_BASE}/fixtures/rounds`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
      params: { league: 140, season: SEASON },
    });
    const jornadas = (data?.response || [])
      .map((r: string) => {
        const m = r.match(/Regular Season - (\d+)/);
        return m ? parseInt(m[1]) : null;
      })
      .filter(Boolean) as number[];

    for (let j = Math.max(...jornadas); j >= 1; j--) {
      const { data: fx } = await axios.get(`${API_BASE}/fixtures`, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
        params: { league: 140, season: SEASON, round: `Regular Season - ${j}` },
      });
      const fixtures = fx?.response || [];
      const finished = fixtures.filter((f: any) =>
        ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short)
      );
      if (finished.length > 0) {
        lastJornada = j;
        break;
      }
    }
  } catch (e) {
    console.log('[ADMIN] Error detectando última jornada:', e);
  }

  // --- 2️⃣ Obtener todos los jugadores ---
  const players = await prisma.player.findMany();
  console.log(`[ADMIN] Total jugadores encontrados: ${players.length}`);

  let updated = 0;

  // --- 3️⃣ Para cada jugador, calcular puntos usando la MISMA lógica del front ---
  for (const player of players) {
    const teamId = player.teamId;
    const role = player.position; // o el campo que uses ('Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker')

    if (!teamId) continue;

    // Buscar el fixture de su equipo en la jornada
    let fixtureId = null;
    try {
      const { data } = await axios.get(`${API_BASE}/fixtures`, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
        params: { league: 140, season: SEASON, round: `Regular Season - ${lastJornada}` },
      });
      const fixtures = data?.response || [];
      const fixture = fixtures.find(
        (f: any) => f.teams?.home?.id === teamId || f.teams?.away?.id === teamId
      );
      if (fixture) fixtureId = fixture.fixture.id;
    } catch (e) {
      console.log(`[ADMIN] Error buscando fixture de ${player.name}:`, e);
    }

    if (!fixtureId) continue;

    // Buscar stats del jugador
    let playerStats: any = null;
    try {
      const { data } = await axios.get(`${API_BASE}/fixtures/players`, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
        params: { fixture: fixtureId },
      });
      const teamsData = data?.response || [];
      for (const teamData of teamsData) {
        const found = (teamData.players || []).find((p: any) => p.player?.id === player.id);
        if (found?.statistics?.[0]) {
          playerStats = found.statistics[0];
          break;
        }
      }
    } catch (e) {
      console.log(`[ADMIN] Error obteniendo stats de ${player.name}:`, e);
    }

    const points = calculatePlayerPointsBackend(playerStats, role);

    await prisma.player.update({
      where: { id: player.id },
      data: { lastJornadaPoints: points, lastJornadaNumber: lastJornada },
    });

    updated++;
  }

  console.log(`[ADMIN] Total jugadores actualizados: ${updated}`);
  return { updatedPlayers: updated, lastJornada };
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
