/**
 * Script de prueba para obtener estadísticas de jugadores del Sporting Gijón
 * usando la API de API-Football directamente con el endpoint /players
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const api = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-rapidapi-host': 'v3.football.api-sports.io',
    'x-rapidapi-key': process.env.FOOTBALL_API_KEY || '',
  },
  timeout: 30000,
});

async function testSportingPlayers() {
  try {
    console.log('🔍 Buscando jugadores del Sporting Gijón en la base de datos...\n');
    
    // Buscar jugadores del Sporting en la tabla de segunda división
    const sportingPlayers = await (prisma as any).playerSegunda.findMany({
      where: {
        teamName: {
          contains: 'Sporting',
          mode: 'insensitive'
        }
      },
      take: 5 // Tomar solo 5 jugadores para la prueba
    });

    if (sportingPlayers.length === 0) {
      console.log('❌ No se encontraron jugadores del Sporting en la base de datos');
      return;
    }

    console.log(`✅ Encontrados ${sportingPlayers.length} jugadores del Sporting:\n`);
    
    const season = Number(process.env.FOOTBALL_API_SEASON ?? 2025);
    console.log(`📅 Temporada: ${season}\n`);

    for (const player of sportingPlayers) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👤 Jugador: ${player.name} (ID: ${player.id})`);
      console.log(`   Posición: ${player.position}`);
      console.log(`   Equipo: ${player.teamName}`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        console.log(`🔄 Consultando API: GET /players?id=${player.id}&season=${season}`);
        
        const response = await api.get('/players', {
          params: {
            id: player.id,
            season: season
          }
        });

        const data = response.data;
        
        console.log(`\n📊 Respuesta de la API:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Results: ${data.results || 0}`);

        if (data.response && data.response.length > 0) {
          const playerData = data.response[0];
          const statistics = playerData.statistics || [];
          
          console.log(`\n✅ Datos encontrados:`);
          console.log(`   Nombre en API: ${playerData.player?.name}`);
          console.log(`   Edad: ${playerData.player?.age}`);
          console.log(`   Nacionalidad: ${playerData.player?.nationality}`);
          console.log(`   Estadísticas por liga: ${statistics.length}`);

          // Mostrar estadísticas de Segunda División (Liga 141)
          const segundaStats = statistics.find((s: any) => s.league?.id === 141);
          
          if (segundaStats) {
            console.log(`\n   📈 Estadísticas Segunda División:`);
            console.log(`      Liga: ${segundaStats.league?.name}`);
            console.log(`      Equipo: ${segundaStats.team?.name}`);
            console.log(`      Partidos jugados: ${segundaStats.games?.appearences || 0}`);
            console.log(`      Minutos: ${segundaStats.games?.minutes || 0}`);
            console.log(`      Goles: ${segundaStats.goals?.total || 0}`);
            console.log(`      Asistencias: ${segundaStats.goals?.assists || 0}`);
            console.log(`      Tarjetas amarillas: ${segundaStats.cards?.yellow || 0}`);
            console.log(`      Tarjetas rojas: ${segundaStats.cards?.red || 0}`);
            
            if (segundaStats.shots) {
              console.log(`      Tiros totales: ${segundaStats.shots?.total || 0}`);
              console.log(`      Tiros a puerta: ${segundaStats.shots?.on || 0}`);
            }
            
            if (segundaStats.passes) {
              console.log(`      Pases clave: ${segundaStats.passes?.key || 0}`);
              console.log(`      Precisión de pases: ${segundaStats.passes?.accuracy || 0}%`);
            }
          } else {
            console.log(`\n   ⚠️ No se encontraron estadísticas para Segunda División (Liga 141)`);
            console.log(`   Ligas disponibles:`);
            statistics.forEach((s: any) => {
              console.log(`      - ${s.league?.name} (ID: ${s.league?.id})`);
            });
          }
        } else {
          console.log(`\n   ❌ No se encontraron datos para este jugador`);
          console.log(`   Posibles razones:`);
          console.log(`      - El ID del jugador no es correcto`);
          console.log(`      - El jugador no tiene datos para la temporada ${season}`);
          console.log(`      - El jugador no ha jugado en esta temporada`);
        }

      } catch (error: any) {
        console.error(`\n❌ Error consultando API para ${player.name}:`);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Data:`, error.response.data);
        } else {
          console.error(`   Message: ${error.message}`);
        }
      }

      // Esperar un poco entre peticiones para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Prueba completada');
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el test
testSportingPlayers();
