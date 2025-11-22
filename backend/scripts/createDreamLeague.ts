/**
 * Script para crear la liga pública DreamLeague
 * Esta liga debe ejecutarse una sola vez en producción
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDreamLeague() {
  try {
    console.log('🌍 Creando liga pública DreamLeague...');

    // Buscar si ya existe
    const existing = await prisma.league.findUnique({
      where: { code: 'DREAMLEAGUE' }
    });

    if (existing) {
      console.log('✅ DreamLeague ya existe:', existing.id);
      return existing;
    }

    // Buscar un usuario administrador para ser líder
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true }
    });

    if (!adminUser) {
      throw new Error('❌ No se encontró un usuario administrador. Crea uno primero.');
    }

    // Crear la liga pública
    const dreamLeague = await prisma.league.create({
      data: {
        name: 'DreamLeague',
        code: 'DREAMLEAGUE',
        leaderId: adminUser.id,
        division: 'primera',
        isPremium: false,
        currentJornada: 1,
        jornadaStatus: 'open'
      }
    });

    console.log('✅ DreamLeague creada exitosamente:', dreamLeague.id);
    console.log('   Código:', dreamLeague.code);
    console.log('   Líder:', adminUser.name || adminUser.email);

    return dreamLeague;
  } catch (error) {
    console.error('❌ Error al crear DreamLeague:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar directamente
createDreamLeague()
  .then(() => {
    console.log('✅ Script completado');
  })
  .catch((error) => {
    console.error('❌ Script falló:', error);
  });

export { createDreamLeague };
