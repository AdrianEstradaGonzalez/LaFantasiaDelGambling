/**
 * Script para probar el estado de un jugador específico
 * Uso: npx tsx scripts/test-specific-player.ts <playerId>
 */

import { getPlayerAvailabilityFromAPI } from '../src/services/playerStatus.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Buscar jugador por nombre (parcial)
    const searchName = process.argv[2] || 'Isco';
    
    console.log(`\n🔍 Buscando jugador: "${searchName}"\n`);
    
    const players = await prisma.player.findMany({
      where: {
        name: {
          contains: searchName,
          mode: 'insensitive',
        },
      },
      take: 10,
    });

    if (players.length === 0) {
      console.log(`❌ No se encontró ningún jugador con el nombre "${searchName}"`);
      process.exit(1);
    }

    console.log(`✅ Se encontraron ${players.length} jugador(es):\n`);

    for (const player of players) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 ${player.name} (ID: ${player.id})`);
      console.log(`   Equipo: ${player.teamName}`);
      console.log(`   Posición: ${player.position}`);
      console.log(`   Estado actual en BD: ${player.availabilityStatus || 'N/A'}`);
      console.log(``);
      
      // Verificar estado desde la API
      console.log(`🔄 Consultando estado desde la API...`);
      const availability = await getPlayerAvailabilityFromAPI(player.id, 2025);
      
      console.log(`\n📊 Resultado:`);
      console.log(`   Estado: ${availability.status}`);
      console.log(`   Info: ${availability.info || 'N/A'}`);
      console.log(`\n`);
      
      // Delay para no saturar la API
      await new Promise(r => setTimeout(r, 500));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
