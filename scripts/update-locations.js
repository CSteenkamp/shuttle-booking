const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateLocations() {
  try {
    console.log('Clearing existing locations...');
    await prisma.location.deleteMany({});

    console.log('Creating new activity destinations...');
    const destinations = [
      { name: 'Gymnastics', address: 'Gymnastics Center, Sport City', isFrequent: true },
      { name: 'Tennis', address: 'Tennis Club, Sport Complex', isFrequent: true },
      { name: 'Gericke', address: 'Gericke Sports Facility', isFrequent: true },
      { name: 'Charlies', address: 'Charlies Sports Center', isFrequent: true },
      { name: 'Ballet', address: 'Ballet Academy, Arts District', isFrequent: true },
      { name: 'Dance', address: 'Dance Studio, Performance Center', isFrequent: true },
      { name: 'Swim', address: 'Swimming Pool Complex', isFrequent: true },
      { name: 'Hockey', address: 'Hockey Fields, Sport City', isFrequent: true },
      { name: 'Netball', address: 'Netball Courts, Sport Complex', isFrequent: true },
      { name: 'Athletics', address: 'Athletics Track, Olympic Stadium', isFrequent: true },
    ];

    for (const dest of destinations) {
      await prisma.location.create({
        data: dest
      });
      console.log(`Created destination: ${dest.name}`);
    }

    console.log('Location update completed successfully!');
  } catch (error) {
    console.error('Error updating locations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateLocations();