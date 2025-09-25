// Verificar configuración de esquemas
console.log('🔍 Verificando configuración de esquemas...');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');

// Simular la lógica del postback-service
function getSchemaForEnvironment() {
  switch (process.env.NODE_ENV) {
    case 'production':
      return 'production';
    case 'staging': 
      return 'staging';
    default:
      return 'public';
  }
}

const schema = getSchemaForEnvironment();
console.log('📊 Schema seleccionado:', schema);

// Simular una query
const testQuery = `
  SELECT * FROM {schema}.campaign 
  WHERE id = $1
`;

const finalQuery = testQuery.replace(/\{schema\}/g, schema);
console.log('🔧 Query final:', finalQuery);

// Verificar que el core-service está usando staging
console.log('\n🔍 Verificando core-service...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado' : 'No configurado');

if (process.env.DATABASE_URL) {
  console.log('📄 DATABASE_URL preview:', process.env.DATABASE_URL.substring(0, 50) + '...');
}