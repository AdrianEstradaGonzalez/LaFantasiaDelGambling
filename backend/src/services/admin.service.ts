import { PrismaClient } from '@prisma/client';
import axios from 'axios';
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
    // Usar los imports ya existentes arriba
    const API_BASE = 'https://v3.football.api-sports.io';
    const API_KEY = process.env.FOOTBALL_API_KEY || '099ef4c6c0803639d80207d4ac1ad5da';
    const SEASON = 2025;

    // Buscar la última jornada real puntuada (la mayor con partidos terminados)
    // 1. Consultar todas las jornadas posibles y buscar la mayor con partidos finalizados
    let lastJornada = 1;
    let maxJornada = 1;
    // Buscar el número máximo de jornada disponible en la API
    try {
      const { data } = await axios.get(`${API_BASE}/fixtures/rounds`, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
        params: {
          league: 140,
          season: SEASON,
        },
      });
      const rounds = data?.response || [];
      console.log('[ADMIN] Rondas encontradas:', rounds);
      const jornadas = rounds
        .map((r: string) => {
          const m = r.match(/Regular Season - (\d+)/);
          return m ? parseInt(m[1]) : null;
        })
        .filter((n: number | null) => n !== null) as number[];
      console.log('[ADMIN] Jornadas numéricas extraídas:', jornadas);
      if (jornadas.length > 0) {
        maxJornada = Math.max(...jornadas);
        console.log('[ADMIN] Jornada máxima detectada:', maxJornada);
      }
    } catch (e) {
      console.log('[ADMIN] Error obteniendo rondas:', e);
    }

    // Buscar desde la jornada más alta hacia atrás la que tenga partidos terminados
    for (let j = maxJornada; j >= 1; j--) {
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
        console.log(`[ADMIN] Jornada ${j}: ${fixtures.length} partidos encontrados.`);
        const finishedFixtures = fixtures.filter((f: any) => ['FT','AET','PEN'].includes(f.fixture?.status?.short));
        console.log(`[ADMIN] Jornada ${j}: ${finishedFixtures.length} partidos terminados.`);
        if (finishedFixtures.length > 0) {
          lastJornada = j;
          console.log(`[ADMIN] Última jornada real puntuada detectada: ${lastJornada}`);
          break;
        }
      } catch (e) {
        console.log(`[ADMIN] Error consultando fixtures de jornada ${j}:`, e);
      }
    }

    // Obtener todos los jugadores
  const players = await prisma.player.findMany();
  console.log(`[ADMIN] Total jugadores encontrados en BD: ${players.length}`);
  let updated = 0;
  for (const player of players) {
      // Buscar el equipo del jugador
      let teamId = player.teamId;
      if (!teamId) {
        console.log(`[ADMIN] Jugador sin teamId:`, player);
        continue;
      }

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
  console.log(`[ADMIN] Jugador ${player.id} (${player.name}): fixtureId encontrado:`, fixtureId);
      } catch (e) {
        console.log(`[ADMIN] Error buscando fixture para jugador ${player.id}:`, e);
      }
      if (!fixtureId) {
  console.log(`[ADMIN] Jugador ${player.id} (${player.name}): sin fixture en jornada ${lastJornada}`);
        continue;
      }

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
            console.log(`[ADMIN] Jugador ${player.id} (${player.name}): stats encontradas.`);
            break;
          }
        }
      } catch (e) {
        console.log(`[ADMIN] Error buscando stats para jugador ${player.id}:`, e);
      }

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
  console.log(`[ADMIN] Jugador ${player.id} (${player.name}): puntos calculados: ${points}`);
      } else {
  console.log(`[ADMIN] Jugador ${player.id} (${player.name}): sin stats en fixture.`);
      }

      await prisma.player.update({
        where: { id: player.id },
        data: {
          lastJornadaPoints: points,
          lastJornadaNumber: lastJornada,
        } as any,
      });
      updated++;
      // Imprimir el primer jugador actualizado por consola
      if (updated === 1) {
        const dbPlayer = await prisma.player.findUnique({ where: { id: player.id } });
        console.log('[ADMIN] Ejemplo de jugador actualizado:', dbPlayer);
      }
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
