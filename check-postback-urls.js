const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkPostbackUrls() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        p.id_product,
        p.reference,
        p.name,
        c.name as customer_name,
        p.url_redirect_postback,
        p.method_postback,
        p.body_postback
      FROM staging.products p
      LEFT JOIN staging.customers c ON p.id_customer = c.id_customer
      ORDER BY p.id_product
    `);
    
    console.log('📋 URLs de Postback por Producto:');
    console.log('='.repeat(80));
    
    result.rows.forEach(product => {
      console.log('\nProducto:', product.id_product, '-', product.reference);
      console.log('Cliente:', product.customer_name);
      console.log('URL Postback:', product.url_redirect_postback || 'No configurado');
      console.log('Método:', product.method_postback || 'No configurado');
      console.log('Body Template:', product.body_postback || 'No configurado');
      console.log('-'.repeat(50));
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkPostbackUrls();