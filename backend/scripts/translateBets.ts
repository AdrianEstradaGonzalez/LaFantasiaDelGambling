/**
 * Script para traducir todas las apuestas en inglés a español en la base de datos
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapa completo de traducciones de tipos de apuesta
const BET_TYPE_TRANSLATIONS: Record<string, string> = {
  // Resultados
  'Match Winner': 'Ganador del Partido',
  'Winner': 'Ganador del Partido',
  'First Half Winner': 'Ganador Primera Parte',
  'Second Half Winner': 'Ganador Segunda Parte',
  'Fulltime Result': 'Resultado Final',
  'Halftime Result': 'Resultado al Descanso',
  'Halftime/Fulltime': 'Resultado Descanso/Final',
  
  // Goles
  'Goals Over/Under': 'Más/Menos Goles',
  'Over/Under': 'Más/Menos Goles',
  'Total Goals': 'Total de Goles',
  'Home Team Total Goals': 'Total Goles Local',
  'Away Team Total Goals': 'Total Goles Visitante',
  'Both Teams Score': 'Ambos Equipos Marcan',
  'Both Teams To Score': 'Ambos Equipos Marcan',
  'BTTS': 'Ambos Equipos Marcan',
  'First Team To Score': 'Primer Equipo en Marcar',
  'Last Team To Score': 'Último Equipo en Marcar',
  'Highest Scoring Half': 'Parte con Más Goles',
  'Team To Score First': 'Equipo que Marca Primero',
  'Team To Score Last': 'Equipo que Marca Último',
  'Anytime Goalscorer': 'Marcará en Cualquier Momento',
  'First Goalscorer': 'Primer Goleador',
  'Last Goalscorer': 'Último Goleador',
  
  // Mitades del partido
  'First Half Goals Over/Under': 'Más/Menos Goles Primera Parte',
  'Second Half Goals Over/Under': 'Más/Menos Goles Segunda Parte',
  'First Half Total Goals': 'Total Goles Primera Parte',
  'Second Half Total Goals': 'Total Goles Segunda Parte',
  'Highest Scoring Half 2nd Half': 'Segunda Parte con Más Goles',
  'Highest Scoring Half 1st Half': 'Primera Parte con Más Goles',
  'Goal In Both Halves': 'Gol en Ambas Partes',
  
  // Corners y tarjetas
  'Corners Over/Under': 'Más/Menos Corners',
  'Total Corners': 'Total de Corners',
  'Home Team Corners': 'Corners del Local',
  'Away Team Corners': 'Corners del Visitante',
  'First Half Corners': 'Corners Primera Parte',
  'Second Half Corners': 'Corners Segunda Parte',
  'Cards Over/Under': 'Más/Menos Tarjetas',
  'Total Cards': 'Total de Tarjetas',
  'Home Team Cards': 'Tarjetas del Local',
  'Away Team Cards': 'Tarjetas del Visitante',
  'Player Cards': 'Tarjetas de Jugadores',
  
  // Win To Nil y Clean Sheet
  'Win To Nil': 'Ganar sin Encajar',
  'Home Win To Nil': 'Local Gana sin Encajar',
  'Away Win To Nil': 'Visitante Gana sin Encajar',
  'Clean Sheet': 'Portería a Cero',
  'Clean Sheet - Home': 'Portería a Cero - Local',
  'Clean Sheet - Away': 'Portería a Cero - Visitante',
  'Home Clean Sheet': 'Portería a Cero Local',
  'Away Clean Sheet': 'Portería a Cero Visitante',
  
  // Otros
  'Double Chance': 'Doble Oportunidad',
  'Home/Away': 'Gana Local o Visitante (Sin Empate)',
  'Draw No Bet': 'Gana con Reembolso si Empate',
  'To Qualify': 'Clasificación',
  'Exact Score': 'Resultado Exacto',
  'Correct Score': 'Resultado Exacto',
  'Score In Both Halves': 'Marcar en Ambas Partes',
  'Win Either Half': 'Ganar Alguna Parte',
  'Win Both Halves': 'Ganar Ambas Partes',
  'To Win From Behind': 'Ganar Remontando',
  'To Win To Nil': 'Ganar sin Encajar',
  'Odd/Even': 'Goles Par/Impar',
  'Odd/Even Goals': 'Goles Par/Impar',
  'Home Odd/Even': 'Goles Par/Impar Local',
  'Away Odd/Even': 'Goles Par/Impar Visitante',
  'Asian Handicap': 'Hándicap Asiático',
  'European Handicap': 'Hándicap Europeo',
  'Handicap': 'Hándicap',
  'Handicap Result': 'Resultado con Hándicap',
  'Alternative Handicap': 'Hándicap Alternativo',
  'Goals Handicap': 'Hándicap de Goles',
  '3-Way Handicap': 'Hándicap 3 Vías',
  
  // Tiempo del primer gol
  'Time Of First Goal': 'Tiempo del Primer Gol',
  'First Goal': 'Primer Gol',
  '10 Minutes Result': 'Resultado 10 Minutos',
  '15 Minutes Result': 'Resultado 15 Minutos',
  
  // Combinadas
  'Both Teams To Score & Total': 'Ambos Marcan y Total',
  'Result & Both Teams To Score': 'Resultado y Ambos Marcan',
  'Result & Total Goals': 'Resultado y Total de Goles',
  'Home Team Score A Goal': 'Local Marca un Gol',
  'Away Team Score A Goal': 'Visitante Marca un Gol',
  'Home Team Score a Goal': 'Local Marca un Gol',
  'Away Team Score a Goal': 'Visitante Marca un Gol',
  'Multigoals': 'Multigoles',
  'Home Multigoals': 'Multigoles Local',
  'Away Multigoals': 'Multigoles Visitante',
};

// Mapa de traducciones de etiquetas
const BET_LABEL_TRANSLATIONS: Record<string, string> = {
  // Resultados básicos
  'Home': 'Gana Local',
  'Draw': 'Empate',
  'Away': 'Gana Visitante',
  'X': 'Empate',
  '1': 'Gana Local',
  '2': 'Gana Visitante',
  
  // Doble oportunidad
  'Home/Draw': 'Local o Empate',
  'Home/Away': 'Local o Visitante',
  'Draw/Away': 'Empate o Visitante',
  '1X': 'Local o Empate',
  '12': 'Local o Visitante',
  'X2': 'Empate o Visitante',
  
  // Sí/No
  'Yes': 'Sí',
  'No': 'No',
  
  // Over/Under
  'Over': 'Más de',
  'Under': 'Menos de',
  
  // Par/Impar
  'Odd': 'Impar',
  'Even': 'Par',
  
  // Partes del partido
  '1st Half': 'Primera Parte',
  '2nd Half': 'Segunda Parte',
  'First Half': 'Primera Parte',
  'Second Half': 'Segunda Parte',
  'None': 'Ninguno',
  'Both': 'Ambos',
  'Either': 'Cualquiera',
  
  // Rangos de tiempo
  '0-10': '0-10 min',
  '11-20': '11-20 min',
  '21-30': '21-30 min',
  '31-40': '31-40 min',
  '41-50': '41-50 min',
  '51-60': '51-60 min',
  '61-70': '61-70 min',
  '71-80': '71-80 min',
  '81-90': '81-90 min',
  'No Goal': 'Sin Goles',
};

async function translateAllBets() {
  console.log('🔄 Iniciando traducción de apuestas...\n');

  try {
    // Obtener todas las apuestas
    const allBets = await prisma.bet_option.findMany();
    console.log(`📊 Total de apuestas encontradas: ${allBets.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const bet of allBets) {
      let needsUpdate = false;
      let newBetType = bet.betType;
      let newBetLabel = bet.betLabel;

      // Verificar si betType necesita traducción
      if (BET_TYPE_TRANSLATIONS[bet.betType]) {
        newBetType = BET_TYPE_TRANSLATIONS[bet.betType];
        needsUpdate = true;
        console.log(`   🔄 Tipo: "${bet.betType}" → "${newBetType}"`);
      }

      // Verificar si betLabel necesita traducción
      if (BET_LABEL_TRANSLATIONS[bet.betLabel]) {
        newBetLabel = BET_LABEL_TRANSLATIONS[bet.betLabel];
        needsUpdate = true;
        console.log(`   🔄 Etiqueta: "${bet.betLabel}" → "${newBetLabel}"`);
      }

      // Actualizar si es necesario
      if (needsUpdate) {
        await prisma.bet_option.update({
          where: { id: bet.id },
          data: {
            betType: newBetType,
            betLabel: newBetLabel,
          },
        });
        updatedCount++;
        console.log(`   ✅ Actualizada apuesta ID: ${bet.id}\n`);
      } else {
        skippedCount++;
      }
    }

    console.log('\n✅ Traducción completada!');
    console.log(`   📝 Apuestas actualizadas: ${updatedCount}`);
    console.log(`   ⏭️  Apuestas sin cambios: ${skippedCount}`);
    console.log(`   📊 Total procesadas: ${allBets.length}\n`);

  } catch (error) {
    console.error('❌ Error durante la traducción:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
translateAllBets()
  .then(() => {
    console.log('🎉 Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error ejecutando el script:', error);
    process.exit(1);
  });
