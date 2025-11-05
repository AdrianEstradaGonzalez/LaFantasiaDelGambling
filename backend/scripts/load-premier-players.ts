/**
 * Script para cargar jugadores de la Premier League
 * 
 * Este script obtiene todos los jugadores de la Premier League
 * desde la API de Football y los guarda en la tabla player_premier
 * 
 * Uso: npx tsx scripts/load-premier-players.ts
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuración de la API
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.FOOTBALL_API_KEY || '07bc9c707fe2d6169fff6e17d4a9e6fd';
const HEADERS = {
  'x-rapidapi-key': API_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io',
};

const PREMIER_LEAGUE_ID = 39; // Premier League
const CURRENT_SEASON = 2025; // La temporada 2024-2025

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

// Calcular precio basado en posición (Premier League - precios más altos)
function calculatePrice(position: string): number {
  const normalized = normalizePosition(position);
  
  // Precios base para Premier League (más altos que España)
  const priceRanges = {
    'Goalkeeper': { min: 8, max: 20 },
    'Defender': { min: 8, max: 25 },
    'Midfielder': { min: 10, max: 30 },
    'Attacker': { min: 12, max: 35 }
  };
  
  const range = priceRanges[normalized as keyof typeof priceRanges] || { min: 8, max: 20 };
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

async function fetchTeams(): Promise<Team[]> {
  console.log('📋 Obteniendo equipos de la Premier League...');
  
  try {
    const response = await axios.get(`${API_BASE}/teams`, {
      headers: HEADERS,
      params: {
        league: PREMIER_LEAGUE_ID,
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
    // Primera petición: jugadores con estadísticas de liga
    const response = await axios.get(`${API_BASE}/players`, {
      headers: HEADERS,
      params: {
        team: teamId,
        season: CURRENT_SEASON,
        league: PREMIER_LEAGUE_ID
      }
    });
    
    const playersWithStats: PlayerFromAPI[] = response.data.response;
    console.log(`      ✅ ${playersWithStats.length} jugadores con estadísticas`);
    
    // Esperar 500ms para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Segunda petición: TODOS los jugadores del equipo (incluye los sin stats)
    const responseAll = await axios.get(`${API_BASE}/players/squads`, {
      headers: HEADERS,
      params: {
        team: teamId
      }
    });
    
    const squadData = responseAll.data.response[0];
    if (!squadData || !squadData.players) {
      return playersWithStats;
    }
    
    const allSquadPlayers = squadData.players;
    console.log(`      📋 ${allSquadPlayers.length} jugadores en plantilla total`);
    
    // Esperar 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Combinar: priorizar los que tienen stats, agregar los que faltan
    const playerIds = new Set(playersWithStats.map(p => p.player.id));
    const missingPlayers: PlayerFromAPI[] = [];
    
    for (const squadPlayer of allSquadPlayers) {
      if (!playerIds.has(squadPlayer.id)) {
        // Este jugador está en la plantilla pero no tiene stats
        // Crear estructura compatible
        missingPlayers.push({
          player: {
            id: squadPlayer.id,
            name: squadPlayer.name,
            age: squadPlayer.age,
            nationality: squadPlayer.nationality,
            photo: squadPlayer.photo
          },
          statistics: [{
            team: {
              id: teamId,
              name: teamName,
              logo: ''
            },
            league: {
              id: PREMIER_LEAGUE_ID,
              name: 'Premier League',
              country: 'England',
              season: CURRENT_SEASON
            },
            games: {
              position: squadPlayer.position,
              number: squadPlayer.number
            }
          }]
        });
      }
    }
    
    if (missingPlayers.length > 0) {
      console.log(`      ➕ ${missingPlayers.length} jugadores sin stats añadidos`);
    }
    
    return [...playersWithStats, ...missingPlayers];
  } catch (error: any) {
    console.error(`      ❌ Error: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🚀 Iniciando carga de jugadores de la Premier League\n');
  console.log(`Liga: Premier League (ID ${PREMIER_LEAGUE_ID})`);
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
        // Filtrar estadísticas de Premier League
        const stats = playerData.statistics.find(
          s => s.league.id === PREMIER_LEAGUE_ID && s.league.season === CURRENT_SEASON
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
    
    // 3. Guardar en base de datos (solo los nuevos)
    console.log('\n💾 Guardando jugadores en la base de datos...');
    
    let saved = 0;
    let skipped = 0;
    
    for (const player of allPlayers) {
      try {
        // Verificar si ya existe
        const existing = await (prisma as any).playerPremier.findUnique({
          where: { id: player.id }
        });
        
        if (existing) {
          skipped++;
          continue; // Ya existe, no hacer nada
        }
        
        // No existe, crear nuevo
        await (prisma as any).playerPremier.create({
          data: player
        });
        
        saved++;
      } catch (error: any) {
        console.error(`   ❌ Error guardando jugador ${player.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ ${saved} jugadores nuevos guardados`);
    console.log(`⏭️  ${skipped} jugadores ya existían (omitidos)`);
    console.log(`✅ Total: ${saved + skipped} jugadores procesados`);
    
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
