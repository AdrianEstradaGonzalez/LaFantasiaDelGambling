import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const SEASON = 2024;

interface PlayerWithStats {
  playerId: number;
  name: string;
  team: string;
  jornada: number;
  yellowCards: number;
  redCards: number;
}

async function findDoubleYellowPlayers() {
  console.log('🔍 Buscando jugadores con posible doble amarilla (2 amarillas + 1 roja)...\n');

  // Buscar jugadores con 2 amarillas Y 1 roja en la misma jornada
  const players = await prisma.playerStats.findMany({
    where: {
      season: SEASON,
      yellowCards: 2,
      redCards: 1,
    },
    include: {
      player: true
    },
    orderBy: {
      jornada: 'desc'
    }
  });

  console.log(`📊 Encontrados ${players.length} jugadores con 2 amarillas + 1 roja:\n`);

  const grouped: Record<number, PlayerWithStats[]> = {};
  
  for (const player of players) {
    if (!grouped[player.jornada]) {
      grouped[player.jornada] = [];
    }
    
    grouped[player.jornada].push({
      playerId: player.playerId,
      name: player.player.name || `Jugador ${player.playerId}`,
      team: player.player.teamName || 'Desconocido',
      jornada: player.jornada,
      yellowCards: player.yellowCards ?? 0,
      redCards: player.redCards ?? 0
    });
  }

  // Mostrar agrupados por jornada
  for (const [jornada, jornadaPlayers] of Object.entries(grouped)) {
    console.log(`\n📅 Jornada ${jornada}:`);
    jornadaPlayers.forEach(p => {
      console.log(`   • ${p.name} (${p.team}) - ID: ${p.playerId}`);
      console.log(`     Tarjetas: ${p.yellowCards} amarillas, ${p.redCards} roja`);
    });
  }

  return players;
}

async function fixDoubleYellowCards(dryRun = true) {
  console.log('\n' + '='.repeat(60));
  console.log(dryRun ? '🔍 MODO PRUEBA (DRY RUN)' : '✅ MODO EJECUCIÓN');
  console.log('='.repeat(60) + '\n');

  const players = await prisma.playerStats.findMany({
    where: {
      season: SEASON,
      yellowCards: 2,
      redCards: 1,
    },
    include: {
      player: true
    },
    orderBy: {
      jornada: 'desc'
    }
  });

  console.log(`🔄 Procesando ${players.length} jugadores...\n`);

  let updated = 0;

  for (const player of players) {
    console.log(`📝 ${player.player.name} (${player.player.teamName}) - Jornada ${player.jornada}`);
    console.log(`   Antes: ${player.yellowCards} amarillas, ${player.redCards} roja`);
    console.log(`   Después: 0 amarillas, 1 roja`);

    if (!dryRun) {
      await prisma.playerStats.update({
        where: {
          playerId_jornada_season: {
            playerId: player.playerId,
            jornada: player.jornada,
            season: SEASON
          }
        },
        data: {
          yellowCards: 0,
          redCards: 1,
          updatedAt: new Date()
        }
      });
      console.log(`   ✅ Actualizado\n`);
      updated++;
    } else {
      console.log(`   ℹ️  Sin cambios (dry run)\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  if (dryRun) {
    console.log('ℹ️  MODO PRUEBA - No se realizaron cambios');
    console.log('ℹ️  Para aplicar los cambios, ejecuta con --apply');
  } else {
    console.log(`✅ PROCESO COMPLETADO - ${updated} jugadores actualizados`);
  }
  console.log('='.repeat(60));
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  // Primero mostrar la lista
  await findDoubleYellowPlayers();

  // Luego ejecutar la corrección
  await fixDoubleYellowCards(!apply);

  await prisma.$disconnect();
}

main();
