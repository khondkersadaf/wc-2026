import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminPin = await bcrypt.hash('1234', 10);
  const userPin = await bcrypt.hash('0000', 10);

  const admin = await prisma.user.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', pin: adminPin, isAdmin: true },
  });

  await prisma.user.upsert({
    where: { name: 'Demo' },
    update: {},
    create: { name: 'Demo', pin: userPin, isAdmin: false },
  });

  // Sample World Cup 2026 fixtures
  const fixtures = [
    { externalId: 'demo-1', homeTeam: 'USA', awayTeam: 'Mexico', stage: 'GROUP_STAGE', matchGroup: 'GROUP_A', matchDate: new Date('2026-06-15T20:00:00Z'), status: 'SCHEDULED' },
    { externalId: 'demo-2', homeTeam: 'Brazil', awayTeam: 'Germany', stage: 'GROUP_STAGE', matchGroup: 'GROUP_B', matchDate: new Date('2026-06-16T17:00:00Z'), status: 'SCHEDULED' },
    { externalId: 'demo-3', homeTeam: 'France', awayTeam: 'England', stage: 'GROUP_STAGE', matchGroup: 'GROUP_C', matchDate: new Date('2026-06-16T20:00:00Z'), status: 'SCHEDULED' },
    { externalId: 'demo-4', homeTeam: 'Argentina', awayTeam: 'Spain', stage: 'GROUP_STAGE', matchGroup: 'GROUP_D', matchDate: new Date('2026-06-17T17:00:00Z'), status: 'SCHEDULED' },
    { externalId: 'demo-5', homeTeam: 'Portugal', awayTeam: 'Netherlands', stage: 'GROUP_STAGE', matchGroup: 'GROUP_E', matchDate: new Date('2026-06-17T20:00:00Z'), status: 'SCHEDULED' },
    { externalId: 'demo-6', homeTeam: 'Japan', awayTeam: 'South Korea', stage: 'GROUP_STAGE', matchGroup: 'GROUP_F', matchDate: new Date('2026-06-18T14:00:00Z'), status: 'SCHEDULED' },
    { externalId: 'demo-7', homeTeam: 'USA', awayTeam: 'Germany', stage: 'GROUP_STAGE', matchGroup: 'GROUP_A', matchDate: new Date('2026-06-20T17:00:00Z'), status: 'FINISHED', homeScore: 2, awayScore: 1, winner: 'HOME_TEAM' },
    { externalId: 'demo-8', homeTeam: 'Brazil', awayTeam: 'France', stage: 'GROUP_STAGE', matchGroup: 'GROUP_B', matchDate: new Date('2026-06-20T20:00:00Z'), status: 'FINISHED', homeScore: 1, awayScore: 1, winner: 'DRAW' },
  ];

  for (const f of fixtures) {
    await prisma.match.upsert({ where: { externalId: f.externalId }, update: {}, create: f });
  }

  console.log('Seed complete.');
  console.log('Admin login: name="Admin", pin="1234"');
  console.log('User login:  name="Demo",  pin="0000"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
