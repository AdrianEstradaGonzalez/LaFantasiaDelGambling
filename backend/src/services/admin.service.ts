import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

export class AdminService {
  // Get all users
  async getAllUsers() {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
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
    // Obtener la última jornada completada (la mayor con partidos terminados)
    // Usar la lógica de PlayerDetail: para cada jugador, calcular sus puntos de la última jornada real
    // (Aquí simplificamos: para cada jugador, buscar la última jornada con stats y calcular puntos)
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const axios = require('axios');
    const API_BASE = 'https://v3.football.api-sports.io';
    const API_KEY = process.env.FOOTBALL_API_KEY || '099ef4c6c0803639d80207d4ac1ad5da';
    const SEASON = 2025;

    // Buscar la última jornada con partidos terminados
    let lastJornada = 38;
    for (let j = 38; j >= 1; j--) {
      try {
        const { data } = await axios.get(`${API_BASE}/fixtures`, {
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io',
          },
          params: {
            league: 140,
            season: SEASON,
            round: `Regular Season - ${j}`,
          },
        });
        const fixtures = data?.response || [];
        const hasFinished = fixtures.some((f: any) => ['FT','AET','PEN'].includes(f.fixture?.status?.short));
        if (hasFinished) {
          lastJornada = j;
          break;
        }
      } catch {}
    }

    // Obtener todos los jugadores
    const players = await prisma.player.findMany();
    let updated = 0;
    for (const player of players) {
      // Buscar el equipo del jugador
      let teamId = player.teamId;
      if (!teamId) continue;

      // Buscar el fixture de su equipo en la última jornada
      let fixtureId = null;
      try {
        const { data } = await axios.get(`${API_BASE}/fixtures`, {
          headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io',
          },
          params: {
            league: 140,
            season: SEASON,
            round: `Regular Season - ${lastJornada}`,
          },
        });
        const fixtures = data?.response || [];
        const fixture = fixtures.find((f: any) => f.teams?.home?.id === teamId || f.teams?.away?.id === teamId);
        if (fixture) fixtureId = fixture.fixture.id;
      } catch {}
      if (!fixtureId) continue;

      // Buscar stats del jugador en ese fixture
      let playerStats = null;
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
      } catch {}

      // Calcular puntos (misma lógica que PlayerDetail)
      let points = 0;
      if (playerStats && playerStats.games) {
        const minutes = playerStats.games?.minutes || 0;
        if (minutes > 0 && minutes < 45) points += 1;
        else if (minutes >= 45) points += 2;
        const goals = playerStats.goals || {};
        const cards = playerStats.cards || {};
        const penalty = playerStats.penalty || {};
        points += (goals.assists || 0) * 3;
        points -= (cards.yellow || 0) * 1;
        points -= (cards.red || 0) * 3;
        points += (penalty.won || 0) * 2;
        points -= (penalty.committed || 0) * 2;
        points += (penalty.scored || 0) * 3;
        points -= (penalty.missed || 0) * 2;
        // Puedes añadir más reglas aquí si tu lógica de PlayerDetail es más compleja
      }

      await prisma.player.update({
        where: { id: player.id },
        data: {
          lastJornadaPoints: points,
          lastJornadaNumber: lastJornada,
        },
      });
      updated++;
    }
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

      // Prevent deleting admin users
      if (user.isAdmin) {
        throw new AppError(403, 'FORBIDDEN', 'No se puede eliminar un usuario administrador');
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
          code: true,
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
