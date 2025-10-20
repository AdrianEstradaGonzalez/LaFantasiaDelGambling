import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import axios from 'axios';

const prisma = new PrismaClient();

// Configuración de la API de fútbol
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const HEADERS = {
  'x-rapidapi-key': API_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io',
};
const LA_LIGA_LEAGUE_ID = 140;
const CURRENT_SEASON = 2025;

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
   * 
   * RESTRICCIÓN CRÍTICA:
   * - Para cada (leagueId, matchId): máximo 3 apuestas de betType "Resultado"
   * - Para cada (leagueId, matchId): máximo 2 apuestas de cualquier otro betType
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
    console.log(`\n🔍 Iniciando validación de ${options.length} opciones para liga ${leagueId}, jornada ${jornada}`);
    
    // PASO 1: Filtrar "Doble oportunidad"
    let validOptions = options.filter(opt => opt.betType !== 'Doble oportunidad');
    
    if (validOptions.length < options.length) {
      console.log(`⚠️  Filtradas ${options.length - validOptions.length} opciones de "Doble oportunidad"`);
    }

    // PASO 2: Deduplicación por (matchId, betType, betLabel)
    const uniqueMap = new Map<string, typeof validOptions[0]>();
    for (const opt of validOptions) {
      const key = `${opt.matchId}_${opt.betType}_${opt.betLabel.toLowerCase().trim()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, opt);
      }
    }
    validOptions = Array.from(uniqueMap.values());
    
    if (uniqueMap.size < options.length) {
      console.log(`🔄 Deduplicadas ${options.length - uniqueMap.size} opciones idénticas`);
    }

    // PASO 3: Agrupar por (leagueId, matchId, betType) y aplicar límites
    const groupedByMatchAndType = new Map<string, typeof validOptions>();
    
    for (const opt of validOptions) {
      // Usar separador único que no aparezca en los datos
      const key = `${leagueId}|||${opt.matchId}|||${opt.betType}`;
      if (!groupedByMatchAndType.has(key)) {
        groupedByMatchAndType.set(key, []);
      }
      groupedByMatchAndType.get(key)!.push(opt);
    }

    // Aplicar límites: Resultado=3, Otros=2
    const limitedOptions: typeof validOptions = [];
    let totalDiscarded = 0;

    for (const [key, opts] of groupedByMatchAndType.entries()) {
      const [, matchId, betType] = key.split('|||');
      const limit = betType === 'Resultado' ? 3 : 2;
      
      if (opts.length > limit) {
        const discarded = opts.length - limit;
        totalDiscarded += discarded;
        console.log(
          `⚠️  Liga ${leagueId}, Match ${matchId}, Tipo "${betType}": ` +
          `${opts.length} opciones encontradas, límite: ${limit}. ` +
          `Descartando ${discarded} opciones.`
        );
        console.log(`   ✅ Manteniendo: ${opts.slice(0, limit).map(o => o.betLabel).join(', ')}`);
        console.log(`   ❌ Descartando: ${opts.slice(limit).map(o => o.betLabel).join(', ')}`);
        limitedOptions.push(...opts.slice(0, limit));
      } else {
        limitedOptions.push(...opts);
      }
    }

    if (totalDiscarded > 0) {
      console.log(`� Total de opciones descartadas por límites: ${totalDiscarded}`);
    }

    // PASO 4: Verificación final de restricciones (sin lanzar error)
    const finalCheck = new Map<string, Map<string, number>>();
    
    for (const opt of limitedOptions) {
      const matchKey = `${leagueId}_${opt.matchId}`;
      if (!finalCheck.has(matchKey)) {
        finalCheck.set(matchKey, new Map());
      }
      const typeMap = finalCheck.get(matchKey)!;
      typeMap.set(opt.betType, (typeMap.get(opt.betType) || 0) + 1);
    }

    // Validar y filtrar opciones que excedan los límites
    const safeOptions: typeof limitedOptions = [];
    const countByMatchAndType = new Map<string, number>();
    
    for (const opt of limitedOptions) {
      const key = `${leagueId}_${opt.matchId}_${opt.betType}`;
      const currentCount = countByMatchAndType.get(key) || 0;
      const limit = opt.betType === 'Resultado' ? 3 : 2;
      
      if (currentCount < limit) {
        safeOptions.push(opt);
        countByMatchAndType.set(key, currentCount + 1);
      } else {
        console.warn(
          `⚠️  Opción descartada por límite: Liga ${leagueId}, Match ${opt.matchId}, ` +
          `Tipo "${opt.betType}", Label "${opt.betLabel}" (ya hay ${limit} opciones)`
        );
      }
    }

    // Si no hay opciones después de validar, retornar
    if (safeOptions.length === 0) {
      console.log(`⚠️  No hay opciones válidas para guardar después de validación`);
      return {
        success: true,
        created: 0,
        message: 'No se crearon apuestas porque todas excedían los límites permitidos',
      };
    }
    
    console.log(`✅ ${safeOptions.length} opciones validadas y listas para guardar`);

    // PASO 5: Eliminar opciones existentes para esta liga/jornada
    const deleted = await prisma.bet_option.deleteMany({
      where: {
        leagueId,
        jornada,
      },
    });

    if (deleted.count > 0) {
      console.log(`🗑️  Eliminadas ${deleted.count} opciones antiguas`);
    }

    // PASO 6: Crear nuevas opciones con las opciones seguras
    const created = await prisma.bet_option.createMany({
      data: safeOptions.map((opt) => ({
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
      skipDuplicates: true,
    });

    console.log(`✅ Guardadas ${created.count} opciones de apuesta validadas\n`);

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

  /**
   * Generar opciones de apuesta automáticamente para una liga y jornada
   * REGLA: 1 APUESTA por partido (1 tipo de bet con sus opciones complementarias)
   * Ejemplo: "Goles totales" con opciones "Más de 2.5" y "Menos de 2.5"
   */
  static async generateBetOptions(leagueId: string, jornada: number) {
    console.log(`\n🎲 Iniciando generación de apuestas para liga ${leagueId}, jornada ${jornada}`);

    try {
      // 1. Obtener partidos de la jornada desde la API
      const { data } = await axios.get(`${API_BASE}/fixtures`, {
        headers: HEADERS,
        timeout: 10000,
        params: {
          league: LA_LIGA_LEAGUE_ID,
          season: CURRENT_SEASON,
          round: `Regular Season - ${jornada}`,
        },
      });

      const fixtures = data?.response || [];
      
      if (fixtures.length === 0) {
        console.log(`⚠️  No se encontraron partidos para la jornada ${jornada}`);
        return {
          success: true,
          created: 0,
          message: 'No hay partidos disponibles para esta jornada',
        };
      }

      console.log(`✅ Encontrados ${fixtures.length} partidos para la jornada ${jornada}`);

      // 2. Obtener TODAS las odds de la jornada en UNA SOLA petición
      console.log(`📡 Obteniendo odds de todos los partidos en una sola petición...`);
      let oddsMap = new Map<number, any>(); // matchId -> odds data
      
      try {
        const { data: oddsData } = await axios.get(`${API_BASE}/odds`, {
          headers: HEADERS,
          timeout: 15000,
          params: {
            league: LA_LIGA_LEAGUE_ID,
            season: CURRENT_SEASON,
            bookmaker: 8, // Bet365
          },
        });

        const oddsResponse = oddsData?.response || [];
        console.log(`✅ Recibidas odds de ${oddsResponse.length} partidos`);

        // Mapear odds por fixture ID
        for (const oddsItem of oddsResponse) {
          const fixtureId = oddsItem?.fixture?.id;
          if (fixtureId) {
            oddsMap.set(fixtureId, oddsItem);
          }
        }
      } catch (err: any) {
        console.warn(`⚠️  Error obteniendo odds masivas, se usarán apuestas sintéticas:`, err?.message);
      }

      // 3. Para cada partido, generar 1 apuesta con sus opciones
      const allBets: Array<{
        matchId: number;
        homeTeam: string;
        awayTeam: string;
        betType: string;
        betLabel: string;
        odd: number;
      }> = [];

      // Tipos de apuestas disponibles (se elegirá 1 por partido)
      const betTypes = ['Goles totales', 'Resultado', 'Ambos marcan', 'Córners', 'Tarjetas'];
      let betTypeIndex = 0;

      for (const fixture of fixtures) {
        const matchId = fixture.fixture.id;
        const homeTeam = fixture.teams.home.name;
        const awayTeam = fixture.teams.away.name;

        console.log(`🔍 Generando 1 apuesta para ${homeTeam} vs ${awayTeam}...`);

        // Elegir el tipo de apuesta para este partido (rotación)
        const selectedBetType = betTypes[betTypeIndex % betTypes.length];
        betTypeIndex++;

        console.log(`   📌 Tipo seleccionado: "${selectedBetType}"`);

        // Buscar odds del partido en el mapa
        const oddsItem = oddsMap.get(matchId);
        const bookmaker = oddsItem?.bookmakers?.[0];
        const bets = bookmaker?.bets ?? [];

        let foundOdds = false;

        if (bets.length > 0) {
          // Buscar el tipo de apuesta seleccionado
          for (const bet of bets) {
            const betId = bet.id;
            const values = bet.values ?? [];

            // Mapear betId al tipo seleccionado
            let matches = false;
            if (selectedBetType === 'Resultado' && betId === 1) matches = true;
            else if (selectedBetType === 'Goles totales' && betId === 5) matches = true;
            else if (selectedBetType === 'Ambos marcan' && betId === 8) matches = true;
            else if (selectedBetType === 'Córners' && betId === 61) matches = true;
            else if (selectedBetType === 'Tarjetas' && betId === 52) matches = true;

            if (matches) {
              // Procesar todas las opciones de este tipo
              for (const v of values) {
                const odd = parseFloat(v.odd);
                if (isNaN(odd)) continue;

                let label = '';

                // Generar el label apropiado
                if (selectedBetType === 'Resultado') {
                  if (v.value === 'Home') label = `Ganará ${homeTeam}`;
                  else if (v.value === 'Draw') label = 'Empate';
                  else if (v.value === 'Away') label = `Ganará ${awayTeam}`;
                } else if (selectedBetType === 'Goles totales') {
                  const number = v.value.match(/[\d.]+/)?.[0];
                  label = v.value.toLowerCase().includes('over')
                    ? `Más de ${number} goles`
                    : `Menos de ${number} goles`;
                } else if (selectedBetType === 'Ambos marcan') {
                  label = v.value === 'Yes'
                    ? 'Ambos equipos marcarán'
                    : 'Al menos un equipo no marcará';
                } else if (selectedBetType === 'Córners') {
                  const number = v.value.match(/[\d.]+/)?.[0];
                  label = v.value.toLowerCase().includes('over')
                    ? `Más de ${number} córners`
                    : `Menos de ${number} córners`;
                } else if (selectedBetType === 'Tarjetas') {
                  const number = v.value.match(/[\d.]+/)?.[0];
                  label = v.value.toLowerCase().includes('over')
                    ? `Más de ${number} tarjetas`
                    : `Menos de ${number} tarjetas`;
                }

                if (label) {
                  allBets.push({
                    matchId,
                    homeTeam,
                    awayTeam,
                    betType: selectedBetType,
                    betLabel: label,
                    odd,
                  });
                  foundOdds = true;
                }
              }

              if (foundOdds) {
                console.log(`   ✅ Generadas ${allBets.filter(b => b.matchId === matchId).length} opciones de "${selectedBetType}"`);
                break; // Ya encontramos este tipo, no seguir buscando
              }
            }
          }
        }

        // Si no se encontraron odds, generar sintéticas
        if (!foundOdds) {
          console.warn(`   ⚠️  No se encontraron odds de "${selectedBetType}", usando sintéticas`);
          const syntheticBets = this.generateSyntheticBetsOfType(matchId, homeTeam, awayTeam, selectedBetType);
          allBets.push(...syntheticBets);
        }
      }

      console.log(`📊 Total de apuestas generadas: ${allBets.length}`);
      console.log(`📊 Partidos procesados: ${fixtures.length}`);
      console.log(`📊 Opciones por partido: ${(allBets.length / fixtures.length).toFixed(1)} promedio`);

      // 4. Guardar apuestas (el método saveBetOptions ya hace la validación y limitación)
      const result = await this.saveBetOptions(leagueId, jornada, allBets);

      console.log(`✅ Generación completada: ${result.created} opciones guardadas\n`);

      return result;
    } catch (error: any) {
      console.error('❌ Error generando apuestas:', error);
      throw new AppError(500, 'GENERATION_ERROR', `Error al generar apuestas: ${error.message}`);
    }
  }

  /**
   * Generar apuestas sintéticas de un tipo específico
   */
  private static generateSyntheticBetsOfType(
    matchId: number,
    homeTeam: string,
    awayTeam: string,
    type: string
  ) {
    const baseOdd = 1.5 + Math.random() * 1.0;
    const bets: any[] = [];

    if (type === 'Resultado') {
      bets.push(
        { matchId, homeTeam, awayTeam, betType: type, betLabel: `Ganará ${homeTeam}`, odd: parseFloat(baseOdd.toFixed(2)) },
        { matchId, homeTeam, awayTeam, betType: type, betLabel: 'Empate', odd: parseFloat((baseOdd + 0.3).toFixed(2)) },
        { matchId, homeTeam, awayTeam, betType: type, betLabel: `Ganará ${awayTeam}`, odd: parseFloat((baseOdd + 0.2).toFixed(2)) }
      );
    } else if (type === 'Goles totales') {
      const thresholds = [0.5, 1.5, 2.5, 3.5];
      const n = thresholds[Math.floor(Math.random() * thresholds.length)];
      bets.push(
        { matchId, homeTeam, awayTeam, betType: type, betLabel: `Más de ${n} goles`, odd: parseFloat(baseOdd.toFixed(2)) },
        { matchId, homeTeam, awayTeam, betType: type, betLabel: `Menos de ${n} goles`, odd: parseFloat((2.5 - (baseOdd - 1.5)).toFixed(2)) }
      );
    } else if (type === 'Ambos marcan') {
      bets.push(
        { matchId, homeTeam, awayTeam, betType: type, betLabel: 'Ambos equipos marcarán', odd: parseFloat(baseOdd.toFixed(2)) },
        { matchId, homeTeam, awayTeam, betType: type, betLabel: 'Al menos un equipo no marcará', odd: parseFloat((2.5 - (baseOdd - 1.5)).toFixed(2)) }
      );
    } else if (type === 'Córners') {
      const thresholds = [6.5, 8.5, 9.5, 10.5];
      const n = thresholds[Math.floor(Math.random() * thresholds.length)];
      bets.push(
        { matchId, homeTeam, awayTeam, betType: type, betLabel: `Más de ${n} córners`, odd: parseFloat(baseOdd.toFixed(2)) },
        { matchId, homeTeam, awayTeam, betType: type, betLabel: `Menos de ${n} córners`, odd: parseFloat((2.5 - (baseOdd - 1.5)).toFixed(2)) }
      );
    } else if (type === 'Tarjetas') {
      const thresholds = [3.5, 4.5, 5.5, 6.5];
      const n = thresholds[Math.floor(Math.random() * thresholds.length)];
      bets.push(
        { matchId, homeTeam, awayTeam, betType: type, betLabel: `Más de ${n} tarjetas`, odd: parseFloat(baseOdd.toFixed(2)) },
        { matchId, homeTeam, awayTeam, betType: type, betLabel: `Menos de ${n} tarjetas`, odd: parseFloat((2.5 - (baseOdd - 1.5)).toFixed(2)) }
      );
    }

    return bets;
  }
}
