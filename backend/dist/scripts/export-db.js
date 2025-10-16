import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
async function exportDatabase() {
    try {
        console.log('🔄 Exportando base de datos...\n');
        let sql = `-- ================================================
-- DUMP DE BASE DE DATOS - LaFantasiaDelGambling
-- Generado: ${new Date().toISOString()}
-- ================================================

-- Configuración
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

`;
        // ============================================
        // ESTRUCTURA DE TABLAS (desde schema.prisma)
        // ============================================
        sql += `
-- ================================================
-- CREACIÓN DE TABLAS
-- ================================================

-- Tabla: user
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT
);

-- Tabla: PasswordResetCode
CREATE TABLE IF NOT EXISTS "PasswordResetCode" (
    id TEXT PRIMARY KEY,
    "userId" TEXT,
    email TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "PasswordResetCode_email_expiresAt_used_idx" ON "PasswordResetCode"(email, "expiresAt", used);

-- Tabla: League
CREATE TABLE IF NOT EXISTS "League" (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    "leaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "League_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "user"(id) ON DELETE CASCADE
);

-- Tabla: LeagueMember
CREATE TABLE IF NOT EXISTS "LeagueMember" (
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    budget INTEGER DEFAULT 500,
    "initialBudget" INTEGER DEFAULT 500,
    "bettingBudget" INTEGER DEFAULT 250,
    "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("leagueId", "userId"),
    CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"(id) ON DELETE CASCADE,
    CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "LeagueMember_userId_idx" ON "LeagueMember"("userId");

-- Tabla: Squad
CREATE TABLE IF NOT EXISTS "Squad" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    name TEXT DEFAULT 'Mi Plantilla',
    formation TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Squad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT "Squad_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"(id) ON DELETE CASCADE,
    UNIQUE ("userId", "leagueId")
);

CREATE INDEX IF NOT EXISTS "Squad_userId_leagueId_idx" ON "Squad"("userId", "leagueId");

-- Tabla: SquadPlayer
CREATE TABLE IF NOT EXISTS "SquadPlayer" (
    id TEXT PRIMARY KEY,
    "squadId" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    position TEXT NOT NULL,
    role TEXT NOT NULL,
    "pricePaid" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SquadPlayer_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"(id) ON DELETE CASCADE,
    UNIQUE ("squadId", position)
);

CREATE INDEX IF NOT EXISTS "SquadPlayer_squadId_idx" ON "SquadPlayer"("squadId");

-- Tabla: player
CREATE TABLE IF NOT EXISTS "player" (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamCrest" TEXT,
    nationality TEXT,
    "shirtNumber" INTEGER,
    photo TEXT,
    price INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "player_teamId_idx" ON "player"("teamId");
CREATE INDEX IF NOT EXISTS "player_position_idx" ON "player"(position);
CREATE INDEX IF NOT EXISTS "player_price_idx" ON "player"(price);

-- Tabla: bet
CREATE TABLE IF NOT EXISTS "bet" (
    id TEXT PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    jornada INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "betType" TEXT NOT NULL,
    "betLabel" TEXT NOT NULL,
    odd DOUBLE PRECISION NOT NULL,
    amount INTEGER NOT NULL,
    "potentialWin" INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bet_leagueId_userId_fkey" FOREIGN KEY ("leagueId", "userId") REFERENCES "LeagueMember"("leagueId", "userId") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "bet_leagueId_userId_idx" ON "bet"("leagueId", "userId");
CREATE INDEX IF NOT EXISTS "bet_jornada_idx" ON "bet"(jornada);
CREATE INDEX IF NOT EXISTS "bet_status_idx" ON "bet"(status);

`;
        // ============================================
        // EXPORTAR DATOS
        // ============================================
        sql += `\n-- ================================================\n`;
        sql += `-- DATOS DE LAS TABLAS\n`;
        sql += `-- ================================================\n\n`;
        // Usuarios
        const users = await prisma.user.findMany();
        if (users.length > 0) {
            sql += `-- Datos de usuarios\n`;
            for (const user of users) {
                sql += `INSERT INTO "user" (id, email, password, name) VALUES ('${user.id}', '${user.email}', '${user.password}', ${user.name ? `'${user.name.replace(/'/g, "''")}'` : 'NULL'}) ON CONFLICT (id) DO NOTHING;\n`;
            }
            sql += `\n`;
            console.log(`✅ Exportados ${users.length} usuarios`);
        }
        // Password Reset Codes
        const resetCodes = await prisma.passwordResetCode.findMany();
        if (resetCodes.length > 0) {
            sql += `-- Códigos de reseteo de contraseña\n`;
            for (const code of resetCodes) {
                sql += `INSERT INTO "PasswordResetCode" (id, "userId", email, "codeHash", "expiresAt", verified, used, attempts, "createdAt") VALUES ('${code.id}', ${code.userId ? `'${code.userId}'` : 'NULL'}, '${code.email}', '${code.codeHash}', '${code.expiresAt.toISOString()}', ${code.verified}, ${code.used}, ${code.attempts}, '${code.createdAt.toISOString()}') ON CONFLICT (id) DO NOTHING;\n`;
            }
            sql += `\n`;
            console.log(`✅ Exportados ${resetCodes.length} códigos de reseteo`);
        }
        // Ligas
        const leagues = await prisma.league.findMany();
        if (leagues.length > 0) {
            sql += `-- Ligas\n`;
            for (const league of leagues) {
                sql += `INSERT INTO "League" (id, name, code, "leaderId", "createdAt") VALUES ('${league.id}', '${league.name.replace(/'/g, "''")}', '${league.code}', '${league.leaderId}', '${league.createdAt.toISOString()}') ON CONFLICT (id) DO NOTHING;\n`;
            }
            sql += `\n`;
            console.log(`✅ Exportadas ${leagues.length} ligas`);
        }
        // Miembros de ligas
        const members = await prisma.leagueMember.findMany();
        if (members.length > 0) {
            sql += `-- Miembros de ligas\n`;
            for (const member of members) {
                const bettingBudget = member.bettingBudget ?? 250;
                sql += `INSERT INTO "LeagueMember" ("leagueId", "userId", points, budget, "initialBudget", "bettingBudget", "joinedAt") VALUES ('${member.leagueId}', '${member.userId}', ${member.points}, ${member.budget}, ${member.initialBudget}, ${bettingBudget}, '${member.joinedAt.toISOString()}') ON CONFLICT ("leagueId", "userId") DO NOTHING;\n`;
            }
            sql += `\n`;
            console.log(`✅ Exportados ${members.length} miembros de ligas`);
        }
        // Plantillas (Squads)
        const squads = await prisma.squad.findMany();
        if (squads.length > 0) {
            sql += `-- Plantillas\n`;
            for (const squad of squads) {
                sql += `INSERT INTO "Squad" (id, "userId", "leagueId", name, formation, "isActive", "createdAt", "updatedAt") VALUES ('${squad.id}', '${squad.userId}', '${squad.leagueId}', '${squad.name.replace(/'/g, "''")}', '${squad.formation}', ${squad.isActive}, '${squad.createdAt.toISOString()}', '${squad.updatedAt.toISOString()}') ON CONFLICT (id) DO NOTHING;\n`;
            }
            sql += `\n`;
            console.log(`✅ Exportadas ${squads.length} plantillas`);
        }
        // Jugadores de plantillas
        const squadPlayers = await prisma.squadPlayer.findMany();
        if (squadPlayers.length > 0) {
            sql += `-- Jugadores en plantillas\n`;
            for (const sp of squadPlayers) {
                sql += `INSERT INTO "SquadPlayer" (id, "squadId", "playerId", "playerName", position, role, "pricePaid", "createdAt") VALUES ('${sp.id}', '${sp.squadId}', ${sp.playerId}, '${sp.playerName.replace(/'/g, "''")}', '${sp.position}', '${sp.role}', ${sp.pricePaid}, '${sp.createdAt.toISOString()}') ON CONFLICT (id) DO NOTHING;\n`;
            }
            sql += `\n`;
            console.log(`✅ Exportados ${squadPlayers.length} jugadores en plantillas`);
        }
        // Jugadores (Players)
        const players = await prisma.player.findMany();
        if (players.length > 0) {
            sql += `-- Jugadores de LaLiga\n`;
            for (const player of players) {
                const nationality = player.nationality ? `'${player.nationality.replace(/'/g, "''")}'` : 'NULL';
                const teamCrest = player.teamCrest ? `'${player.teamCrest.replace(/'/g, "''")}'` : 'NULL';
                const photo = player.photo ? `'${player.photo.replace(/'/g, "''")}'` : 'NULL';
                const shirtNumber = player.shirtNumber ?? 'NULL';
                sql += `INSERT INTO "player" (id, name, position, "teamId", "teamName", "teamCrest", nationality, "shirtNumber", photo, price, "createdAt", "updatedAt") VALUES (${player.id}, '${player.name.replace(/'/g, "''")}', '${player.position}', ${player.teamId}, '${player.teamName.replace(/'/g, "''")}', ${teamCrest}, ${nationality}, ${shirtNumber}, ${photo}, ${player.price}, '${player.createdAt.toISOString()}', '${player.updatedAt.toISOString()}') ON CONFLICT (id) DO NOTHING;\n`;
            }
            sql += `\n`;
            console.log(`✅ Exportados ${players.length} jugadores de LaLiga`);
        }
        // Apuestas (Bets)
        const bets = await prisma.bet.findMany();
        if (bets.length > 0) {
            sql += `-- Apuestas\n`;
            for (const bet of bets) {
                sql += `INSERT INTO "bet" (id, "leagueId", "userId", jornada, "matchId", "betType", "betLabel", odd, amount, "potentialWin", status, "createdAt") VALUES ('${bet.id}', '${bet.leagueId}', '${bet.userId}', ${bet.jornada}, ${bet.matchId}, '${bet.betType.replace(/'/g, "''")}', '${bet.betLabel.replace(/'/g, "''")}', ${bet.odd}, ${bet.amount}, ${bet.potentialWin}, '${bet.status}', '${bet.createdAt.toISOString()}') ON CONFLICT (id) DO NOTHING;\n`;
            }
            sql += `\n`;
            console.log(`✅ Exportadas ${bets.length} apuestas`);
        }
        // Footer del SQL
        sql += `\n-- ================================================\n`;
        sql += `-- FIN DEL DUMP\n`;
        sql += `-- ================================================\n`;
        // Guardar archivo
        const outputPath = path.join(__dirname, '..', 'database_dump.sql');
        fs.writeFileSync(outputPath, sql, 'utf-8');
        console.log(`\n✅ Base de datos exportada exitosamente a: ${outputPath}`);
        console.log(`📊 Resumen:`);
        console.log(`   - Usuarios: ${users.length}`);
        console.log(`   - Ligas: ${leagues.length}`);
        console.log(`   - Miembros: ${members.length}`);
        console.log(`   - Plantillas: ${squads.length}`);
        console.log(`   - Jugadores en plantillas: ${squadPlayers.length}`);
        console.log(`   - Jugadores de LaLiga: ${players.length}`);
        console.log(`   - Apuestas: ${bets.length}`);
        console.log(`   - Códigos de reseteo: ${resetCodes.length}`);
    }
    catch (error) {
        console.error('❌ Error al exportar la base de datos:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
exportDatabase();
