import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function restoreBackup() {
  try {
    console.log('🔄 Leyendo backup...');
    const backupPath = path.join(__dirname, 'backups', 'railway-backup-2025-11-24T23-23-36.json');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const backup = backupData;

    console.log('🗑️ Limpiando base de datos...');
    // Limpiar en orden correcto para respetar foreign keys
    await prisma.bet_option.deleteMany({});
    await prisma.bet.deleteMany({});
    await prisma.betCombi.deleteMany({});
    await prisma.invalidTeam.deleteMany({});
    await prisma.squadHistory.deleteMany({});
    await prisma.squadPlayer.deleteMany({});
    await prisma.squad.deleteMany({});
    await prisma.leagueMember.deleteMany({});
    await prisma.league.deleteMany({});
    await prisma.playerJornadaPoints.deleteMany({});
    await prisma.playerStats.deleteMany({});
    await prisma.playerSegundaStats.deleteMany({});
    await prisma.playerPremierStats.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.playerSegunda.deleteMany({});
    await prisma.playerPremier.deleteMany({});
    await prisma.deviceToken.deleteMany({});
    await prisma.passwordResetCode.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('👤 Restaurando usuarios...');
    if (backup.data.user && backup.data.user.length > 0) {
      for (const user of backup.data.user) {
        await prisma.user.create({ data: user });
      }
      console.log(`  ✓ ${backup.data.user.length} usuarios`);
    }

    console.log('⚽ Restaurando jugadores...');
    if (backup.data.player && backup.data.player.length > 0) {
      for (const player of backup.data.player) {
        await prisma.player.create({ data: player });
      }
      console.log(`  ✓ ${backup.data.player.length} jugadores Primera`);
    }

    if (backup.data.playerSegunda && backup.data.playerSegunda.length > 0) {
      for (const player of backup.data.playerSegunda) {
        await prisma.playerSegunda.create({ data: player });
      }
      console.log(`  ✓ ${backup.data.playerSegunda.length} jugadores Segunda`);
    }

    if (backup.data.playerPremier && backup.data.playerPremier.length > 0) {
      for (const player of backup.data.playerPremier) {
        await prisma.playerPremier.create({ data: player });
      }
      console.log(`  ✓ ${backup.data.playerPremier.length} jugadores Premier`);
    }

    console.log('📊 Restaurando estadísticas...');
    if (backup.data.playerStats && backup.data.playerStats.length > 0) {
      for (const stat of backup.data.playerStats) {
        await prisma.playerStats.create({ data: stat });
      }
      console.log(`  ✓ ${backup.data.playerStats.length} stats Primera`);
    }

    if (backup.data.playerSegundaStats && backup.data.playerSegundaStats.length > 0) {
      for (const stat of backup.data.playerSegundaStats) {
        await prisma.playerSegundaStats.create({ data: stat });
      }
      console.log(`  ✓ ${backup.data.playerSegundaStats.length} stats Segunda`);
    }

    if (backup.data.playerPremierStats && backup.data.playerPremierStats.length > 0) {
      for (const stat of backup.data.playerPremierStats) {
        await prisma.playerPremierStats.create({ data: stat });
      }
      console.log(`  ✓ ${backup.data.playerPremierStats.length} stats Premier`);
    }

    if (backup.data.playerJornadaPoints && backup.data.playerJornadaPoints.length > 0) {
      for (const points of backup.data.playerJornadaPoints) {
        await prisma.playerJornadaPoints.create({ data: points });
      }
      console.log(`  ✓ ${backup.data.playerJornadaPoints.length} puntos jornada`);
    }

    console.log('🏆 Restaurando ligas...');
    if (backup.data.league && backup.data.league.length > 0) {
      for (const league of backup.data.league) {
        await prisma.league.create({ data: league });
      }
      console.log(`  ✓ ${backup.data.league.length} ligas`);
    }

    console.log('👥 Restaurando miembros...');
    if (backup.data.leagueMember && backup.data.leagueMember.length > 0) {
      for (const member of backup.data.leagueMember) {
        await prisma.leagueMember.create({ data: member });
      }
      console.log(`  ✓ ${backup.data.leagueMember.length} miembros`);
    }

    console.log('⚽ Restaurando plantillas...');
    if (backup.data.squad && backup.data.squad.length > 0) {
      for (const squad of backup.data.squad) {
        await prisma.squad.create({ data: squad });
      }
      console.log(`  ✓ ${backup.data.squad.length} plantillas`);
    }

    console.log('👤 Restaurando jugadores de plantillas...');
    if (backup.data.squadPlayer && backup.data.squadPlayer.length > 0) {
      for (const player of backup.data.squadPlayer) {
        await prisma.squadPlayer.create({ data: player });
      }
      console.log(`  ✓ ${backup.data.squadPlayer.length} jugadores en plantillas`);
    }

    console.log('🎰 Restaurando combis...');
    if (backup.data.betCombi && backup.data.betCombi.length > 0) {
      for (const combi of backup.data.betCombi) {
        await prisma.betCombi.create({ data: combi });
      }
      console.log(`  ✓ ${backup.data.betCombi.length} combis`);
    } else {
      console.log(`  ℹ️ No hay combis para restaurar`);
    }

    console.log('🎲 Restaurando apuestas...');
    if (backup.data.bet && backup.data.bet.length > 0) {
      let betCount = 0;
      let betErrors = 0;
      let skippedCombiBets = 0;
      for (const bet of backup.data.bet) {
        try {
          // Si la apuesta tiene combiId pero no hay combis, omitir el combiId
          if (bet.combiId && (!backup.data.betCombi || backup.data.betCombi.length === 0)) {
            const { combiId, ...betWithoutCombi } = bet;
            await prisma.bet.create({ data: betWithoutCombi });
            skippedCombiBets++;
          } else {
            await prisma.bet.create({ data: bet });
          }
          betCount++;
        } catch (err) {
          betErrors++;
          console.log(`  ⚠️ Error en bet ${bet.id}: ${err.message}`);
        }
      }
      console.log(`  ✓ ${betCount} apuestas restauradas, ${betErrors} errores`);
      if (skippedCombiBets > 0) {
        console.log(`  ℹ️ ${skippedCombiBets} apuestas con combiId fueron restauradas sin el combiId (tabla betCombi no existe)`);
      }
    }

    if (backup.data.bet_option && backup.data.bet_option.length > 0) {
      let optionCount = 0;
      let optionErrors = 0;
      for (const option of backup.data.bet_option) {
        try {
          await prisma.bet_option.create({ data: option });
          optionCount++;
        } catch (err) {
          optionErrors++;
          console.log(`  ⚠️ Error en option ${option.id}: ${err.message}`);
        }
      }
      console.log(`  ✓ ${optionCount} opciones restauradas, ${optionErrors} errores`);
    }

    console.log('📋 Restaurando equipos inválidos...');
    if (backup.data.invalidTeam && backup.data.invalidTeam.length > 0) {
      for (const invalid of backup.data.invalidTeam) {
        await prisma.invalidTeam.create({ data: invalid });
      }
      console.log(`  ✓ ${backup.data.invalidTeam.length} equipos inválidos`);
    } else {
      console.log(`  ℹ️ No hay equipos inválidos para restaurar`);
    }

    console.log('📚 Restaurando historial de plantillas...');
    if (backup.data.squadHistory && backup.data.squadHistory.length > 0) {
      for (const history of backup.data.squadHistory) {
        await prisma.squadHistory.create({ data: history });
      }
      console.log(`  ✓ ${backup.data.squadHistory.length} registros de historial`);
    } else {
      console.log(`  ℹ️ No hay historial de plantillas para restaurar`);
    }

    console.log('🎁 Restaurando ofertas diarias...');
    if (backup.data.dailyOffer && backup.data.dailyOffer.length > 0) {
      for (const offer of backup.data.dailyOffer) {
        await prisma.dailyOffer.create({ data: offer });
      }
      console.log(`  ✓ ${backup.data.dailyOffer.length} ofertas diarias`);
    } else {
      console.log(`  ℹ️ No hay ofertas diarias para restaurar`);
    }

    console.log('📜 Restaurando historial de ofertas...');
    if (backup.data.offerHistory && backup.data.offerHistory.length > 0) {
      for (const history of backup.data.offerHistory) {
        await prisma.offerHistory.create({ data: history });
      }
      console.log(`  ✓ ${backup.data.offerHistory.length} registros de historial de ofertas`);
    } else {
      console.log(`  ℹ️ No hay historial de ofertas para restaurar`);
    }

    console.log('📱 Restaurando tokens de dispositivos...');
    if (backup.data.deviceToken && backup.data.deviceToken.length > 0) {
      for (const token of backup.data.deviceToken) {
        await prisma.deviceToken.create({ data: token });
      }
      console.log(`  ✓ ${backup.data.deviceToken.length} tokens de dispositivos`);
    } else {
      console.log(`  ℹ️ No hay tokens de dispositivos para restaurar`);
    }

    console.log('🔑 Restaurando códigos de reset de contraseña...');
    if (backup.data.passwordResetCode && backup.data.passwordResetCode.length > 0) {
      for (const code of backup.data.passwordResetCode) {
        await prisma.passwordResetCode.create({ data: code });
      }
      console.log(`  ✓ ${backup.data.passwordResetCode.length} códigos de reset`);
    } else {
      console.log(`  ℹ️ No hay códigos de reset para restaurar`);
    }

    console.log('\n✅ ¡Backup restaurado exitosamente!');
  } catch (error) {
    console.error('❌ Error restaurando backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreBackup();
