import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SquadHistoryPlayer {
  playerId: number;
  playerName: string;
  position: string;
  role: string;
  pricePaid: number;
  isCaptain: boolean;
}

export interface SquadHistoryData {
  userId: string;
  leagueId: string;
  jornada: number;
  formation: string;
  players: SquadHistoryPlayer[];
  totalValue: number;
  captainPosition: string | null;
}

/**
 * Guarda una snapshot de la plantilla de un usuario en una jornada específica
 */
export async function saveSquadHistory(data: SquadHistoryData): Promise<void> {
  const { userId, leagueId, jornada, formation, players, totalValue, captainPosition } = data;

  console.log(`[SquadHistory] Guardando plantilla histórica: Usuario ${userId}, Liga ${leagueId}, Jornada ${jornada}`);

  await prisma.squadHistory.upsert({
    where: {
      userId_leagueId_jornada: {
        userId,
        leagueId,
        jornada
      }
    },
    create: {
      userId,
      leagueId,
      jornada,
      formation,
      players: players as any, // JSON
      totalValue,
      captainPosition
    },
    update: {
      formation,
      players: players as any,
      totalValue,
      captainPosition
    }
  });

  console.log(`[SquadHistory] ✅ Plantilla histórica guardada: ${totalValue}M de valor`);
}

/**
 * Recupera la plantilla histórica de un usuario en una jornada específica
 */
export async function getSquadHistory(userId: string, leagueId: string, jornada: number) {
  console.log(`[SquadHistory] Recuperando plantilla histórica: Usuario ${userId}, Liga ${leagueId}, Jornada ${jornada}`);

  const history = await prisma.squadHistory.findUnique({
    where: {
      userId_leagueId_jornada: {
        userId,
        leagueId,
        jornada
      }
    }
  });

  if (!history) {
    console.log(`[SquadHistory] ⚠️ No se encontró plantilla histórica`);
    return null;
  }

  console.log(`[SquadHistory] ✅ Plantilla histórica encontrada: ${history.totalValue}M`);
  
  return {
    formation: history.formation,
    players: history.players as unknown as SquadHistoryPlayer[],
    totalValue: history.totalValue,
    captainPosition: history.captainPosition,
    createdAt: history.createdAt
  };
}

/**
 * Calcula el valor total de una plantilla basándose en los precios pagados
 */
export function calculateSquadValue(players: SquadHistoryPlayer[]): number {
  return players.reduce((sum, player) => sum + player.pricePaid, 0);
}

/**
 * Guarda snapshots de todas las plantillas activas en una liga para una jornada
 * Se debe ejecutar durante el cierre de jornada ANTES de vaciar las plantillas
 */
export async function saveAllSquadsInLeague(leagueId: string, jornada: number): Promise<number> {
  console.log(`[SquadHistory] Guardando todas las plantillas de liga ${leagueId} para jornada ${jornada}`);

  const squads = await prisma.squad.findMany({
    where: {
      leagueId,
      isActive: true
    },
    include: {
      players: true
    }
  });

  console.log(`[SquadHistory] Encontradas ${squads.length} plantillas activas`);

  let savedCount = 0;

  for (const squad of squads) {
    if (squad.players.length === 0) {
      console.log(`[SquadHistory] ⏭️ Saltando squad vacío para usuario ${squad.userId}`);
      continue;
    }

    const players: SquadHistoryPlayer[] = squad.players.map(p => ({
      playerId: p.playerId,
      playerName: p.playerName,
      position: p.position,
      role: p.role,
      pricePaid: p.pricePaid,
      isCaptain: p.isCaptain
    }));

    const totalValue = calculateSquadValue(players);
    const captainPosition = squad.players.find(p => p.isCaptain)?.position || null;

    await saveSquadHistory({
      userId: squad.userId,
      leagueId: squad.leagueId,
      jornada,
      formation: squad.formation,
      players,
      totalValue,
      captainPosition
    });

    savedCount++;
  }

  console.log(`[SquadHistory] ✅ Guardadas ${savedCount} plantillas históricas para jornada ${jornada}`);
  
  return savedCount;
}

export const SquadHistoryService = {
  saveSquadHistory,
  getSquadHistory,
  calculateSquadValue,
  saveAllSquadsInLeague
};

export default SquadHistoryService;
