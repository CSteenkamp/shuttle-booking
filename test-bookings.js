const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestBookings() {
  console.log('🎫 Creating test bookings...')
  
  // Get test users and available trips
  const users = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    include: { creditBalance: true, riders: true }
  })
  
  const trips = await prisma.trip.findMany({
    where: { 
      status: 'SCHEDULED',
      startTime: { gte: new Date() } // Future trips only
    },
    include: { destination: true }
  })
  
  const locations = await prisma.location.findMany({
    where: { status: 'APPROVED' }
  })
  
  console.log(`Found ${users.length} users, ${trips.length} trips, ${locations.length} locations`)
  
  if (users.length === 0 || trips.length === 0 || locations.length === 0) {
    console.log('❌ Insufficient test data to create bookings')
    return
  }
  
  let bookingCount = 0
  
  // Scenario 1: Regular booking for each user
  for (let i = 0; i < Math.min(users.length, trips.length); i++) {
    const user = users[i]
    const trip = trips[i]
    const pickupLocation = locations[i % locations.length]
    const dropoffLocation = locations[(i + 1) % locations.length]
    
    // Check if user has credits
    if (!user.creditBalance || user.creditBalance.credits < 1) {
      console.log(`⚠️ User ${user.email} has insufficient credits`)
      continue
    }
    
    // Check if booking already exists
    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId: user.id,
        tripId: trip.id,
        status: 'CONFIRMED'
      }
    })
    
    if (existingBooking) {
      console.log(`⚠️ User ${user.email} already has booking for this trip`)
      continue
    }
    
    try {
      const booking = await prisma.$transaction(async (tx) => {
        // Create booking
        const newBooking = await tx.booking.create({
          data: {
            userId: user.id,
            tripId: trip.id,
            pickupLocationId: pickupLocation.id,
            dropoffLocationId: dropoffLocation.id,
            passengerCount: 1,
            creditsCost: 1,
            status: 'CONFIRMED'
          }
        })
        
        // Update user credits
        await tx.creditBalance.update({
          where: { userId: user.id },
          data: { credits: { decrement: 1 } }
        })
        
        // Create credit transaction
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            type: 'USAGE',
            amount: -1,
            description: `Booking for ${trip.destination.name}`
          }
        })
        
        // Update trip passenger count
        await tx.trip.update({
          where: { id: trip.id },
          data: { currentPassengers: { increment: 1 } }
        })
        
        return newBooking
      })
      
      bookingCount++
      console.log(`✅ Created booking ${bookingCount}: ${user.email} -> ${trip.destination.name}`)
      
    } catch (error) {
      console.error(`❌ Failed to create booking for ${user.email}:`, error.message)
    }
  }
  
  // Scenario 2: Create bookings with riders for users who have them
  const usersWithRiders = users.filter(u => u.riders && u.riders.length > 0)
  
  for (const user of usersWithRiders.slice(0, 2)) { // Limit to 2 users
    if (user.creditBalance && user.creditBalance.credits >= 2) {
      const availableTrip = trips.find(t => {
        return !bookingCount || true // Find available trip
      })
      
      if (availableTrip && user.riders.length > 0) {
        const rider = user.riders[0]
        const pickupLocation = locations[0]
        const dropoffLocation = locations[1]
        
        try {
          const booking = await prisma.$transaction(async (tx) => {
            const newBooking = await tx.booking.create({
              data: {
                userId: user.id,
                tripId: availableTrip.id,
                riderId: rider.id,
                pickupLocationId: pickupLocation.id,
                dropoffLocationId: dropoffLocation.id,
                passengerCount: 1,
                creditsCost: 1,
                status: 'CONFIRMED'
              }
            })
            
            await tx.creditBalance.update({
              where: { userId: user.id },
              data: { credits: { decrement: 1 } }
            })
            
            await tx.creditTransaction.create({
              data: {
                userId: user.id,
                type: 'USAGE',
                amount: -1,
                description: `Booking for ${rider.name} to ${availableTrip.destination.name}`
              }
            })
            
            await tx.trip.update({
              where: { id: availableTrip.id },
              data: { currentPassengers: { increment: 1 } }
            })
            
            return newBooking
          })
          
          bookingCount++
          console.log(`✅ Created rider booking ${bookingCount}: ${rider.name} (${user.email}) -> ${availableTrip.destination.name}`)
          
        } catch (error) {
          console.error(`❌ Failed to create rider booking:`, error.message)
        }
      }
    }
  }
  
  // Scenario 3: Create some custom location bookings
  const userForCustomLocation = users[0]
  if (userForCustomLocation && userForCustomLocation.creditBalance && userForCustomLocation.creditBalance.credits >= 1) {
    const customTrip = trips[trips.length - 1] // Last trip
    
    try {
      const booking = await prisma.$transaction(async (tx) => {
        // Create custom pickup location
        const customPickup = await tx.location.create({
          data: {
            name: 'Custom Pickup',
            address: '123 Test Street, Johannesburg, 2001',
            category: 'RESIDENTIAL',
            isFrequent: false,
            status: 'APPROVED'
          }
        })
        
        const newBooking = await tx.booking.create({
          data: {
            userId: userForCustomLocation.id,
            tripId: customTrip.id,
            pickupLocationId: customPickup.id,
            dropoffLocationId: locations[0].id,
            passengerCount: 1,
            creditsCost: 1,
            status: 'CONFIRMED'
          }
        })
        
        await tx.creditBalance.update({
          where: { userId: userForCustomLocation.id },
          data: { credits: { decrement: 1 } }
        })
        
        await tx.creditTransaction.create({
          data: {
            userId: userForCustomLocation.id,
            type: 'USAGE',
            amount: -1,
            description: `Custom location booking to ${customTrip.destination.name}`
          }
        })
        
        await tx.trip.update({
          where: { id: customTrip.id },
          data: { currentPassengers: { increment: 1 } }
        })
        
        return newBooking
      })
      
      bookingCount++
      console.log(`✅ Created custom location booking ${bookingCount}: ${userForCustomLocation.email} -> ${customTrip.destination.name}`)
      
    } catch (error) {
      console.error(`❌ Failed to create custom location booking:`, error.message)
    }
  }
  
  console.log(`🎉 Created ${bookingCount} test bookings`)
  
  // Display summary
  const totalBookings = await prisma.booking.count()
  const confirmedBookings = await prisma.booking.count({
    where: { status: 'CONFIRMED' }
  })
  const totalRevenue = await prisma.creditTransaction.aggregate({
    where: { type: 'USAGE' },
    _sum: { amount: true }
  })
  
  console.log(`\n📊 Booking Summary:
  - Total bookings: ${totalBookings}
  - Confirmed bookings: ${confirmedBookings}
  - Total credits used: ${Math.abs(totalRevenue._sum.amount || 0)}`)
}

async function createTestRiders() {
  console.log('👨‍👩‍👧‍👦 Creating test riders...')
  
  const users = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    include: { riders: true }
  })
  
  let riderCount = 0
  
  for (const user of users.slice(0, 2)) { // Create riders for first 2 users
    if (user.riders.length === 0) { // Only if they don't have riders yet
      const riders = [
        {
          name: 'Child One',
          phone: '0821234567',
          relationship: 'Child',
          dateOfBirth: new Date('2015-05-15'),
          medicalInfo: 'No known allergies',
          emergencyContact: 'Parent: 0829876543'
        },
        {
          name: 'Spouse',
          phone: '0831234567',
          relationship: 'Spouse',
          emergencyContact: 'Work: 0117654321'
        }
      ]
      
      for (const riderData of riders) {
        try {
          await prisma.rider.create({
            data: {
              ...riderData,
              userId: user.id
            }
          })
          riderCount++
          console.log(`✅ Created rider: ${riderData.name} for ${user.email}`)
        } catch (error) {
          console.error(`❌ Failed to create rider ${riderData.name}:`, error.message)
        }
      }
    }
  }
  
  console.log(`🎉 Created ${riderCount} test riders`)
}

async function main() {
  try {
    await createTestRiders()
    await createTestBookings()
  } catch (error) {
    console.error('Error in test booking creation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()