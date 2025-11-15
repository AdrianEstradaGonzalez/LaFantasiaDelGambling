import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CombiSelection {
  matchId: number;
  betType: string;
  betLabel: string;
  odd: number;
  homeTeam: string;
  awayTeam: string;
  apiBetId?: number;
  apiEndpoint?: string;
  apiOperator?: string;
  apiStatKey?: string;
  apiValue?: string;
}

export interface CreateCombiDto {
  leagueId: string;
  userId: string;
  jornada: number;
  selections: CombiSelection[];
  amount: number; // Cantidad apostada (máximo 50M)
}

export const BetCombiService = {
  /**
   * Crear una apuesta combinada
   * - Máximo 50M de apuesta
   * - Cuota total = producto de todas las cuotas
   * - Todas las selecciones deben acertar para ganar
   */
  createCombi: async (data: CreateCombiDto) => {
    const { leagueId, userId, jornada, selections, amount } = data;

    // Validación: mínimo 2 selecciones
    if (selections.length < 2) {
      throw new Error('Una combi debe tener al menos 2 selecciones');
    }

    // Validación: máximo 50M
    if (amount > 50) {
      throw new Error('El monto máximo para una combi es 50M');
    }

    // Validación: mínimo 1M
    if (amount < 1) {
      throw new Error('El monto mínimo es 1M');
    }

    // Verificar presupuesto de apuestas
    const member = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
      select: { bettingBudget: true }
    });

    if (!member) {
      throw new Error('Usuario no encontrado en la liga');
    }

    if (member.bettingBudget < amount) {
      throw new Error(`Presupuesto insuficiente. Tienes ${member.bettingBudget}M disponibles`);
    }

    // Calcular cuota total (producto de todas las cuotas)
    const totalOdd = selections.reduce((acc, sel) => acc * sel.odd, 1);
    const potentialWin = Math.round(amount * totalOdd);

    // Crear la combinada y sus selecciones en una transacción
    const combi = await prisma.$transaction(async (tx: any) => {
      // Crear la combi principal
      const newCombi = await tx.betCombi.create({
        data: {
          leagueId,
          userId,
          jornada,
          totalOdd,
          amount,
          potentialWin,
          status: 'pending'
        }
      });

      // Crear las apuestas individuales vinculadas a la combi
      await Promise.all(
        selections.map((sel) =>
          tx.bet.create({
            data: {
              leagueId,
              userId,
              jornada,
              matchId: sel.matchId,
              betType: sel.betType,
              betLabel: sel.betLabel,
              odd: sel.odd,
              amount: 0, // Las individuales no consumen presupuesto, solo la combi
              potentialWin: 0,
              status: 'pending',
              homeTeam: sel.homeTeam,
              awayTeam: sel.awayTeam,
              combiId: newCombi.id, // Vincular a la combi
              apiBetId: sel.apiBetId,
              apiEndpoint: sel.apiEndpoint,
              apiOperator: sel.apiOperator,
              apiStatKey: sel.apiStatKey,
              apiValue: sel.apiValue
            }
          })
        )
      );

      // Descontar presupuesto de apuestas
      await tx.leagueMember.update({
        where: { leagueId_userId: { leagueId, userId } },
        data: { bettingBudget: { decrement: amount } }
      });

      return newCombi;
    });

    console.log(`✅ Combi creada: ${selections.length} selecciones, cuota ${totalOdd.toFixed(2)}, apuesta ${amount}M, ganancia potencial ${potentialWin}M`);
    return combi;
  },

  /**
   * Obtener combinadas de un usuario en una liga
   */
  getUserCombis: async (leagueId: string, userId: string, jornada?: number) => {
    const where: any = { leagueId, userId };
    if (jornada) {
      where.jornada = jornada;
    }

    const combis = await (prisma as any).betCombi.findMany({
      where,
      include: {
        selections: {
          select: {
            id: true,
            matchId: true,
            betType: true,
            betLabel: true,
            odd: true,
            status: true,
            homeTeam: true,
            awayTeam: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return combis;
  },

  /**
   * Evaluar una combinada después de evaluarse todas sus selecciones
   * - Si todas ganan -> combi gana
   * - Si alguna pierde -> combi pierde
   * - Si alguna está pending -> combi sigue pending
   */
  evaluateCombi: async (combiId: string) => {
    const combi = await (prisma as any).betCombi.findUnique({
      where: { id: combiId },
      include: { selections: true }
    });

    if (!combi) {
      throw new Error('Combi no encontrada');
    }

    if (combi.status !== 'pending') {
      console.log(`⏭️ Combi ${combiId} ya evaluada con estado: ${combi.status}`);
      return combi;
    }

    // Verificar el estado de todas las selecciones
    const allWon = combi.selections.every((sel: any) => sel.status === 'won');
    const anyLost = combi.selections.some((sel: any) => sel.status === 'lost');
    const anyPending = combi.selections.some((sel: any) => sel.status === 'pending');

    let newStatus = combi.status;
    let budgetChange = 0;

    if (anyPending) {
      // Aún hay selecciones pendientes, no se puede evaluar
      console.log(`⏳ Combi ${combiId} tiene selecciones pendientes`);
      return combi;
    }

    if (allWon) {
      // Todas ganaron -> combi gana
      newStatus = 'won';
      budgetChange = combi.potentialWin;
      console.log(`🎉 Combi ${combiId} GANÓ: ${combi.potentialWin}M`);
    } else if (anyLost) {
      // Alguna perdió -> combi pierde
      newStatus = 'lost';
      console.log(`❌ Combi ${combiId} PERDIÓ`);
    }

    // Actualizar combi (NO acreditar en bettingBudget aquí, se hará en cambio de jornada)
    const updatedCombi = await (prisma as any).betCombi.update({
      where: { id: combiId },
      data: {
        status: newStatus,
        evaluatedAt: new Date()
      },
      include: { selections: true }
    });

    return updatedCombi;
  },

  /**
   * Evaluar todas las combis pendientes de una jornada
   */
  evaluateJornadaCombis: async (leagueId: string, jornada: number) => {
    const pendingCombis = await (prisma as any).betCombi.findMany({
      where: {
        leagueId,
        jornada,
        status: 'pending'
      }
    });

    console.log(`🔍 Evaluando ${pendingCombis.length} combis pendientes de jornada ${jornada}`);

    const results = await Promise.all(
      pendingCombis.map((combi: any) => BetCombiService.evaluateCombi(combi.id))
    );

    const won = results.filter((c: any) => c.status === 'won').length;
    const lost = results.filter((c: any) => c.status === 'lost').length;
    const pending = results.filter((c: any) => c.status === 'pending').length;

    console.log(`📊 Resultados: ${won} ganadas, ${lost} perdidas, ${pending} pendientes`);

    return { won, lost, pending, total: results.length };
  },

  /**
   * Eliminar una selección de una combi
   * - Recalcula la cuota total y ganancia potencial
   * - Si quedan menos de 2 selecciones, elimina toda la combi
   */
  removeSelectionFromCombi: async (combiId: string, betId: string, userId: string) => {
    const combi = await (prisma as any).betCombi.findUnique({
      where: { id: combiId },
      include: { selections: true }
    });

    if (!combi) {
      throw new Error('Combi no encontrada');
    }

    // Verificar que el usuario es el propietario
    if (combi.userId !== userId) {
      throw new Error('No tienes permiso para modificar esta combi');
    }

    // Verificar que la combi no esté evaluada
    if (combi.status !== 'pending') {
      throw new Error('No puedes modificar una combi que ya ha sido evaluada');
    }

    // Verificar que la selección pertenece a la combi
    const selection = combi.selections.find((s: any) => s.id === betId);
    if (!selection) {
      throw new Error('La apuesta no pertenece a esta combi');
    }

    // Si solo quedan 2 selecciones, eliminar toda la combi
    if (combi.selections.length <= 2) {
      await prisma.$transaction(async (tx: any) => {
        // Eliminar todas las apuestas de la combi
        await tx.bet.deleteMany({
          where: { combiId }
        });

        // Eliminar la combi
        await tx.betCombi.delete({
          where: { id: combiId }
        });

        // Devolver presupuesto
        await tx.leagueMember.update({
          where: { leagueId_userId: { leagueId: combi.leagueId, userId: combi.userId } },
          data: { bettingBudget: { increment: combi.amount } }
        });
      });

      console.log(`🗑️ Combi ${combiId} eliminada completamente (quedaban menos de 2 selecciones)`);
      return { deleted: true };
    }

    // Eliminar solo la selección y recalcular
    const updatedCombi = await prisma.$transaction(async (tx: any) => {
      // Eliminar la apuesta
      await tx.bet.delete({
        where: { id: betId }
      });

      // Obtener selecciones restantes
      const remainingSelections = await tx.bet.findMany({
        where: { combiId }
      });

      // Recalcular cuota total
      const newTotalOdd = remainingSelections.reduce((acc: number, sel: any) => acc * sel.odd, 1);
      const newPotentialWin = Math.round(combi.amount * newTotalOdd);

      // Actualizar la combi
      return await tx.betCombi.update({
        where: { id: combiId },
        data: {
          totalOdd: newTotalOdd,
          potentialWin: newPotentialWin
        },
        include: { selections: true }
      });
    });

    console.log(`✅ Selección eliminada de combi ${combiId}. Nueva cuota: ${updatedCombi.totalOdd.toFixed(2)}`);
    return updatedCombi;
  },

  /**
   * Añadir una selección a una combi existente
   * - Recalcula la cuota total y ganancia potencial
   * - Máximo 3 selecciones por combi
   */
  addSelectionToCombi: async (combiId: string, userId: string, selection: CombiSelection) => {
    const combi = await (prisma as any).betCombi.findUnique({
      where: { id: combiId },
      include: { selections: true }
    });

    if (!combi) {
      throw new Error('Combi no encontrada');
    }

    // Verificar que el usuario es el propietario
    if (combi.userId !== userId) {
      throw new Error('No tienes permiso para modificar esta combi');
    }

    // Verificar que la combi no esté evaluada
    if (combi.status !== 'pending') {
      throw new Error('No puedes modificar una combi que ya ha sido evaluada');
    }

    // Verificar que no se exceda el máximo de 3 selecciones
    if (combi.selections.length >= 3) {
      throw new Error('Una combi no puede tener más de 3 selecciones');
    }

    // Verificar que no exista una selección del mismo partido
    const hasMatchAlready = combi.selections.some((s: any) => s.matchId === selection.matchId);
    if (hasMatchAlready) {
      throw new Error('Ya tienes una selección de este partido en la combi');
    }

    // Añadir la selección y recalcular
    const updatedCombi = await prisma.$transaction(async (tx: any) => {
      // Crear la nueva apuesta
      await tx.bet.create({
        data: {
          leagueId: combi.leagueId,
          userId: combi.userId,
          jornada: combi.jornada,
          matchId: selection.matchId,
          betType: selection.betType,
          betLabel: selection.betLabel,
          odd: selection.odd,
          amount: 0,
          potentialWin: 0,
          status: 'pending',
          homeTeam: selection.homeTeam,
          awayTeam: selection.awayTeam,
          combiId: combiId,
          apiBetId: selection.apiBetId,
          apiEndpoint: selection.apiEndpoint,
          apiOperator: selection.apiOperator,
          apiStatKey: selection.apiStatKey,
          apiValue: selection.apiValue
        }
      });

      // Obtener todas las selecciones
      const allSelections = await tx.bet.findMany({
        where: { combiId }
      });

      // Recalcular cuota total
      const newTotalOdd = allSelections.reduce((acc: number, sel: any) => acc * sel.odd, 1);
      const newPotentialWin = Math.round(combi.amount * newTotalOdd);

      // Actualizar la combi
      return await tx.betCombi.update({
        where: { id: combiId },
        data: {
          totalOdd: newTotalOdd,
          potentialWin: newPotentialWin
        },
        include: { selections: true }
      });
    });

    console.log(`✅ Selección añadida a combi ${combiId}. Nueva cuota: ${updatedCombi.totalOdd.toFixed(2)}`);
    return updatedCombi;
  }
};
