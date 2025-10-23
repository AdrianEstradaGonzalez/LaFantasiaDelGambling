/**
 * SCRIPT DE SINCRONIZACIÓN INICIAL DE ESTADO DE JUGADORES
 * 
 * Este script sincroniza el estado de disponibilidad de todos los jugadores
 * consultando la API de API-Football y actualizando la base de datos.
 * 
 * Uso: npx tsx scripts/sync-player-status.ts [season]
 * Ejemplo: npx tsx scripts/sync-player-status.ts 2024
 */

import { updateAllPlayersAvailability } from '../src/services/playerStatus.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const season = parseInt(process.argv[2]) || 2024;

  console.log(`\n🚀 Iniciando sincronización de estado de jugadores para la temporada ${season}\n`);
  console.log('='.repeat(70));
  console.log('\n');

  try {
    await updateAllPlayersAvailability(season);
    
    console.log('\n');
    console.log('='.repeat(70));
    console.log('✅ Sincronización completada exitosamente\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n');
    console.error('='.repeat(70));
    console.error('❌ Error en la sincronización:', error.message);
    console.error('\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
