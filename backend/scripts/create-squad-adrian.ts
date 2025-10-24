import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSquadForAdrian() {
  try {
    console.log('🎯 Iniciando creación de plantilla para adrian.estrada en liga CBO...\n');

    // 1. Buscar al usuario adrian.estrada
    const user = await prisma.user.findUnique({
      where: { email: 'adrian.estrada2001@gmail.com' }
    });

    if (!user) {
      console.error('❌ No se encontró el usuario adrian.estrada2001@gmail.com');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.name || user.email} (ID: ${user.id})`);

    // 2. Buscar la liga CBO
    const league = await prisma.league.findFirst({
      where: {
        OR: [
          { name: { contains: 'Test1', mode: 'insensitive' } },
          { name: { contains: 'Test1', mode: 'insensitive' } },
          { code: { contains: 'Test1', mode: 'insensitive' } }
        ]
      }
    });

    if (!league) {
      console.error('❌ No se encontró la liga CBO');
      console.log('\nLigas disponibles:');
      const leagues = await prisma.league.findMany();
      leagues.forEach(l => console.log(`  - ${l.name} (Código: ${l.code})`));
      return;
    }

    console.log(`✅ Liga encontrada: ${league.name} (ID: ${league.id})\n`);

    // 3. Verificar que el usuario es miembro de la liga
    const membership = await prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: user.id
        }
      }
    });

    if (!membership) {
      console.error(`❌ ${user.email} no es miembro de la liga ${league.name}`);
      return;
    }

    console.log(`✅ Usuario es miembro de la liga con presupuesto: ${membership.budget}M\n`);

    // 4. Verificar si ya tiene plantilla
    const existingSquad = await prisma.squad.findUnique({
      where: {
        userId_leagueId: {
          userId: user.id,
          leagueId: league.id
        }
      },
      include: { players: true }
    });

    if (existingSquad) {
      console.log(`⚠️  El usuario ya tiene una plantilla en esta liga:`);
      console.log(`   Formación: ${existingSquad.formation}`);
      console.log(`   Jugadores: ${existingSquad.players.length}`);
      
      const deleteExisting = true; // Cambiar a false si no quieres borrar
      
      if (deleteExisting) {
        console.log('\n🗑️  Eliminando plantilla existente...');
        await prisma.squad.delete({
          where: { id: existingSquad.id }
        });
        console.log('✅ Plantilla anterior eliminada\n');
      } else {
        console.log('\n❌ No se creará una nueva plantilla. Elimina la existente primero.');
        return;
      }
    }

    // 5. Obtener todos los jugadores de LaLiga para seleccionar los mejores
    const allPlayers = await prisma.player.findMany({
      where: {
        teamName: {
          not: ''
        }
      },
      orderBy: {
        price: 'desc' // Ordenar por precio (los caros suelen ser mejores)
      }
    });

    console.log(`📊 Total de jugadores disponibles: ${allPlayers.length}\n`);

    // 6. Seleccionar jugadores decentes por posición
    // Formación 4-3-3
    const formation = '4-3-3';
    const MAX_BUDGET = 500; // Presupuesto máximo de 500M
    
    // Filtrar jugadores por posición
    const goalkeepers = allPlayers.filter(p => p.position === 'Goalkeeper');
    const defenders = allPlayers.filter(p => p.position === 'Defender');
    const midfielders = allPlayers.filter(p => p.position === 'Midfielder');
    const attackers = allPlayers.filter(p => p.position === 'Attacker');

    if (goalkeepers.length === 0 || defenders.length < 4 || midfielders.length < 3 || attackers.length < 3) {
      console.error('❌ No hay suficientes jugadores disponibles en la base de datos');
      console.log(`   Porteros: ${goalkeepers.length}`);
      console.log(`   Defensas: ${defenders.length}`);
      console.log(`   Centrocampistas: ${midfielders.length}`);
      console.log(`   Delanteros: ${attackers.length}`);
      return;
    }

    // Función para seleccionar jugadores dentro del presupuesto
    const selectPlayersWithinBudget = (maxBudget: number) => {
      // Presupuesto aproximado por posición (ajustable)
      const budgetPerPosition = {
        goalkeeper: Math.floor(maxBudget * 0.08), // 8% del presupuesto (~40M)
        defender: Math.floor(maxBudget * 0.06),   // 6% por defensa (~30M cada uno = 120M total)
        midfielder: Math.floor(maxBudget * 0.08), // 8% por centrocampista (~40M cada uno = 120M total)
        attacker: Math.floor(maxBudget * 0.12),   // 12% por delantero (~60M cada uno = 180M total)
      };

      const selected: Array<{ position: string; player: any; role: string }> = [];
      
      // Seleccionar portero
      const gk = goalkeepers.find(p => p.price <= budgetPerPosition.goalkeeper) || goalkeepers[goalkeepers.length - 1];
      selected.push({ position: 'por', player: gk, role: 'POR' });
      
      // Seleccionar 4 defensas
      for (let i = 1; i <= 4; i++) {
        const def = defenders.find(p => p.price <= budgetPerPosition.defender && !selected.some(s => s.player.id === p.id)) 
                    || defenders.find(p => !selected.some(s => s.player.id === p.id))!;
        selected.push({ position: `def${i}`, player: def, role: 'DEF' });
      }
      
      // Seleccionar 3 centrocampistas
      for (let i = 1; i <= 3; i++) {
        const mid = midfielders.find(p => p.price <= budgetPerPosition.midfielder && !selected.some(s => s.player.id === p.id))
                    || midfielders.find(p => !selected.some(s => s.player.id === p.id))!;
        selected.push({ position: `cen${i}`, player: mid, role: 'CEN' });
      }
      
      // Seleccionar 3 delanteros
      for (let i = 1; i <= 3; i++) {
        const att = attackers.find(p => p.price <= budgetPerPosition.attacker && !selected.some(s => s.player.id === p.id))
                    || attackers.find(p => !selected.some(s => s.player.id === p.id))!;
        selected.push({ position: `del${i}`, player: att, role: 'DEL' });
      }
      
      return selected;
    };

    // Intentar seleccionar jugadores dentro del presupuesto
    let selectedPlayers = selectPlayersWithinBudget(MAX_BUDGET);
    let totalCost = selectedPlayers.reduce((sum, sp) => sum + sp.player.price, 0);

    // Si aún excede el presupuesto, ajustar con jugadores más baratos
    let attempts = 0;
    while (totalCost > MAX_BUDGET && attempts < 5) {
      attempts++;
      console.log(`⚠️  Intento ${attempts}: Costo ${totalCost}M excede ${MAX_BUDGET}M. Ajustando...`);
      
      // Reducir presupuesto por posición
      const reducedBudget = MAX_BUDGET - (attempts * 20);
      selectedPlayers = selectPlayersWithinBudget(reducedBudget);
      totalCost = selectedPlayers.reduce((sum, sp) => sum + sp.player.price, 0);
    }

    // Si todavía excede, seleccionar los más baratos
    if (totalCost > MAX_BUDGET) {
      console.log(`⚠️  Seleccionando jugadores más baratos disponibles...`);
      selectedPlayers = [
        { position: 'por', player: goalkeepers[goalkeepers.length - 1], role: 'POR' },
        { position: 'def1', player: defenders[defenders.length - 1], role: 'DEF' },
        { position: 'def2', player: defenders[defenders.length - 2], role: 'DEF' },
        { position: 'def3', player: defenders[defenders.length - 3], role: 'DEF' },
        { position: 'def4', player: defenders[defenders.length - 4], role: 'DEF' },
        { position: 'cen1', player: midfielders[midfielders.length - 1], role: 'CEN' },
        { position: 'cen2', player: midfielders[midfielders.length - 2], role: 'CEN' },
        { position: 'cen3', player: midfielders[midfielders.length - 3], role: 'CEN' },
        { position: 'del1', player: attackers[attackers.length - 1], role: 'DEL' },
        { position: 'del2', player: attackers[attackers.length - 2], role: 'DEL' },
        { position: 'del3', player: attackers[attackers.length - 3], role: 'DEL' },
      ];
      totalCost = selectedPlayers.reduce((sum, sp) => sum + sp.player.price, 0);
    }

    console.log('💰 Costo total de la plantilla:', totalCost, 'M');
    console.log('💰 Presupuesto máximo permitido:', MAX_BUDGET, 'M');
    console.log('💵 Presupuesto del usuario:', membership.budget, 'M\n');

    if (totalCost > MAX_BUDGET) {
      console.error(`❌ No se pudo crear una plantilla dentro del límite de ${MAX_BUDGET}M`);
      console.error(`   Costo final: ${totalCost}M`);
      return;
    }

    // 7. Crear la plantilla
    console.log('🏗️  Creando plantilla...\n');
    console.log('📋 Jugadores seleccionados:');
    selectedPlayers.forEach(sp => {
      console.log(`   ${sp.position.toUpperCase().padEnd(5)} - ${sp.player.name.padEnd(25)} (${sp.player.price}M) - ${sp.player.teamName}`);
    });
    console.log();

    const squad = await prisma.squad.create({
      data: {
        userId: user.id,
        leagueId: league.id,
        formation: formation,
        players: {
          create: selectedPlayers.map(sp => ({
            position: sp.position,
            playerId: sp.player.id,
            playerName: sp.player.name,
            role: sp.role,
            pricePaid: sp.player.price,
            isCaptain: sp.position === 'del1' // El primer delantero es capitán
          }))
        }
      },
      include: {
        players: true
      }
    });

    // 8. Actualizar el presupuesto del usuario
    const finalCost = selectedPlayers.reduce((sum, sp) => sum + sp.player.price, 0);
    const newBudget = membership.budget - finalCost;

    await prisma.leagueMember.update({
      where: {
        leagueId_userId: {
          leagueId: league.id,
          userId: user.id
        }
      },
      data: {
        budget: newBudget
      }
    });

    console.log('✅ ¡Plantilla creada exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`   Formación: ${squad.formation}`);
    console.log(`   Jugadores: ${squad.players.length}`);
    console.log(`   Capitán: ${squad.players.find(p => p.isCaptain)?.playerName || 'No definido'}`);
    console.log(`   Costo total: ${finalCost}M`);
    console.log(`   Presupuesto restante: ${newBudget}M`);
    console.log(`   Presupuesto inicial: ${membership.budget + finalCost}M\n`);

  } catch (error) {
    console.error('❌ Error al crear la plantilla:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSquadForAdrian();
