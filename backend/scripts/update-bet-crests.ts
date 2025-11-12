import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_FOOTBALL_KEY = '07bc9c707fe2d6169fff6e17d4a9e6fd';
const API_BASE = 'https://v3.football.api-sports.io';

// Cache de escudos para evitar múltiples llamadas a la API
const crestCache: Map<string, string> = new Map();

/**
 * Buscar el escudo de un equipo en la API de Football
 */
async function getTeamCrest(teamName: string): Promise<string | null> {
  if (!teamName) return null;

  // Verificar cache
  if (crestCache.has(teamName)) {
    return crestCache.get(teamName) || null;
  }

  try {
    // Buscar equipo en La Liga (140)
    const response = await axios.get(`${API_BASE}/teams`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
      params: {
        search: teamName,
        league: 140, // La Liga
        season: 2025
      }
    });

    if (response.data.response && response.data.response.length > 0) {
      const team = response.data.response[0];
      const crest = team.team?.logo || null;
      
      if (crest) {
        crestCache.set(teamName, crest);
        console.log(`✅ Encontrado escudo para ${teamName}: ${crest}`);
        return crest;
      }
    }

    // Si no se encuentra en La Liga, buscar en Segunda División (141)
    const response2 = await axios.get(`${API_BASE}/teams`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
      params: {
        search: teamName,
        league: 141, // Segunda División
        season: 2025
      }
    });

    if (response2.data.response && response2.data.response.length > 0) {
      const team = response2.data.response[0];
      const crest = team.team?.logo || null;
      
      if (crest) {
        crestCache.set(teamName, crest);
        console.log(`✅ Encontrado escudo para ${teamName}: ${crest}`);
        return crest;
      }
    }

    // Si no se encuentra en Segunda, buscar en Premier League (39)
    const response3 = await axios.get(`${API_BASE}/teams`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
      params: {
        search: teamName,
        league: 39, // Premier League
        season: 2024 // Premier usa 2024 para temporada 2024-2025
      }
    });

    if (response3.data.response && response3.data.response.length > 0) {
      const team = response3.data.response[0];
      const crest = team.team?.logo || null;
      
      if (crest) {
        crestCache.set(teamName, crest);
        console.log(`✅ Encontrado escudo para ${teamName}: ${crest}`);
        return crest;
      }
    }

    console.warn(`⚠️  No se encontró escudo para: ${teamName}`);
    crestCache.set(teamName, '');
    return null;
  } catch (error: any) {
    console.error(`❌ Error buscando escudo para ${teamName}:`, error.message);
    return null;
  }
}

/**
 * Actualizar todas las apuestas con escudos
 */
async function updateBetCrests() {
  try {
    console.log('🚀 Iniciando actualización de escudos en apuestas...\n');

    // Obtener todas las apuestas que no tienen escudos
    const betsWithoutCrests = await prisma.bet.findMany({
      where: {
        OR: [
          { homeCrest: null },
          { awayCrest: null }
        ]
      },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        homeCrest: true,
        awayCrest: true
      }
    });

    console.log(`📊 Total de apuestas sin escudos: ${betsWithoutCrests.length}\n`);

    if (betsWithoutCrests.length === 0) {
      console.log('✅ Todas las apuestas ya tienen escudos');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const bet of betsWithoutCrests) {
      try {
        const updates: any = {};

        // Obtener escudo del equipo local si falta
        if (!bet.homeCrest && bet.homeTeam) {
          const homeCrest = await getTeamCrest(bet.homeTeam);
          if (homeCrest) {
            updates.homeCrest = homeCrest;
          }
          // Pequeño delay para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Obtener escudo del equipo visitante si falta
        if (!bet.awayCrest && bet.awayTeam) {
          const awayCrest = await getTeamCrest(bet.awayTeam);
          if (awayCrest) {
            updates.awayCrest = awayCrest;
          }
          // Pequeño delay para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Actualizar apuesta si hay cambios
        if (Object.keys(updates).length > 0) {
          await prisma.bet.update({
            where: { id: bet.id },
            data: updates
          });
          updated++;
          console.log(`✅ Actualizada apuesta ${bet.id}: ${bet.homeTeam} vs ${bet.awayTeam}`);
        }

      } catch (error: any) {
        errors++;
        console.error(`❌ Error actualizando apuesta ${bet.id}:`, error.message);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`  - Apuestas actualizadas: ${updated}`);
    console.log(`  - Errores: ${errors}`);
    console.log(`  - Total procesadas: ${betsWithoutCrests.length}`);
    console.log('\n✅ Proceso completado');

  } catch (error: any) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
updateBetCrests()
  .then(() => {
    console.log('\n🎉 Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
