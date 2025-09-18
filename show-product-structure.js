const { prisma } = require('./packages/database/src/index.js');

async function showProductStructure() {
  try {
    console.log('📋 Estructura de la tabla products:\n');
    
    // Obtener la estructura de la tabla
    const structure = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'products' 
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.table(structure);
    
    console.log('\n💡 Ejemplo de INSERT para crear un producto:');
    console.log(`
-- Producto básico para customer con ID 1
INSERT INTO products (
  reference, 
  name, 
  url_redirect_success, 
  active, 
  id_customer, 
  url_redirect_postback,
  method_postback,
  body_postback,
  is_qs,
  country,
  operator,
  random
) VALUES (
  'PROD_001',
  'Producto de Prueba Premium',
  'https://success.example.com/thank-you?user={msisdn}&product={product_id}',
  1,
  1,
  'https://postback.example.com/notify',
  'POST',
  '{"msisdn":"{msisdn}","product_id":"{product_id}","status":"success"}',
  1,
  'CR',
  'KOLBI',
  1
);
    `);
    
    console.log('\n🔍 Products actuales en la BD:');
    const currentProducts = await prisma.product.findMany({
      include: {
        customer: {
          select: { name: true, short_name: true }
        }
      }
    });
    
    if (currentProducts.length === 0) {
      console.log('No hay products en la base de datos');
    } else {
      console.table(currentProducts.map(p => ({
        id_product: p.id_product,
        reference: p.reference,
        name: p.name,
        customer: p.customer?.name || 'Sin customer',
        active: p.active,
        country: p.country,
        operator: p.operator
      })));
    }
    
    console.log('\n📊 Campos importantes:');
    console.log('• reference: Código único del producto');
    console.log('• name: Nombre descriptivo');
    console.log('• url_redirect_success: URL de éxito (acepta placeholders como {msisdn}, {product_id})');
    console.log('• active: 1 = activo, 0 = inactivo');
    console.log('• id_customer: ID del customer (debe existir)');
    console.log('• url_redirect_postback: URL para notificaciones');
    console.log('• method_postback: GET o POST');
    console.log('• body_postback: JSON para postback (acepta placeholders)');
    console.log('• is_qs: 1 = usar query string, 0 = usar body');
    console.log('• country: Código de país (CR, US, etc.)');
    console.log('• operator: KOLBI, MOVISTAR, etc.');
    console.log('• random: 1 = distribución aleatoria, 0 = secuencial');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showProductStructure();