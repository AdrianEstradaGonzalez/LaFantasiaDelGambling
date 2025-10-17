import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

export class BetOptionService {
  /**
   * Obtener opciones de apuesta para una liga y jornada
   */
  static async getBetOptions(leagueId: string, jornada: number) {
    const options = await prisma.bet_option.findMany({
      where: {
        leagueId,
        jornada,
      },
      orderBy: [
        { matchId: 'asc' },
        { betType: 'asc' },
      ],
    });

    return options;
  }

  /**
   * Crear/actualizar opciones de apuesta para una liga y jornada
   * Si ya existen opciones para esa liga/jornada, las reemplaza
   */
  static async saveBetOptions(
    leagueId: string,
    jornada: number,
    options: Array<{
      matchId: number;
      homeTeam: string;
      awayTeam: string;
      betType: string;
      betLabel: string;
      odd: number;
    }>
  ) {
    // Eliminar opciones existentes para esta liga/jornada
    await prisma.bet_option.deleteMany({
      where: {
        leagueId,
        jornada,
      },
    });

    // Crear nuevas opciones
    const created = await prisma.bet_option.createMany({
      data: options.map((opt) => ({
        id: `${leagueId}_${jornada}_${opt.matchId}_${opt.betType}_${opt.betLabel}`.replace(/\s+/g, '_'),
        leagueId,
        jornada,
        matchId: opt.matchId,
        homeTeam: opt.homeTeam,
        awayTeam: opt.awayTeam,
        betType: opt.betType,
        betLabel: opt.betLabel,
        odd: opt.odd,
      })),
    });

    return {
      success: true,
      created: created.count,
    };
  }

  /**
   * Verificar si una liga tiene opciones de apuesta para una jornada
   */
  static async hasOptions(leagueId: string, jornada: number): Promise<boolean> {
    const count = await prisma.bet_option.count({
      where: {
        leagueId,
        jornada,
      },
    });

    return count > 0;
  }
}
