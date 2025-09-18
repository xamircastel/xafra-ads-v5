const { prisma } = require('./packages/database/src/index.js');

async function checkAuthUsers() {
  try {
    console.log('🔍 Verificando registros en auth_users...\n');
    
    const authUsers = await prisma.authUser.findMany({
      include: {
        customer: {
          select: { id_customer: true, name: true, short_name: true }
        }
      }
    });
    
    console.log('📋 Auth Users encontrados:');
    authUsers.forEach(auth => {
      console.log('\n🔐 Auth User ID:', auth.id_auth);
      console.log('   user_name:', auth.user_name);
      console.log('   api_key:', auth.api_key);
      console.log('   customer_id:', auth.customer_id);
      console.log('   customer info:', auth.customer || 'NULL - SIN CUSTOMER');
      console.log('   creation_date:', auth.creation_date);
    });
    
    console.log('\n📊 Customers disponibles:');
    const customers = await prisma.customer.findMany();
    customers.forEach(c => {
      console.log(`   ID ${c.id_customer}: ${c.name} (${c.short_name})`);
    });
    
    // Verificar si el customer_id está NULL
    const authWithNullCustomer = authUsers.filter(auth => auth.customer_id === null);
    if (authWithNullCustomer.length > 0) {
      console.log('\n⚠️ PROBLEMA DETECTADO:');
      console.log(`   ${authWithNullCustomer.length} auth_users tienen customer_id = NULL`);
      console.log('   Esto significa que NO están asociados a ningún customer');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuthUsers();