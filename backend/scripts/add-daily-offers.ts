#!/usr/bin/env tsx
/**
 * Script para añadir las tablas de ofertas diarias
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function addDailyOffersTables() {
  try {
    console.log('📊 Añadiendo tablas de ofertas diarias...');
    
    // Leer el archivo SQL
    const sqlPath = join(process.cwd(), 'scripts', 'add-daily-offers.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Ejecutar el SQL
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ Tablas creadas exitosamente');
    
    // Verificar
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('daily_offer', 'offer_history')
      ORDER BY table_name;
    `;
    
    console.log('📋 Tablas creadas:', tables);
    
    console.log('✅ Migración completada');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
addDailyOffersTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
