import { PrismaClient } from '@prisma/client';
import axios from 'axios';
const prisma = new PrismaClient();
async function checkCarlosMartin() {
    try {
        // Buscar Carlos Martín
        const player = await prisma.player.findFirst({
            where: {
                name: {
                    contains: 'Carlos Martín',
                    mode: 'insensitive'
                },
                teamName: {
                    contains: 'Atletico',
                    mode: 'insensitive'
                }
            }
        });
        if (!player) {
            console.log('❌ No se encontró a Carlos Martín');
            return;
        }
        console.log(`\n✅ Jugador encontrado:`);
        console.log(`   Nombre: ${player.name}`);
        console.log(`   Equipo: ${player.teamName}`);
        console.log(`   API ID: ${player.id}`);
        console.log(`   Posición: ${player.position}`);
        // Obtener sus estadísticas de jornada 10
        const stats = await prisma.playerStats.findFirst({
            where: {
                playerId: player.id,
                jornada: 10
            }
        });
        if (stats) {
            console.log(`\n📊 Estadísticas en BD (Jornada 10):`);
            console.log(`   Minutos: ${stats.minutes}`);
            console.log(`   Puntos: ${stats.totalPoints}`);
            console.log(`   Fixture ID: ${stats.fixtureId}`);
            console.log(`   Desglose:`, stats.pointsBreakdown);
            // Consultar la API para ver los datos reales
            console.log(`\n🌐 Consultando API-Football...`);
            const response = await axios.get(`https://v3.football.api-sports.io/fixtures/players`, {
                params: {
                    fixture: stats.fixtureId,
                    player: player.id
                },
                headers: {
                    'x-apisports-key': process.env.API_FOOTBALL_KEY || ''
                }
            });
            if (response.data.response && response.data.response.length > 0) {
                const playerData = response.data.response[0];
                const playerStats = playerData.statistics?.[0];
                console.log(`\n✅ Datos de la API:`);
                console.log(`   Minutos: ${playerStats?.games?.minutes || 0}`);
                console.log(`   Posición: ${playerStats?.games?.position || 'N/A'}`);
                console.log(`   Fue suplente: ${playerStats?.games?.substitute ? 'Sí' : 'No'}`);
                console.log(`   Rating: ${playerStats?.games?.rating || 'N/A'}`);
                console.log(`\n   Estadísticas completas:`, JSON.stringify(playerStats, null, 2));
                // Buscar eventos del partido
                console.log(`\n📋 Consultando eventos del partido...`);
                const eventsResponse = await axios.get(`https://v3.football.api-sports.io/fixtures/events`, {
                    params: {
                        fixture: stats.fixtureId
                    },
                    headers: {
                        'x-apisports-key': process.env.API_FOOTBALL_KEY || ''
                    }
                });
                const playerEvents = eventsResponse.data.response.filter((e) => e.player?.id === player.id ||
                    e.assist?.id === player.id ||
                    e.player?.name?.includes('Carlos Martín') ||
                    e.assist?.name?.includes('Carlos Martín'));
                if (playerEvents.length > 0) {
                    console.log(`\n📌 Eventos del jugador en el partido:`);
                    playerEvents.forEach((e) => {
                        console.log(`   - ${e.type} en min ${e.time?.elapsed}: ${e.detail}`);
                        if (e.player)
                            console.log(`     Jugador: ${e.player.name}`);
                        if (e.assist)
                            console.log(`     Asistente/Entrada: ${e.assist.name}`);
                    });
                }
                else {
                    console.log(`\n⚠️  No se encontraron eventos del jugador (sustituciones, goles, etc.)`);
                }
            }
            else {
                console.log(`\n❌ No se encontraron datos en la API para este jugador/partido`);
            }
        }
        else {
            console.log(`\n❌ No se encontraron estadísticas para jornada 10`);
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Respuesta de la API:', error.response.data);
        }
    }
    finally {
        await prisma.$disconnect();
    }
}
checkCarlosMartin();
