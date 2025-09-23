const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkCreditTransactions() {
  try {
    console.log('🔍 Analyzing credit transactions...')
    
    // Get all credit transactions with user info
    const transactions = await prisma.creditTransaction.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📊 Found ${transactions.length} credit transactions:\n`)

    let adminAdjustments = 0
    let customerPurchases = 0
    let totalRevenue = 0

    transactions.forEach((transaction, index) => {
      const userInfo = `${transaction.user.name || 'No name'} (${transaction.user.email}) - ${transaction.user.role}`
      console.log(`${index + 1}. ${transaction.type}: ${transaction.amount} credits`)
      console.log(`   User: ${userInfo}`)
      console.log(`   Description: ${transaction.description || 'No description'}`)
      console.log(`   Date: ${transaction.createdAt.toLocaleString()}`)
      console.log('')

      if (transaction.type === 'ADMIN_ADJUSTMENT' && transaction.amount > 0) {
        adminAdjustments += transaction.amount
      } else if (transaction.type === 'PURCHASE') {
        customerPurchases += transaction.amount
        totalRevenue += transaction.amount * 25 // R25 per credit
      }
    })

    console.log('💰 Revenue Analysis:')
    console.log(`   - Admin adjustments: ${adminAdjustments} credits (should NOT count as revenue)`)
    console.log(`   - Customer purchases: ${customerPurchases} credits`)
    console.log(`   - Current revenue calculation: R${(adminAdjustments + customerPurchases) * 25}`)
    console.log(`   - Correct revenue should be: R${totalRevenue}`)

    // Check user balances
    console.log('\n👥 User Credit Balances:')
    const userBalances = await prisma.user.findMany({
      include: {
        creditBalance: true
      },
      orderBy: {
        role: 'asc'
      }
    })

    userBalances.forEach(user => {
      const credits = user.creditBalance?.credits || 0
      console.log(`   - ${user.name || 'No name'} (${user.role}): ${credits} credits`)
    })

  } catch (error) {
    console.error('❌ Error checking credit transactions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCreditTransactions()