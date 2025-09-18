const { prisma } = require('./packages/database/src/index.js');

async function showCustomerStructure() {
  try {
    console.log('📋 Estructura de la tabla customers:\n');
    
    // Obtener la estructura de la tabla
    const structure = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.table(structure);
    
    console.log('\n💡 Ejemplo de INSERT para crear un customer:');
    console.log(`
INSERT INTO customers (name, short_name, mail, phone, country, operator) 
VALUES (
  'Test Company',
  'TEST',
  'test@company.com',
  '+506 1234-5678',
  'CR',
  'KOLBI'
);
    `);
    
    console.log('\n🔍 Customers actuales en la BD:');
    const currentCustomers = await prisma.customer.findMany();
    if (currentCustomers.length === 0) {
      console.log('No hay customers en la base de datos');
    } else {
      console.table(currentCustomers);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showCustomerStructure();