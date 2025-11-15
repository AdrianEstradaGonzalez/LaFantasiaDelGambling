#!/usr/bin/env tsx
/**
 * Script para generar ofertas diarias de jugadores
 * - Selecciona 50 jugadores aleatorios con precio > 1M
 * - Aplica 20% de descuento
 * - No repite jugadores que tuvieron oferta ayer
 * - Se ejecuta automáticamente cada día
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDailyOffers() {
  try {
    console.log('🎯 Generando ofertas diarias del mercado...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    console.log(`📅 Fecha: ${today.toISOString().split('T')[0]}`);
    
    // Verificar si ya existen ofertas para hoy
    const existingOffers = await prisma.dailyOffer.count({
      where: { date: today }
    });
    
    if (existingOffers > 0) {
      console.log(`⚠️  Ya existen ${existingOffers} ofertas para hoy. Eliminando...`);
      await prisma.dailyOffer.deleteMany({
        where: { date: today }
      });
    }
    
    // Obtener jugadores que tuvieron oferta ayer
    const yesterdayOffers = await prisma.dailyOffer.findMany({
      where: { date: yesterday },
      select: { playerId: true }
    });
    
    const excludedPlayerIds = yesterdayOffers.map(o => o.playerId);
    console.log(`🚫 Excluyendo ${excludedPlayerIds.length} jugadores que tuvieron oferta ayer`);
    
    // Obtener jugadores elegibles de Primera División
    const primeraPlayers = await prisma.player.findMany({
      where: {
        price: { gt: 1 },
        id: { notIn: excludedPlayerIds }
      },
      select: {
        id: true,
        name: true,
        price: true
      }
    });
    
    // Obtener jugadores elegibles de Segunda División
    const segundaPlayers = await prisma.playerSegunda.findMany({
      where: {
        price: { gt: 1 },
        id: { notIn: excludedPlayerIds }
      },
      select: {
        id: true,
        name: true,
        price: true
      }
    });
    
    // Obtener jugadores elegibles de Premier League
    const premierPlayers = await prisma.playerPremier.findMany({
      where: {
        price: { gt: 1 },
        id: { notIn: excludedPlayerIds }
      },
      select: {
        id: true,
        name: true,
        price: true
      }
    });
    
    console.log(`\n📊 Jugadores elegibles:`);
    console.log(`   Primera: ${primeraPlayers.length}`);
    console.log(`   Segunda: ${segundaPlayers.length}`);
    console.log(`   Premier: ${premierPlayers.length}`);
    console.log(`   TOTAL: ${primeraPlayers.length + segundaPlayers.length + premierPlayers.length}`);
    
    // Combinar todos los jugadores con su división
    const allPlayers = [
      ...primeraPlayers.map(p => ({ ...p, division: 'primera' })),
      ...segundaPlayers.map(p => ({ ...p, division: 'segunda' })),
      ...premierPlayers.map(p => ({ ...p, division: 'premier' }))
    ];
    
    if (allPlayers.length < 50) {
      console.warn(`⚠️  Solo hay ${allPlayers.length} jugadores elegibles (se necesitan 50)`);
    }
    
    // Seleccionar 50 jugadores aleatorios
    const shuffled = allPlayers.sort(() => Math.random() - 0.5);
    const selectedPlayers = shuffled.slice(0, Math.min(50, shuffled.length));
    
    console.log(`\n✨ Seleccionados ${selectedPlayers.length} jugadores para ofertas`);
    
    // Crear las ofertas
    const offers = selectedPlayers.map(player => {
      const discount = 20; // 20% de descuento
      const offerPrice = Math.round(player.price * (1 - discount / 100));
      
      return {
        date: today,
        playerId: player.id,
        playerName: player.name,
        division: player.division,
        originalPrice: player.price,
        offerPrice: offerPrice,
        discount: discount
      };
    });
    
    // Insertar ofertas en la base de datos
    const result = await prisma.dailyOffer.createMany({
      data: offers
    });
    
    console.log(`✅ ${result.count} ofertas creadas exitosamente`);
    
    // Actualizar historial de ofertas
    for (const player of selectedPlayers) {
      await prisma.offerHistory.upsert({
        where: { playerId: player.id },
        update: { lastOffer: today },
        create: {
          playerId: player.id,
          lastOffer: today
        }
      });
    }
    
    console.log('✅ Historial de ofertas actualizado');
    
    // Mostrar resumen por división
    const offersByDivision = {
      primera: offers.filter(o => o.division === 'primera').length,
      segunda: offers.filter(o => o.division === 'segunda').length,
      premier: offers.filter(o => o.division === 'premier').length
    };
    
    console.log(`\n📈 Resumen de ofertas:`);
    console.log(`   Primera: ${offersByDivision.primera}`);
    console.log(`   Segunda: ${offersByDivision.segunda}`);
    console.log(`   Premier: ${offersByDivision.premier}`);
    
    // Mostrar algunos ejemplos
    console.log(`\n🎁 Ejemplos de ofertas:`);
    offers.slice(0, 5).forEach(offer => {
      console.log(`   ${offer.playerName} (${offer.division}): ${offer.originalPrice}M → ${offer.offerPrice}M (-${offer.discount}%)`);
    });
    
    console.log('\n✅ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error generando ofertas diarias:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
generateDailyOffers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
