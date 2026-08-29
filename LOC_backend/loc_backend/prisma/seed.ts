// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.learningSession.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.championLearning.deleteMany();
  await prisma.lolAccount.deleteMany();
  await prisma.user.deleteMany();

  const bastian = await prisma.user.create({
    data: {
      clerkId: 'user_seed_bastian',
      name: 'Bastián',
      email: 'bastian@example.com',
    },
  });

  const fer = await prisma.user.create({
    data: {
      clerkId: 'user_seed_fer',
      name: 'Fer',
      email: 'fer@example.com',
    },
  });

  const mainAccount = await prisma.lolAccount.create({
    data: {
      summoner: 'Bastián',
      tag: 'LAS1',
      server: 'LAS',
      division: 'Oro',
      tier: 'II',
      lp: 45,
      userId: bastian.id,
    },
  });

  await prisma.lolAccount.create({
    data: {
      summoner: 'BastiSmurf',
      tag: 'LAS2',
      server: 'LAS',
      division: 'Plata',
      tier: 'I',
      lp: 70,
      userId: bastian.id,
    },
  });

  await prisma.lolAccount.create({
    data: {
      summoner: 'FerSupp',
      tag: 'LAS1',
      server: 'LAS',
      division: 'Platino',
      tier: 'IV',
      lp: 12,
      userId: fer.id,
    },
  });

  const ahri = await prisma.championLearning.create({
    data: {
      champion: 'Ahri',
      role: 'Mid',
      games: 32,
      wins: 19,
      kdaK: 6.1,
      kdaD: 4.2,
      kdaA: 7.8,
      csMin: 7.4,
      accountId: mainAccount.id,
    },
  });

  await prisma.learningSession.createMany({
    data: [
      {
        date: new Date('2026-06-01'),
        duration: 45,
        focus: 'Combos de skillshot y control de wave',
        ratings: { farmeo: 3, trades: 3, wave: 2, macro: 2, teamfight: 3 },
        learningId: ahri.id,
      },
      {
        date: new Date('2026-06-10'),
        duration: 60,
        focus: 'Timings de roam post nivel 6',
        ratings: { farmeo: 3, trades: 4, wave: 3, macro: 3, teamfight: 3 },
        learningId: ahri.id,
      },
      {
        date: new Date('2026-07-02'),
        duration: 50,
        focus: 'Objetivos y visión en mid-game',
        ratings: { farmeo: 4, trades: 4, wave: 4, macro: 4, teamfight: 4 },
        learningId: ahri.id,
      },
    ],
  });

  await prisma.goal.createMany({
    data: [
      { type: 'rank', title: 'Llegar a Platino IV', progress: 65, deadline: new Date('2026-09-30'), accountId: mainAccount.id },
      { type: 'role', title: 'Aprender rol Jungla', progress: 30, accountId: mainAccount.id },
      { type: 'champion', title: 'Dominar a Ahri en Mid', progress: 55, accountId: mainAccount.id },
    ],
  });

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });