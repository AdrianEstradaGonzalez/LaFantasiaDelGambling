#!/usr/bin/env node
/*
 Script to set prices for Premier players based on their total points and position.
 Usage:
   node scripts/set_premier_prices.js        # dry-run (shows changes)
   node scripts/set_premier_prices.js --apply  # apply changes to DB

 Notes:
 - Expects DATABASE_URL and Prisma client available (run from backend/)
 - Prices are in millions (integer). The script will update prisma.player.price
*/

const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const premierTeamTokens = [
  'Arsenal',
  'Manchester City',
  'Manchester United',
  'Liverpool',
  'Tottenham',
  'Chelsea',
  'West Ham',
  'Wolves',
  'Nottingham Forest',
  'Nott Forest',
  'Leeds',
  'Burnley',
  'Brighton',
  'Aston Villa',
  'Newcastle',
  'Crystal Palace',
  'Bournemouth',
  'Brentford',
  'Everton'
];

const boostTeams = ['Arsenal','Manchester City','Liverpool','Tottenham','Chelsea','Manchester United'];
const penalizeTeams = ['West Ham','Wolves','Nottingham Forest','Nott Forest','Leeds','Burnley'];

function normalizePosition(pos) {
  if (!pos) return 'Midfielder';
  const p = String(pos).trim().toLowerCase();
  if (p.includes('goal') || p.includes('keeper') || p === 'g' || p === 'goalkeeper') return 'Goalkeeper';
  if (p.includes('def') || p === 'd' || p.includes('back')) return 'Defender';
  if (p.includes('mid') || p === 'm') return 'Midfielder';
  if (p.includes('att') || p.includes('forward') || p.includes('striker') || p === 'f' || p.includes('wing')) return 'Attacker';
  return 'Midfielder';
}

function priceForAttacker(points) {
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

function priceForMidfielder(points) {
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

function priceForDefender(points) {
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

function priceForGoalkeeper(points) {
  if (points >= 60) return 50;
  if (points >= 50) return 40;
  if (points >= 30) return 20;
  if (points >= 20) return 10;
  return 1;
}

function applyTeamModifier(basePrice, teamName) {
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

async function computeTotalPoints(playerId) {
  // Sum totalPoints from playerStats
  const agg = await prisma.playerStats.aggregate({
    where: { playerId },
    _sum: { totalPoints: true }
  });
  return (agg._sum.totalPoints || 0);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  console.log('Running set_premier_prices.js', apply ? '(applying changes)' : '(dry-run)');

  // Build OR filters for teamName contains
  const or = premierTeamTokens.map(token => ({ teamName: { contains: token, mode: 'insensitive' } }));

  const players = await prisma.player.findMany({ where: { OR: or } });
  console.log(`Found ${players.length} players matching Premier team tokens.`);

  let updated = 0;
  let changed = 0;

  for (const p of players) {
    const points = await computeTotalPoints(p.id);
    const pos = normalizePosition(p.position);
    let basePrice = 1;
    switch (pos) {
      case 'Attacker': basePrice = priceForAttacker(points); break;
      case 'Midfielder': basePrice = priceForMidfielder(points); break;
      case 'Defender': basePrice = priceForDefender(points); break;
      case 'Goalkeeper': basePrice = priceForGoalkeeper(points); break;
      default: basePrice = priceForMidfielder(points);
    }

    const finalPrice = applyTeamModifier(basePrice, p.teamName);

    if (finalPrice !== p.price) {
      console.log(`Player: ${p.name} (id:${p.id}) team=${p.teamName} pos=${p.position} points=${points} -> ${p.price}M -> ${finalPrice}M`);
      changed++;
      if (apply) {
        await prisma.player.update({ where: { id: p.id }, data: { price: finalPrice } });
        updated++;
      }
    }
  }

  console.log(`Processed ${players.length} players. Price changes detected: ${changed}. Applied: ${updated}.`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect().then(() => process.exit(1));
});
