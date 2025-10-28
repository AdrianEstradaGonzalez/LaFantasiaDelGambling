import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function searchPlayers() {
  try {
    // Buscar con diferentes variaciones
    const variations = ['Carlos', 'Martin', 'Martín', 'carlos martin'];
    
    for (const search of variations) {
      console.log(`\n=== Buscando: "${search}" ===`);
      const players = await prisma.player.findMany({
        where: {
          name: {
            contains: search,
            mode: 'insensitive'
          },
          teamName: {
            contains: 'Atlético',
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true,
          teamName: true,
          position: true
        }
      });

      players.forEach(p => {
        console.log(`  - ${p.name} (${p.teamName}) - ${p.position}`);
      });
    }

    // Buscar todos los jugadores del Atlético
    console.log(`\n=== TODOS LOS JUGADORES DEL ATLÉTICO ===`);
    const atleticoPlayers = await prisma.player.findMany({
      where: {
        teamName: {
          contains: 'Atlético',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        teamName: true,
        position: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    atleticoPlayers.forEach(p => {
      console.log(`  - ${p.name} (${p.position})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchPlayers();
