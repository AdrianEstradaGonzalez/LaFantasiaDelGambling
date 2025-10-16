import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
async function exportPlayersPrices() {
    try {
        console.log('🔄 Exportando jugadores con precios...\n');
        // Obtener todos los jugadores ordenados por precio descendente
        const players = await prisma.player.findMany({
            orderBy: [
                { price: 'desc' },
                { name: 'asc' }
            ],
            select: {
                name: true,
                price: true,
                position: true,
                teamName: true
            }
        });
        if (players.length === 0) {
            console.log('❌ No hay jugadores en la base de datos');
            return;
        }
        // Generar contenido del archivo
        let content = `# JUGADORES Y PRECIOS - LaFantasiaDelGambling
# Generado: ${new Date().toLocaleString('es-ES')}
# Total de jugadores: ${players.length}
# ================================================

`;
        // Agrupar por posición
        const positions = {
            'Goalkeeper': '🧤 PORTEROS',
            'Defender': '🛡️ DEFENSAS',
            'Midfielder': '⚙️ CENTROCAMPISTAS',
            'Attacker': '⚽ DELANTEROS'
        };
        for (const [positionKey, positionTitle] of Object.entries(positions)) {
            const positionPlayers = players.filter(p => p.position === positionKey);
            if (positionPlayers.length > 0) {
                content += `\n# ${positionTitle} (${positionPlayers.length} jugadores)\n`;
                content += `# ${'='.repeat(60)}\n\n`;
                for (const player of positionPlayers) {
                    content += `${player.name.padEnd(35)} ${player.price.toString().padStart(4)}M   (${player.teamName})\n`;
                }
            }
        }
        // Estadísticas
        const stats = {
            total: players.length,
            goalkeepers: players.filter(p => p.position === 'Goalkeeper').length,
            defenders: players.filter(p => p.position === 'Defender').length,
            midfielders: players.filter(p => p.position === 'Midfielder').length,
            attackers: players.filter(p => p.position === 'Attacker').length,
            avgPrice: Math.round(players.reduce((sum, p) => sum + p.price, 0) / players.length),
            maxPrice: Math.max(...players.map(p => p.price)),
            minPrice: Math.min(...players.map(p => p.price)),
            mostExpensive: players[0], // Ya está ordenado por precio desc
            cheapest: players[players.length - 1]
        };
        content += `\n\n# ${'='.repeat(60)}\n`;
        content += `# ESTADÍSTICAS\n`;
        content += `# ${'='.repeat(60)}\n\n`;
        content += `Total de jugadores:     ${stats.total}\n`;
        content += `  - Porteros:           ${stats.goalkeepers}\n`;
        content += `  - Defensas:           ${stats.defenders}\n`;
        content += `  - Centrocampistas:    ${stats.midfielders}\n`;
        content += `  - Delanteros:         ${stats.attackers}\n\n`;
        content += `Precio promedio:        ${stats.avgPrice}M\n`;
        content += `Precio máximo:          ${stats.maxPrice}M\n`;
        content += `Precio mínimo:          ${stats.minPrice}M\n\n`;
        content += `Jugador más caro:       ${stats.mostExpensive.name} (${stats.mostExpensive.price}M)\n`;
        content += `Jugador más barato:     ${stats.cheapest.name} (${stats.cheapest.price}M)\n`;
        // Guardar archivo TXT
        const txtPath = path.join(__dirname, '..', 'jugadores_precios.txt');
        fs.writeFileSync(txtPath, content, 'utf-8');
        // Generar también CSV
        let csvContent = 'Nombre,Precio (M),Posición,Equipo\n';
        for (const player of players) {
            csvContent += `"${player.name}",${player.price},${player.position},"${player.teamName}"\n`;
        }
        const csvPath = path.join(__dirname, '..', 'jugadores_precios.csv');
        fs.writeFileSync(csvPath, csvContent, 'utf-8');
        // Generar JSON también
        const jsonData = {
            generatedAt: new Date().toISOString(),
            totalPlayers: players.length,
            statistics: {
                total: stats.total,
                byPosition: {
                    goalkeepers: stats.goalkeepers,
                    defenders: stats.defenders,
                    midfielders: stats.midfielders,
                    attackers: stats.attackers
                },
                prices: {
                    average: stats.avgPrice,
                    max: stats.maxPrice,
                    min: stats.minPrice,
                    mostExpensive: {
                        name: stats.mostExpensive.name,
                        price: stats.mostExpensive.price,
                        team: stats.mostExpensive.teamName
                    },
                    cheapest: {
                        name: stats.cheapest.name,
                        price: stats.cheapest.price,
                        team: stats.cheapest.teamName
                    }
                }
            },
            players: players.map(p => ({
                name: p.name,
                price: p.price,
                position: p.position,
                team: p.teamName
            }))
        };
        const jsonPath = path.join(__dirname, '..', 'jugadores_precios.json');
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log(`\n✅ Archivos generados exitosamente:\n`);
        console.log(`📄 TXT: ${txtPath}`);
        console.log(`📊 CSV: ${csvPath}`);
        console.log(`🔧 JSON: ${jsonPath}`);
        console.log(`\n📊 Estadísticas:`);
        console.log(`   - Total de jugadores: ${stats.total}`);
        console.log(`   - Porteros: ${stats.goalkeepers}`);
        console.log(`   - Defensas: ${stats.defenders}`);
        console.log(`   - Centrocampistas: ${stats.midfielders}`);
        console.log(`   - Delanteros: ${stats.attackers}`);
        console.log(`   - Precio promedio: ${stats.avgPrice}M`);
        console.log(`   - Más caro: ${stats.mostExpensive.name} (${stats.mostExpensive.price}M)`);
        console.log(`   - Más barato: ${stats.cheapest.name} (${stats.cheapest.price}M)`);
    }
    catch (error) {
        console.error('❌ Error al exportar jugadores:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
exportPlayersPrices();
