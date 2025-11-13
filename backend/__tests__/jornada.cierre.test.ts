import { PrismaClient } from '@prisma/client';
import { JornadaService } from '../src/services/jornada.service';

const prisma = new PrismaClient();

describe('JornadaService - Cierre de Jornada y Cálculo de Presupuestos', () => {
  let testLeagueId: string;
  let fcEstradaUserId: string;
  let testUserId2: string;
  const CBO_LEAGUE_ID = 'test-cbo-league';
  
  beforeAll(async () => {
    // Limpiar datos de prueba previos
    await prisma.bet.deleteMany({ where: { leagueId: { contains: 'test-' } } });
    await prisma.squadPlayer.deleteMany({ where: { squad: { leagueId: { contains: 'test-' } } } });
    await prisma.squad.deleteMany({ where: { leagueId: { contains: 'test-' } } });
    await prisma.leagueMember.deleteMany({ where: { leagueId: { contains: 'test-' } } });
    await prisma.league.deleteMany({ where: { id: { contains: 'test-' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'test-cierre-' } } });
  });

  beforeEach(async () => {
    // Crear usuarios de prueba
    const fcEstrada = await prisma.user.create({
      data: {
        id: 'test-fc-estrada',
        email: 'test-cierre-fcestrada@test.com',
        password: 'test',
        name: 'F.C.Estrada',
        isAdmin: false
      }
    });
    fcEstradaUserId = fcEstrada.id;

    const user2 = await prisma.user.create({
      data: {
        id: 'test-user-2',
        email: 'test-cierre-user2@test.com',
        password: 'test',
        name: 'Test User 2',
        isAdmin: false
      }
    });
    testUserId2 = user2.id;

    // Crear liga de prueba
    const league = await prisma.league.create({
      data: {
        id: CBO_LEAGUE_ID,
        name: 'Test CBO',
        code: 'TESTCBO',
        leaderId: fcEstradaUserId,
        division: 'primera',
        currentJornada: 12
      }
    });
    testLeagueId = league.id;

    // Crear miembros de liga con estado ANTES del cierre de J12
    // FC Estrada: budget inicial 500M, después de apuestas tiene 637M
    await prisma.leagueMember.create({
      data: {
        leagueId: testLeagueId,
        userId: fcEstradaUserId,
        points: 0,
        budget: 637, // 500 + 137 de apuestas ganadas en J12
        initialBudget: 500,
        bettingBudget: 250,
        pointsPerJornada: {
          '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0,
          '11': 0, '12': 88, '13': 0, '14': 0, '15': 0, '16': 0, '17': 0, '18': 0, '19': 0, '20': 0
        }
      }
    });

    // Usuario 2: sin apuestas, solo puntos
    await prisma.leagueMember.create({
      data: {
        leagueId: testLeagueId,
        userId: testUserId2,
        points: 0,
        budget: 500,
        initialBudget: 500,
        bettingBudget: 250,
        pointsPerJornada: {
          '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0,
          '11': 0, '12': 50, '13': 0, '14': 0, '15': 0, '16': 0, '17': 0, '18': 0, '19': 0, '20': 0
        }
      }
    });

    // Crear plantillas
    await prisma.squad.create({
      data: {
        userId: fcEstradaUserId,
        leagueId: testLeagueId,
        name: 'FC Estrada Squad',
        formation: '4-3-3'
      }
    });

    await prisma.squad.create({
      data: {
        userId: testUserId2,
        leagueId: testLeagueId,
        name: 'User 2 Squad',
        formation: '4-4-2'
      }
    });

    // Crear apuestas de J12 ya evaluadas para FC Estrada
    // Balance total: +137M
    // Fórmula: potentialWin (ganadas) - amount (perdidas)
    // Ganadas: 102 + 85 = 187M
    // Perdidas: -50M
    // Balance: 187 - 50 = +137M ✅
    
    await prisma.bet.create({
      data: {
        id: 'test-bet-win-1',
        leagueId: testLeagueId,
        userId: fcEstradaUserId,
        jornada: 12,
        matchId: 1000010,
        betType: 'Resultado',
        betLabel: 'Gana Local',
        odd: 2.04,
        amount: 50,
        potentialWin: 102,
        status: 'won'
      }
    });

    await prisma.bet.create({
      data: {
        id: 'test-bet-win-2',
        leagueId: testLeagueId,
        userId: fcEstradaUserId,
        jornada: 12,
        matchId: 1000011,
        betType: 'Goles',
        betLabel: 'Más de 2.5',
        odd: 1.7,
        amount: 50,
        potentialWin: 85,
        status: 'won'
      }
    });

    await prisma.bet.create({
      data: {
        id: 'test-bet-lost-1',
        leagueId: testLeagueId,
        userId: fcEstradaUserId,
        jornada: 12,
        matchId: 1000012,
        betType: 'Ambos marcan',
        betLabel: 'Sí',
        odd: 1.6,
        amount: 50,
        potentialWin: 80,
        status: 'lost'
      }
    });
  });

  afterEach(async () => {
    // Limpiar datos de prueba
    await prisma.bet.deleteMany({ where: { leagueId: testLeagueId } });
    await prisma.squadPlayer.deleteMany({ where: { squad: { leagueId: testLeagueId } } });
    await prisma.squad.deleteMany({ where: { leagueId: testLeagueId } });
    await prisma.leagueMember.deleteMany({ where: { leagueId: testLeagueId } });
    await prisma.league.deleteMany({ where: { id: testLeagueId } });
    await prisma.user.deleteMany({ where: { id: { in: [fcEstradaUserId, testUserId2] } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Cálculo de presupuestos en cierre de jornada', () => {
    it('debe calcular correctamente el initialBudget de FC Estrada para J13 (500 + 137 apuestas + 88 puntos = 725M)', async () => {
      // Estado antes del cierre:
      // - FC Estrada tiene 637M de budget (500 inicial + 137 de apuestas)
      // - Tiene 88 puntos en J12
      // Esperado después del cierre para J13:
      // - initialBudget = 500 (base) + 137 (apuestas) + 88 (puntos) = 725M
      // - budget = 725M

      const memberBefore = await prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId: testLeagueId, userId: fcEstradaUserId } }
      });

      expect(memberBefore?.budget).toBe(637);
      expect(memberBefore?.initialBudget).toBe(500);

      // Ejecutar cierre de jornada
      const result = await JornadaService.closeJornada(testLeagueId);

      expect(result.success).toBe(true);

      // Verificar estado después del cierre
      const memberAfter = await prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId: testLeagueId, userId: fcEstradaUserId } }
      });

      // Verificaciones principales
      expect(memberAfter?.initialBudget).toBe(725);
      expect(memberAfter?.budget).toBe(725);
      expect(memberAfter?.bettingBudget).toBe(250); // Resetear a 250

      // Verificar que la liga avanzó a J13
      const league = await prisma.league.findUnique({ where: { id: testLeagueId } });
      expect(league?.currentJornada).toBe(13);
    });

    it('debe calcular correctamente el presupuesto con solo puntos (sin apuestas)', async () => {
      // Usuario 2: 500M inicial, 0 apuestas, 50 puntos
      // Esperado: 500 + 0 + 50 = 550M

      await JornadaService.closeJornada(testLeagueId);

      const member = await prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId: testLeagueId, userId: testUserId2 } }
      });

      expect(member?.initialBudget).toBe(550);
      expect(member?.budget).toBe(550);
    });

    it('debe usar siempre 500M como base, no el initialBudget anterior', async () => {
      // Modificar initialBudget a 600M antes del cierre
      await prisma.leagueMember.update({
        where: { leagueId_userId: { leagueId: testLeagueId, userId: fcEstradaUserId } },
        data: { initialBudget: 600 }
      });

      await JornadaService.closeJornada(testLeagueId);

      const member = await prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId: testLeagueId, userId: fcEstradaUserId } }
      });

      // Debe usar 500 como base, no 600
      // 500 + 137 + 88 = 725M
      expect(member?.initialBudget).toBe(725);
      expect(member?.budget).toBe(725);
    });

    it('debe calcular correctamente con apuestas perdidas', async () => {
      // Cambiar budget a 450M (perdió 50M en apuestas)
      await prisma.leagueMember.update({
        where: { leagueId_userId: { leagueId: testLeagueId, userId: testUserId2 } },
        data: { 
          budget: 450, // 500 - 50
          initialBudget: 500
        }
      });

      // Crear apuesta perdida
      await prisma.bet.create({
        data: {
          id: 'test-bet-lost',
          leagueId: testLeagueId,
          userId: testUserId2,
          jornada: 12,
          matchId: 1000020,
          betType: 'Test',
          betLabel: 'Lost bet',
          odd: 2.0,
          amount: 50,
          potentialWin: 100,
          status: 'lost'
        }
      });

      await JornadaService.closeJornada(testLeagueId);

      const member = await prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId: testLeagueId, userId: testUserId2 } }
      });

      // 500 (base) - 50 (apuestas) + 50 (puntos) = 500M
      expect(member?.initialBudget).toBe(500);
      expect(member?.budget).toBe(500);
    });

    it('debe vaciar las plantillas después del cierre', async () => {
      // Agregar jugadores a las plantillas
      const squads = await prisma.squad.findMany({ where: { leagueId: testLeagueId } });
      
      for (const squad of squads) {
        await prisma.squadPlayer.create({
          data: {
            squadId: squad.id,
            playerId: 1,
            playerName: 'Test Player',
            position: 'POR',
            role: 'POR'
          }
        });
      }

      const squadPlayersBefore = await prisma.squadPlayer.count({
        where: { squad: { leagueId: testLeagueId } }
      });
      expect(squadPlayersBefore).toBeGreaterThan(0);

      await JornadaService.closeJornada(testLeagueId);

      const squadPlayersAfter = await prisma.squadPlayer.count({
        where: { squad: { leagueId: testLeagueId } }
      });
      expect(squadPlayersAfter).toBe(0);
    });
  });

  describe('Fórmula de cálculo de presupuestos', () => {
    it('debe aplicar la fórmula: 500 + balance_apuestas + puntos_jornada', async () => {
      // Caso: +200M apuestas, +75 puntos
      await prisma.leagueMember.update({
        where: { leagueId_userId: { leagueId: testLeagueId, userId: testUserId2 } },
        data: { 
          budget: 700, // 500 + 200
          initialBudget: 500,
          pointsPerJornada: { '12': 75 }
        }
      });

      await prisma.bet.create({
        data: {
          id: 'test-big-win',
          leagueId: testLeagueId,
          userId: testUserId2,
          jornada: 12,
          matchId: 1000030,
          betType: 'Test',
          betLabel: 'Big win',
          odd: 5.0,
          amount: 50,
          potentialWin: 250,
          status: 'won'
        }
      });

      await JornadaService.closeJornada(testLeagueId);

      const member = await prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId: testLeagueId, userId: testUserId2 } }
      });

      // 500 + 250 - 50 (apostado incluido en budget) = 700, pero la fórmula correcta es:
      // 500 (base) + (700 - 500) (diferencia por apuestas) + 75 (puntos) = 775M
      expect(member?.initialBudget).toBe(775);
    });
  });
});
