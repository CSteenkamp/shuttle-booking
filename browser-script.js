// Copy and paste this entire script into your browser console
// while logged in as admin at tjoeftjaf.xyz/admin/pricing

const packages = [
  {
    name: "Starter Pack",
    credits: 50,
    price: 50,
    isPopular: false,
    isActive: true
  },
  {
    name: "Value Pack",
    credits: 100,
    price: 100,
    isPopular: true,
    isActive: true
  },
  {
    name: "Family Pack",
    credits: 150,
    price: 150,
    isPopular: false,
    isActive: true
  },
  {
    name: "Premium Pack",
    credits: 200,
    price: 200,
    isPopular: false,
    isActive: true
  },
  {
    name: "Ultimate Pack",
    credits: 500,
    price: 500,
    isPopular: false,
    isActive: true
  }
];

async function addPackages() {
  console.log('🚀 Adding credit packages...');
  
  for (const pkg of packages) {
    try {
      const response = await fetch('/api/admin/pricing/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkg)
      });
      
      if (response.ok) {
        console.log('✅ Added:', pkg.name);
      } else {
        const error = await response.json();
        console.error('❌ Failed to add', pkg.name, ':', error.error);
      }
    } catch (error) {
      console.error('❌ Error adding', pkg.name, ':', error);
    }
  }
  
  console.log('🎉 Package addition completed! Refresh the page to see them.');
}

addPackages();