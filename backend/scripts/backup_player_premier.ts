#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const players = await (prisma as any).playerPremier.findMany();
  const outDir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `players_premier_backup_${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(players, null, 2), 'utf8');
  console.log('Wrote backup:', outFile, ' (rows =', players.length, ')');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await prisma.$disconnect(); } catch (_) { /* ignore */ }
  process.exit(1);
});
