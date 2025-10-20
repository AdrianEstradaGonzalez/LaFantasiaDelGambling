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
    // Filtrar opciones de "Doble oportunidad" antes de guardar
    const filteredOptions = options.filter(opt => opt.betType !== 'Doble oportunidad');
    
    if (filteredOptions.length < options.length) {
      console.log(`⚠️  Filtradas ${options.length - filteredOptions.length} opciones de "Doble oportunidad"`);
    }

    // Eliminar opciones existentes para esta liga/jornada
    const deleted = await prisma.bet_option.deleteMany({
      where: {
        leagueId,
        jornada,
      },
    });

    if (deleted.count > 0) {
      console.log(`🗑️  Eliminadas ${deleted.count} opciones antiguas de liga ${leagueId}, jornada ${jornada}`);
    }

    // Si no hay opciones después de filtrar, retornar
    if (filteredOptions.length === 0) {
      console.log(`⚠️  No hay opciones válidas para guardar`);
      return {
        success: true,
        created: 0,
      };
    }

    // Crear nuevas opciones con skipDuplicates por si acaso
    const created = await prisma.bet_option.createMany({
      data: filteredOptions.map((opt) => ({
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
      skipDuplicates: true, // Saltar duplicados en lugar de fallar
    });

    console.log(`✅ Guardadas ${created.count} opciones de apuesta para liga ${leagueId}, jornada ${jornada}`);

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
