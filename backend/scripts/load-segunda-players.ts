/**
 * Script para cargar jugadores de la Segunda División Española
 * 
 * Este script obtiene todos los jugadores de la Segunda División (Liga SmartBank)
 * desde la API de Football y los guarda en la tabla player_segunda
 * 
 * Uso: npx tsx scripts/load-segunda-players.ts
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuración de la API
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const HEADERS = {
  'x-rapidapi-key': API_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io',
};

const SEGUNDA_DIVISION_LEAGUE_ID = 141; // La Liga 2 (Segunda División)
const CURRENT_SEASON = 2025;

interface Team {
  team: {
    id: number;
    name: string;
    logo: string;
  };
}

interface PlayerFromAPI {
  player: {
    id: number;
    name: string;
    firstname?: string;
    lastname?: string;
    age?: number;
    nationality?: string;
    photo?: string;
  };
  statistics: Array<{
    team: {
      id: number;
      name: string;
      logo: string;
    };
    league: {
      id: number;
      name: string;
      country: string;
      season: number;
    };
    games: {
      position: string;
      number?: number;
    };
  }>;
}

// Mapeo de posiciones de la API a formato canónico
function normalizePosition(position: string): string {
  const pos = position.toLowerCase();
  if (pos.includes('goalkeeper')) return 'Goalkeeper';
  if (pos.includes('defender')) return 'Defender';
  if (pos.includes('midfielder')) return 'Midfielder';
  if (pos.includes('attacker') || pos.includes('forward')) return 'Attacker';
  return 'Midfielder'; // Por defecto
}

// Calcular precio basado en posición (igual que Primera División)
function calculatePrice(position: string): number {
  const normalized = normalizePosition(position);
  
  // Precios base para Segunda División (más bajos que Primera)
  const priceRanges = {
    'Goalkeeper': { min: 5, max: 15 },
    'Defender': { min: 5, max: 18 },
    'Midfielder': { min: 6, max: 20 },
    'Attacker': { min: 8, max: 22 }
  };
  
  const range = priceRanges[normalized as keyof typeof priceRanges] || { min: 5, max: 15 };
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

async function fetchTeams(): Promise<Team[]> {
  console.log('📋 Obteniendo equipos de Segunda División...');
  
  try {
    const response = await axios.get(`${API_BASE}/teams`, {
      headers: HEADERS,
      params: {
        league: SEGUNDA_DIVISION_LEAGUE_ID,
        season: CURRENT_SEASON
      }
    });
    
    const teams: Team[] = response.data.response;
    console.log(`✅ ${teams.length} equipos encontrados\n`);
    return teams;
  } catch (error: any) {
    console.error('❌ Error al obtener equipos:', error.message);
    throw error;
  }
}

async function fetchPlayersForTeam(teamId: number, teamName: string): Promise<PlayerFromAPI[]> {
  console.log(`   📥 Cargando jugadores de ${teamName}...`);
  
  try {
    const response = await axios.get(`${API_BASE}/players`, {
      headers: HEADERS,
      params: {
        team: teamId,
        season: CURRENT_SEASON,
        league: SEGUNDA_DIVISION_LEAGUE_ID
      }
    });
    
    const players: PlayerFromAPI[] = response.data.response;
    console.log(`      ✅ ${players.length} jugadores`);
    
    // Esperar 500ms para no saturar la API (150 requests/minuto = ~400ms entre requests)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return players;
  } catch (error: any) {
    console.error(`      ❌ Error: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🚀 Iniciando carga de jugadores de Segunda División\n');
  console.log(`Liga: Segunda División (ID ${SEGUNDA_DIVISION_LEAGUE_ID})`);
  console.log(`Temporada: ${CURRENT_SEASON}\n`);
  
  try {
    // 1. Obtener todos los equipos
    const teams = await fetchTeams();
    
    if (teams.length === 0) {
      console.log('⚠️  No se encontraron equipos. Abortando.');
      return;
    }
    
    // 2. Cargar jugadores de cada equipo
    const allPlayers: any[] = [];
    let teamCount = 0;
    
    for (const teamData of teams) {
      teamCount++;
      console.log(`\n[${teamCount}/${teams.length}] ${teamData.team.name}`);
      
      const players = await fetchPlayersForTeam(teamData.team.id, teamData.team.name);
      
      for (const playerData of players) {
        // Filtrar estadísticas de Segunda División
        const stats = playerData.statistics.find(
          s => s.league.id === SEGUNDA_DIVISION_LEAGUE_ID && s.league.season === CURRENT_SEASON
        );
        
        if (!stats) continue;
        
        const position = normalizePosition(stats.games.position);
        
        allPlayers.push({
          id: playerData.player.id,
          name: playerData.player.name,
          position: position,
          teamId: teamData.team.id,
          teamHistory: [teamData.team.id],
          teamName: teamData.team.name,
          teamCrest: teamData.team.logo,
          nationality: playerData.player.nationality || 'Unknown',
          shirtNumber: stats.games.number || null,
          photo: playerData.player.photo || null,
          price: calculatePrice(position),
          availabilityStatus: 'AVAILABLE',
          availabilityInfo: null,
          lastJornadaPoints: 0,
          lastJornadaNumber: 0
        });
      }
    }
    
    console.log(`\n\n📊 Total de jugadores recopilados: ${allPlayers.length}`);
    
    if (allPlayers.length === 0) {
      console.log('⚠️  No hay jugadores para guardar');
      return;
    }
    
    // 3. Guardar en base de datos
    console.log('\n💾 Guardando jugadores en la base de datos...');
    
    let saved = 0;
    let updated = 0;
    
    for (const player of allPlayers) {
      try {
        const result = await (prisma as any).playerSegunda.upsert({
          where: { id: player.id },
          update: {
            name: player.name,
            position: player.position,
            teamId: player.teamId,
            teamName: player.teamName,
            teamCrest: player.teamCrest,
            nationality: player.nationality,
            shirtNumber: player.shirtNumber,
            photo: player.photo,
            price: player.price,
            updatedAt: new Date()
          },
          create: player
        });
        
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          saved++;
        } else {
          updated++;
        }
      } catch (error: any) {
        console.error(`   ❌ Error guardando jugador ${player.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ ${saved} jugadores nuevos guardados`);
    console.log(`✅ ${updated} jugadores actualizados`);
    console.log(`✅ Total: ${saved + updated} jugadores procesados`);
    
    // 4. Mostrar resumen por equipo
    console.log('\n📈 Resumen por equipo:');
    const teamCounts = new Map<string, number>();
    allPlayers.forEach(p => {
      teamCounts.set(p.teamName, (teamCounts.get(p.teamName) || 0) + 1);
    });
    
    for (const [team, count] of Array.from(teamCounts.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${team}: ${count} jugadores`);
    }
    
    // 5. Resumen por posición
    console.log('\n📊 Resumen por posición:');
    const positionCounts = new Map<string, number>();
    allPlayers.forEach(p => {
      positionCounts.set(p.position, (positionCounts.get(p.position) || 0) + 1);
    });
    
    for (const [pos, count] of positionCounts.entries()) {
      console.log(`   ${pos}: ${count} jugadores`);
    }
    
    console.log('\n✨ ¡Proceso completado exitosamente!');
    
  } catch (error: any) {
    console.error('\n❌ Error fatal:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
