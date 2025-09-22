const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

async function createDataBackup() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads'
      }
    }
  });

  console.log('🔐 Creating JSON backup of critical data...');
  
  const backup = {
    created_at: new Date().toISOString(),
    version: 'v1.0.0-mvp',
    description: 'Backup completo de datos críticos del MVP funcional',
    data: {
      customers: await prisma.customers.findMany(),
      products: await prisma.products.findMany(),
      auth_users: await prisma.auth_users.findMany(),
      campaigns: await prisma.campaign.findMany().then(campaigns => 
        campaigns.map(c => ({
          ...c,
          id: Number(c.id),
          id_product: Number(c.id_product),
          creation_date: c.creation_date ? c.creation_date.toISOString() : null,
          date_post_back: c.date_post_back ? c.date_post_back.toISOString() : null
        }))
      )
    }
  };

  // Convert BigInt to Number for JSON serialization
  const jsonBackup = JSON.stringify(backup, (key, value) => 
    typeof value === 'bigint' ? Number(value) : value, 2
  );
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backups/database/xafra_ads_json_backup_${timestamp}.json`;
  
  fs.writeFileSync(filename, jsonBackup);
  
  console.log(`✅ JSON backup created: ${filename}`);
  console.log(`📊 Backup contains:`);
  console.log(`   - Customers: ${backup.data.customers.length}`);
  console.log(`   - Products: ${backup.data.products.length}`);
  console.log(`   - Auth Users: ${backup.data.auth_users.length}`);
  console.log(`   - Campaigns: ${backup.data.campaigns.length}`);
  
  await prisma.$disconnect();
  console.log('✅ Database disconnected successfully');
}

createDataBackup().catch(console.error);