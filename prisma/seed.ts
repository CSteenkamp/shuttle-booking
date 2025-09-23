import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default settings
  await prisma.settings.upsert({
    where: { key: 'CREDIT_COST' },
    update: {},
    create: {
      key: 'CREDIT_COST',
      value: '25',
      description: 'Cost per credit in ZAR',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'SERVICE_AREA_RADIUS_KM' },
    update: {},
    create: {
      key: 'SERVICE_AREA_RADIUS_KM',
      value: '5',
      description: 'Service area radius in kilometers',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'BOOKING_CUTOFF_MINUTES' },
    update: {},
    create: {
      key: 'BOOKING_CUTOFF_MINUTES',
      value: '30',
      description: 'Minutes before trip when bookings close',
    },
  })

  // Create some default frequent locations
  await prisma.location.upsert({
    where: { id: 'town-center' },
    update: {},
    create: {
      id: 'town-center',
      name: 'Town Center',
      address: 'Main Street, Town Center',
      isFrequent: true,
      latitude: -26.2041,
      longitude: 28.0473,
    },
  })

  await prisma.location.upsert({
    where: { id: 'shopping-mall' },
    update: {},
    create: {
      id: 'shopping-mall',
      name: 'Shopping Mall',
      address: 'Mall Drive, Shopping District',
      isFrequent: true,
      latitude: -26.1951,
      longitude: 28.0571,
    },
  })

  await prisma.location.upsert({
    where: { id: 'airport' },
    update: {},
    create: {
      id: 'airport',
      name: 'Local Airport',
      address: 'Airport Road, Aviation District',
      isFrequent: true,
      latitude: -26.1392,
      longitude: 28.2460,
    },
  })

  console.log('Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })