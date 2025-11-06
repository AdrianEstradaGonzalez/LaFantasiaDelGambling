#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load env from project root .env if present
dotenv.config();

const prisma = new PrismaClient();

const boostTeams = ['Arsenal','Manchester City','Liverpool','Tottenham','Chelsea','Manchester United'];
const penalizeTeams = ['West Ham','Wolves','Nottingham Forest','Nott Forest','Leeds','Burnley'];

function normalizePosition(pos?: string): 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker' {
  if (!pos) return 'Midfielder';
  const p = pos.trim().toLowerCase();
  if (p.includes('goal') || p.includes('keeper') || p === 'g' || p === 'goalkeeper') return 'Goalkeeper';
  if (p.includes('def') || p === 'd' || p.includes('back')) return 'Defender';
  if (p.includes('mid') || p === 'm') return 'Midfielder';
  if (p.includes('att') || p.includes('forward') || p.includes('striker') || p === 'f' || p.includes('wing')) return 'Attacker';
  return 'Midfielder';
}

function priceForAttacker(points: number) {
  if (points >= 100) return 190;
  if (points >= 80) return 100;
  if (points >= 70) return 80;
  if (points >= 60) return 70;
  if (points >= 50) return 55;
  if (points >= 40) return 45;
  if (points >= 30) return 35;
  if (points >= 20) return 25;
  if (points >= 10) return 15;
  return 1;
}

function priceForMidfielder(points: number) {
  if (points >= 100) return 150;
  if (points >= 80) return 85;
  if (points >= 70) return 75;
  if (points >= 60) return 65;
  if (points >= 50) return 55;
  if (points >= 40) return 45;
  if (points >= 30) return 35;
  if (points >= 20) return 25;
  if (points >= 10) return 15;
  return 1;
}

function priceForDefender(points: number) {
  if (points >= 90) return 80;
  if (points >= 80) return 70;
  if (points >= 70) return 60;
  if (points >= 60) return 45;
  if (points >= 50) return 35;
  if (points >= 40) return 25;
  if (points >= 30) return 15;
  if (points >= 20) return 5;
  return 1;
}

function priceForGoalkeeper(points: number) {
  if (points >= 60) return 50;
  if (points >= 50) return 40;
  if (points >= 30) return 20;
  if (points >= 20) return 10;
  return 1;
}

function applyTeamModifier(basePrice: number, teamName?: string) {
  if (!teamName) return basePrice;
  const team = String(teamName);
  const isBoost = boostTeams.some(t => team.toLowerCase().includes(t.toLowerCase()));
  const isPenalize = penalizeTeams.some(t => team.toLowerCase().includes(t.toLowerCase()));
  let price = basePrice;
  if (price > 20 && isBoost) price = price + 10;
  if (isPenalize) price = price - 10;
  if (price < 1) price = 1;
  return Math.round(price);
}

async function computeTotalPoints(playerId: number) {
  // Aggregate from the premier stats table
  const agg = await (prisma as any).playerPremierStats.aggregate({ where: { playerId }, _sum: { totalPoints: true } });
  return (agg._sum.totalPoints || 0) as number;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  console.log('set_premier_prices.ts', apply ? '(applying changes)' : '(dry-run)');

  // Read all players from the dedicated player_premier table
  const players = await (prisma as any).playerPremier.findMany();
  console.log(`Found ${players.length} premier players`);

  let changed = 0;
  let applied = 0;

  for (const p of players) {
    const points = await computeTotalPoints(p.id);
    const pos = normalizePosition(p.position);
    let basePrice = 1;
    switch (pos) {
      case 'Attacker': basePrice = priceForAttacker(points); break;
      case 'Midfielder': basePrice = priceForMidfielder(points); break;
      case 'Defender': basePrice = priceForDefender(points); break;
      case 'Goalkeeper': basePrice = priceForGoalkeeper(points); break;
    }
    const finalPrice = applyTeamModifier(basePrice, p.teamName);
    if (finalPrice !== p.price) {
      console.log(`Player ${p.name} (id:${p.id}) team=${p.teamName} pos=${p.position} points=${points}: ${p.price}M -> ${finalPrice}M`);
      changed++;
      if (apply) {
        // Update the dedicated premier table (player_premier)
        await (prisma as any).playerPremier.update({ where: { id: p.id }, data: { price: finalPrice } });
        applied++;
      }
    }
  }

  console.log(`Processed ${players.length} players. Changes: ${changed}. Applied: ${applied}.`);
  await prisma.$disconnect();
}

main().catch(async err => {
  console.error(err);
  try { await prisma.$disconnect(); } catch (_) { /* ignore */ }
});
