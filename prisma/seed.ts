import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
})
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@dailyplanner.app' },
    update: {},
    create: {
      email: 'demo@dailyplanner.app',
      name: 'Demo User',
      settings: {
        create: {},
      },
      channels: {
        create: [
          { name: 'work', color: '#f59e0b' },
          { name: 'personal', color: '#3b82f6' },
          { name: 'uncategorized', color: '#6b7280' },
        ],
      },
    },
  })
  console.log('Seeded user:', user.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
