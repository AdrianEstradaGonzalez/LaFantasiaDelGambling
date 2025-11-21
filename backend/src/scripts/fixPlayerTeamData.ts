import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para arreglar jugadores con teamName/teamCrest inconsistentes
 * Sincroniza los datos usando un jugador de referencia del mismo equipo
 */
async function fixPlayerTeamData() {
  console.log('🔧 Iniciando corrección de datos de equipos en jugadores...\n');

  try {
    // 1️⃣ Arreglar jugadores de Primera División
    console.log('📊 Primera División:');
    const primeraPlayers = await prisma.player.findMany({
      select: { id: true, name: true, teamId: true, teamName: true, teamCrest: true }
    });

    // Agrupar por teamId para encontrar el nombre más común
    const teamData = new Map<number, { name: string; crest: string | null; count: number }>();
    
    for (const player of primeraPlayers) {
      const key = `${player.teamId}-${player.teamName}-${player.teamCrest}`;
      const existing = teamData.get(player.teamId);
      
      if (!existing || (player.teamName && player.teamName.length > 0)) {
        const current = Array.from(teamData.values()).find(t => 
          t.name === player.teamName && player.teamId === Array.from(teamData.keys()).find(id => teamData.get(id) === t)
        );
        const count = (current?.count || 0) + 1;
        
        if (!existing || count > existing.count) {
          teamData.set(player.teamId, {
            name: player.teamName,
            crest: player.teamCrest,
            count
          });
        }
      }
    }

    let fixedPrimera = 0;
    for (const player of primeraPlayers) {
      const correctData = teamData.get(player.teamId);
      
      if (correctData && (player.teamName !== correctData.name || player.teamCrest !== correctData.crest)) {
        console.log(`  ✏️  ${player.name}: "${player.teamName}" -> "${correctData.name}"`);
        await prisma.player.update({
          where: { id: player.id },
          data: {
            teamName: correctData.name,
            teamCrest: correctData.crest
          }
        });
        fixedPrimera++;
      }
    }
    console.log(`✅ Primera: ${fixedPrimera} jugadores actualizados\n`);

    // 2️⃣ Arreglar jugadores de Segunda División
    console.log('📊 Segunda División:');
    const segundaPlayers = await (prisma as any).playerSegunda.findMany({
      select: { id: true, name: true, teamId: true, teamName: true, teamCrest: true }
    });

    const teamDataSegunda = new Map<number, { name: string; crest: string | null; count: number }>();
    
    for (const player of segundaPlayers) {
      const existing = teamDataSegunda.get(player.teamId);
      const current = Array.from(teamDataSegunda.values()).find(t => 
        t.name === player.teamName && player.teamId === Array.from(teamDataSegunda.keys()).find(id => teamDataSegunda.get(id) === t)
      );
      const count = (current?.count || 0) + 1;
      
      if (!existing || count > existing.count) {
        teamDataSegunda.set(player.teamId, {
          name: player.teamName,
          crest: player.teamCrest,
          count
        });
      }
    }

    let fixedSegunda = 0;
    for (const player of segundaPlayers) {
      const correctData = teamDataSegunda.get(player.teamId);
      
      if (correctData && (player.teamName !== correctData.name || player.teamCrest !== correctData.crest)) {
        console.log(`  ✏️  ${player.name}: "${player.teamName}" -> "${correctData.name}"`);
        await (prisma as any).playerSegunda.update({
          where: { id: player.id },
          data: {
            teamName: correctData.name,
            teamCrest: correctData.crest
          }
        });
        fixedSegunda++;
      }
    }
    console.log(`✅ Segunda: ${fixedSegunda} jugadores actualizados\n`);

    // 3️⃣ Arreglar jugadores de Premier League
    console.log('📊 Premier League:');
    const premierPlayers = await (prisma as any).playerPremier.findMany({
      select: { id: true, name: true, teamId: true, teamName: true, teamCrest: true }
    });

    const teamDataPremier = new Map<number, { name: string; crest: string | null; count: number }>();
    
    for (const player of premierPlayers) {
      const existing = teamDataPremier.get(player.teamId);
      const current = Array.from(teamDataPremier.values()).find(t => 
        t.name === player.teamName && player.teamId === Array.from(teamDataPremier.keys()).find(id => teamDataPremier.get(id) === t)
      );
      const count = (current?.count || 0) + 1;
      
      if (!existing || count > existing.count) {
        teamDataPremier.set(player.teamId, {
          name: player.teamName,
          crest: player.teamCrest,
          count
        });
      }
    }

    let fixedPremier = 0;
    for (const player of premierPlayers) {
      const correctData = teamDataPremier.get(player.teamId);
      
      if (correctData && (player.teamName !== correctData.name || player.teamCrest !== correctData.crest)) {
        console.log(`  ✏️  ${player.name}: "${player.teamName}" -> "${correctData.name}"`);
        await (prisma as any).playerPremier.update({
          where: { id: player.id },
          data: {
            teamName: correctData.name,
            teamCrest: correctData.crest
          }
        });
        fixedPremier++;
      }
    }
    console.log(`✅ Premier: ${fixedPremier} jugadores actualizados\n`);

    console.log(`🎉 Proceso completado!`);
    console.log(`   Total actualizados: ${fixedPrimera + fixedSegunda + fixedPremier}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
fixPlayerTeamData()
  .catch(console.error);
