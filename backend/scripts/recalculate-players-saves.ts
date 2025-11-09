/**
 * Script para recalcular las estadísticas (incluidas paradas) de jugadores específicos
 * Uso: npx tsx scripts/recalculate-players-saves.ts --players 47269,11346 [--jornada 15]
 * Si no se pasa --jornada, usa la jornada actual registrada en la tabla 'league'.
 */

import { PrismaClient } from '@prisma/client';
import { getPlayerStatsForJornada } from '../src/services/playerStats.service.js';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const result: { players: number[]; jornada?: number } = { players: [] };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--players' && args[i + 1]) {
      result.players = args[i + 1].split(',').map((s) => Number(s.trim())).filter(Boolean);
      i++;
      continue;
    }
    if (a.startsWith('--players=')) {
      const v = a.split('=')[1] || '';
      result.players = v.split(',').map((s) => Number(s.trim())).filter(Boolean);
      continue;
    }
    if (a === '--jornada' && args[i + 1]) {
      result.jornada = Number(args[i + 1]);
      i++;
      continue;
    }
    if (a.startsWith('--jornada=')) {
      result.jornada = Number(a.split('=')[1]);
      continue;
    }
  }

  return result;
}

async function main() {
  const { players, jornada } = parseArgs();

  if (!players || players.length === 0) {
    console.error('Debe indicar al menos un playerId con --players 47269,11346');
    process.exit(1);
  }

  try {
    let targetJornada = jornada;
    if (!targetJornada) {
      const league = await prisma.league.findFirst({ select: { currentJornada: true } });
      targetJornada = league?.currentJornada;
    }

    if (!targetJornada) {
      console.error('No se pudo determinar la jornada objetivo. Pase --jornada N o verifique la tabla league.');
      process.exit(1);
    }

    console.log(`Recalculando players [${players.join(', ')}] para jornada ${targetJornada}`);

    for (const playerId of players) {
      try {
        console.log(`\n--- Procesando playerId=${playerId} ---`);
        // Borrar datos existentes en tablas de stats para forzar fetch y upsert
        try {
          await prisma.playerStats.deleteMany({ where: { playerId, jornada: targetJornada } });
        } catch (e) {
          // Ignorar si la tabla no existe en esta instalación
        }
        try {
          // Premier / Segunda (si existen)
          // @ts-ignore
          await (prisma as any).playerPremierStats?.deleteMany?.({ where: { playerId, jornada: targetJornada } });
        } catch (e) {}
        try {
          // @ts-ignore
          await (prisma as any).playerSegundaStats?.deleteMany?.({ where: { playerId, jornada: targetJornada } });
        } catch (e) {}

        console.log(`Borrados registros previos (si existían) para player ${playerId} jornada ${targetJornada}`);

        const res = await getPlayerStatsForJornada(playerId, targetJornada, { forceRefresh: true, division: 'primera' });
        console.log(`Resultado player ${playerId}: totalPoints=${res?.totalPoints} minutes=${res?.minutes} saves=${res?.saves}`);
        // Small delay to be friendly with external API
        await new Promise((r) => setTimeout(r, 500));
      } catch (err: any) {
        console.error(`Error procesando player ${playerId}:`, err?.message || err);
      }
    }

    console.log('\nRecalculo completado.');
  } catch (error: any) {
    console.error('Fallo del script:', error?.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
