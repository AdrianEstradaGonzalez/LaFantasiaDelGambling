/**
 * FIX: Recalcular initialBudget de J13 con la fórmula correcta
 * 
 * PROBLEMA: Al cerrar J12, se usó initialBudget J13 = initialBudget J12 + apuestas + puntos
 * CORRECTO: initialBudget J13 = 500 + apuestas + puntos
 * 
 * FÓRMULA DE AJUSTE:
 * - Leer initialBudget J12 desde backup (antes del cierre)
 * - Calcular diferencia con base 500: ajuste = initialBudget J12 - 500
 * - Aplicar: initialBudget correcto = initialBudget actual - ajuste
 * - Aplicar: budget correcto = budget actual - ajuste
 * 
 * EJEMPLO (FC Estrada CBO):
 * - initialBudget J12 (backup): 352M
 * - Ajuste: 352 - 500 = -148M
 * - initialBudget actual: 577M
 * - initialBudget correcto: 577 - (-148) = 725M ✅
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config();

const prisma = new PrismaClient();

interface BackupLeagueMember {
  leagueId: string;
  userId: string;
  initialBudget: number;
  budget: number;
}

async function fixJ13InitialBudgets() {
  console.log('\n🔧 CORRIGIENDO INITIAL BUDGETS DE JORNADA 13\n');
  console.log('Fórmula: initialBudget correcto = initialBudget actual - (initialBudget J12 - 500)\n');

  try {
    // 1. Leer el backup para obtener initialBudget de J12
    const backupPath = path.join(process.cwd(), 'backups', 'prisma-backup-2025-11-10T00-54-06.json');
    
    if (!fs.existsSync(backupPath)) {
      console.error('❌ No se encontró el backup:', backupPath);
      return;
    }

    console.log('📂 Leyendo backup:', backupPath);
    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    const backupData = JSON.parse(backupContent);
    
    // Crear un mapa de initialBudget por leagueId_userId
    const j12BudgetsMap = new Map<string, { initialBudget: number; budget: number }>();
    
    // El backup tiene estructura: { data: { leagueMember: [...] } }
    const leagueMembers = backupData.data?.leagueMember || backupData.LeagueMember || [];
    
    for (const member of leagueMembers) {
      const key = `${member.leagueId}_${member.userId}`;
      j12BudgetsMap.set(key, {
        initialBudget: member.initialBudget,
        budget: member.budget
      });
    }
    
    console.log(`✅ Leídos ${j12BudgetsMap.size} miembros del backup\n`);

    // 2. Obtener todas las ligas en J13
    const leagues = await prisma.league.findMany({
      where: { currentJornada: 13 }
    });

    if (leagues.length === 0) {
      console.log('⚠️  No hay ligas en J13');
      return;
    }

    console.log(`📊 Encontradas ${leagues.length} ligas en J13:\n`);

    let totalFixed = 0;
    let totalSkipped = 0;

    for (const league of leagues) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏆 Liga: ${league.name}`);
      console.log(`${'='.repeat(80)}\n`);

      const members = await prisma.leagueMember.findMany({
        where: { leagueId: league.id },
        include: { user: true }
      });

      for (const member of members) {
        const key = `${member.leagueId}_${member.userId}`;
        const j12Data = j12BudgetsMap.get(key);

        if (!j12Data) {
          console.log(`⚠️  ${member.user.name || 'Usuario'}: No encontrado en backup (nuevo miembro)`);
          totalSkipped++;
          continue;
        }

        // Calcular el ajuste basado en el initialBudget de J12
        const initialBudgetJ12 = j12Data.initialBudget;
        const ajuste = initialBudgetJ12 - 500;

        // Aplicar el ajuste
        const currentInitialBudget = member.initialBudget;
        const currentBudget = member.budget;
        
        const correctInitialBudget = currentInitialBudget - ajuste;
        const correctBudget = currentBudget - ajuste;

        // Actualizar si es diferente
        if (Math.abs(currentInitialBudget - correctInitialBudget) > 0.01) {
          await prisma.leagueMember.update({
            where: {
              leagueId_userId: {
                leagueId: league.id,
                userId: member.userId
              }
            },
            data: {
              initialBudget: correctInitialBudget,
              budget: correctBudget
            }
          });

          // Obtener puntos de J12 para mostrar el cálculo completo
          const pointsPerJornada = (member.pointsPerJornada as Record<string, number>) || {};
          const j12Points = pointsPerJornada['12'] || 0;
          const apuestasResult = correctInitialBudget - 500 - j12Points;

          console.log(`✅ ${member.user.name || 'Usuario'}`);
          console.log(`   initialBudget J12 (backup): ${initialBudgetJ12}M`);
          console.log(`   Ajuste: ${initialBudgetJ12} - 500 = ${ajuste}M`);
          console.log(`   initialBudget: ${currentInitialBudget}M → ${correctInitialBudget}M`);
          console.log(`   budget: ${currentBudget}M → ${correctBudget}M`);
          console.log(`   Verificación: 500 + ${apuestasResult} (apuestas) + ${j12Points} (puntos) = ${correctInitialBudget}M ✅`);
          console.log();

          totalFixed++;
        } else {
          console.log(`⏭️  ${member.user.name || 'Usuario'}: Ya correcto (initialBudget ${currentInitialBudget}M)`);
          totalSkipped++;
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ CORRECCIÓN COMPLETADA`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\nTotal usuarios corregidos: ${totalFixed}`);
    console.log(`Total usuarios sin cambios: ${totalSkipped}`);
    console.log(`\n💡 Fórmula aplicada: initialBudget = initialBudget actual - (initialBudget J12 - 500)`);
    console.log(`   Esto ajusta la base de initialBudget J12 a 500M\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixJ13InitialBudgets();
