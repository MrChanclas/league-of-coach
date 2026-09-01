// prisma/seed.ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.learningSession.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.championLearning.deleteMany();
  await prisma.lolAccount.deleteMany();
  await prisma.user.deleteMany();

  console.log('Base de datos limpia. Los usuarios se crean automáticamente en el primer login con Clerk.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
