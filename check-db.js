const { prisma } = require('./packages/database/src/index.js');

async function checkDatabaseContent() {
  
  try {
    console.log('🔍 Verificando contenido de la base de datos...\n');
    
    // Verificar customers
    const customerCount = await prisma.customer.count();
    console.log(`👥 Customers: ${customerCount}`);
    
    if (customerCount > 0) {
      const sampleCustomers = await prisma.customer.findMany({
        take: 3,
        select: { id_customer: true, name: true, short_name: true }
      });
      console.log('   Ejemplos:', sampleCustomers);
    }
    
    // Verificar products
    const productCount = await prisma.product.count();
    console.log(`\n🛍️ Products: ${productCount}`);
    
    if (productCount > 0) {
      const sampleProducts = await prisma.product.findMany({
        take: 3,
        select: { id_product: true, name: true, reference: true }
      });
      console.log('   Ejemplos:', sampleProducts);
    }
    
    // Verificar campaigns
    const campaignCount = await prisma.campaign.count();
    console.log(`\n📊 Campaigns: ${campaignCount}`);
    
    if (campaignCount > 0) {
      const sampleCampaigns = await prisma.campaign.findMany({
        take: 3,
        select: { id: true, tracking: true, status: true }
      });
      console.log('   Ejemplos:', sampleCampaigns);
    }
    
    // Verificar auth_users
    const authCount = await prisma.authUser.count();
    console.log(`\n🔐 Auth Users: ${authCount}`);
    
    if (authCount > 0) {
      const sampleAuth = await prisma.authUser.findMany({
        take: 3,
        select: { id_auth: true, user_name: true, api_key: true }
      });
      console.log('   Ejemplos:', sampleAuth);
    }
    
    // Verificar ads
    const adsCount = await prisma.ads.count();
    console.log(`\n📺 Ads: ${adsCount}`);
    
    // Summary
    console.log('\n📋 RESUMEN:');
    console.log(`   Total de tablas con datos: ${[customerCount, productCount, campaignCount, authCount, adsCount].filter(c => c > 0).length}/5`);
    
    if (customerCount === 0 && productCount === 0 && campaignCount === 0) {
      console.log('⚠️  LAS TABLAS PRINCIPALES ESTÁN VACÍAS');
    } else {
      console.log('✅ La base de datos contiene datos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('   Código:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseContent();