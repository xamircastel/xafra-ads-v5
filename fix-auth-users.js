const { prisma } = require('./packages/database/src/index.js');

async function fixExistingAuthUser() {
  try {
    console.log('🔧 Corrigiendo auth_user existente...\n');
    
    // Buscar auth_users con customer_id NULL
    const authUsersWithNullCustomer = await prisma.authUser.findMany({
      where: {
        customer_id: null
      }
    });
    
    console.log(`📋 Encontrados ${authUsersWithNullCustomer.length} auth_users con customer_id NULL`);
    
    for (const authUser of authUsersWithNullCustomer) {
      console.log(`\n🔧 Corrigiendo Auth User ID ${authUser.id_auth}:`);
      console.log(`   user_name: ${authUser.user_name}`);
      
      // Si el user_name es "Digital-X", asociarlo con customer_id = 1
      let customer_id = null;
      if (authUser.user_name === 'Digital-X') {
        customer_id = 1;
      }
      
      if (customer_id) {
        const updated = await prisma.authUser.update({
          where: {
            id_auth: authUser.id_auth
          },
          data: {
            customer_id: customer_id
          }
        });
        
        console.log(`   ✅ Actualizado con customer_id: ${customer_id}`);
      } else {
        console.log(`   ⚠️ No se pudo determinar el customer_id para este auth_user`);
      }
    }
    
    // Verificar el resultado
    console.log('\n🔍 Verificando corrección...');
    const authUsers = await prisma.authUser.findMany({
      include: {
        customer: {
          select: { id_customer: true, name: true }
        }
      }
    });
    
    authUsers.forEach(auth => {
      console.log(`   Auth ID ${auth.id_auth}: customer_id=${auth.customer_id}, customer_name=${auth.customer?.name || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingAuthUser();