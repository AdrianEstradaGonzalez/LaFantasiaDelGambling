import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reevaluateCleanSheetBets() {
  try {
    console.log('🔄 Buscando apuestas de Portería a Cero...');

    // Buscar todas las apuestas de Portería a Cero evaluadas
    const bets = await prisma.bet.findMany({
      where: {
        betType: {
          contains: 'Portería a Cero'
        },
        status: {
          not: 'pending'
        }
      },
      orderBy: {
        matchId: 'asc'
      }
    });

    console.log(`📊 Encontradas ${bets.length} apuestas de Portería a Cero\n`);

    let updatedCount = 0;
    
    // Agrupar por partido para ver qué resultados hay
    const matchesMap = new Map<number, any>();
    
    for (const bet of bets) {
      if (!matchesMap.has(bet.matchId)) {
        matchesMap.set(bet.matchId, {
          homeTeam: bet.homeTeam,
          awayTeam: bet.awayTeam,
          bets: []
        });
      }
      matchesMap.get(bet.matchId)!.bets.push(bet);
    }

    console.log(`🏟️  Partidos únicos: ${matchesMap.size}\n`);

    // Para cada partido, intentar extraer el resultado del apiValue
    for (const [matchId, matchData] of matchesMap.entries()) {
      console.log(`\n📍 Partido ${matchId}: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
      
      // Buscar una apuesta que tenga el resultado en apiValue
      let homeGoals: number | null = null;
      let awayGoals: number | null = null;
      
      // Intentar extraer el resultado de cualquier apuesta del partido
      for (const bet of matchData.bets) {
        if (bet.apiValue && typeof bet.apiValue === 'string') {
          // Buscar patrones como "X goles" en apiValue
          const goalsMatch = bet.apiValue.match(/(\d+)\s+goles?/);
          if (goalsMatch) {
            const goals = parseInt(goalsMatch[1]);
            
            // Determinar si es home o away según el betType
            if (bet.betType.includes('Local')) {
              // El apiValue tiene los goles ENCAJADOS por el local (awayGoals)
              awayGoals = goals;
            } else if (bet.betType.includes('Visitante')) {
              // El apiValue tiene los goles ENCAJADOS por el visitante (homeGoals)
              homeGoals = goals;
            }
          }
        }
      }

      // Intentar obtener de la BD si hay otras apuestas con el resultado
      const otherBets = await prisma.bet.findMany({
        where: {
          matchId: matchId,
          status: { not: 'pending' },
          apiValue: { not: null }
        },
        take: 20
      });
      
      console.log(`   Buscando resultado en ${otherBets.length} apuestas del mismo partido...`);
      
      // Buscar en otras apuestas del partido
      for (const otherBet of otherBets) {
        if (otherBet.apiValue && typeof otherBet.apiValue === 'string') {
          // Buscar patrón "X-Y" que indica resultado
          const scoreMatch = otherBet.apiValue.match(/(\d+)-(\d+)/);
          if (scoreMatch) {
            homeGoals = parseInt(scoreMatch[1]);
            awayGoals = parseInt(scoreMatch[2]);
            console.log(`   ✅ Resultado encontrado: ${homeGoals}-${awayGoals}`);
            break;
          }
        }
      }
      
      if (homeGoals === null || awayGoals === null) {
        console.log(`   ⚠️  No se pudo determinar el resultado completo del partido`);
        console.log(`   Home goals: ${homeGoals}, Away goals: ${awayGoals}`);
        console.log(`   ❌ Saltando este partido`);
        continue;
      }

      console.log(`   Resultado: ${matchData.homeTeam} ${homeGoals}-${awayGoals} ${matchData.awayTeam}`);

      // Ahora re-evaluar todas las apuestas de este partido
      for (const bet of matchData.bets) {
        const isLocal = bet.betType.toLowerCase().includes('local');
        const isVisitante = bet.betType.toLowerCase().includes('visitante');
        const labelLower = bet.betLabel.toLowerCase();
        const isSi = labelLower === 'sí' || labelLower === 'si';
        
        let won = false;
        let actualResult = '';
        
        if (isLocal) {
          // Portería a Cero - Local
          // Sí = el local no encajó goles (awayGoals === 0)
          // No = el local encajó goles (awayGoals > 0)
          const cleanSheet = awayGoals === 0;
          won = isSi ? cleanSheet : !cleanSheet;
          actualResult = `${matchData.homeTeam} encajó ${awayGoals} goles`;
        } else if (isVisitante) {
          // Portería a Cero - Visitante
          // Sí = el visitante no encajó goles (homeGoals === 0)
          // No = el visitante encajó goles (homeGoals > 0)
          const cleanSheet = homeGoals === 0;
          won = isSi ? cleanSheet : !cleanSheet;
          actualResult = `${matchData.awayTeam} encajó ${homeGoals} goles`;
        }

        const newStatus = won ? 'won' : 'lost';

        // Solo actualizar si el status cambió
        if (newStatus !== bet.status) {
          await prisma.bet.update({
            where: { id: bet.id },
            data: {
              status: newStatus,
              apiValue: actualResult,
              evaluatedAt: new Date()
            }
          });

          console.log(`   ✅ Actualizada apuesta ${bet.id}:`);
          console.log(`      Tipo: ${bet.betType} - ${bet.betLabel}`);
          console.log(`      Status: ${bet.status} → ${newStatus}`);
          
          updatedCount++;
        } else {
          console.log(`   ℹ️  Apuesta ${bet.id} ya estaba correcta (${newStatus})`);
        }
      }
    }

    console.log('\n✅ PROCESO COMPLETADO');
    console.log(`📊 Total de apuestas procesadas: ${bets.length}`);
    console.log(`✅ Apuestas actualizadas: ${updatedCount}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
reevaluateCleanSheetBets();
