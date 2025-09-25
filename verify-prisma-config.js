// Verificar configuración exacta del DATABASE_URL y schema
console.log('🔍 Verificando configuración real del core-service...');

const databaseUrl = process.env.DATABASE_URL || '';
console.log('DATABASE_URL configurado:', databaseUrl ? 'Sí' : 'No');

if (databaseUrl) {
  // Check if URL contains schema parameter
  const hasSchema = databaseUrl.includes('schema=');
  console.log('Contiene schema= en URL:', hasSchema);
  
  if (hasSchema) {
    const match = databaseUrl.match(/schema=([^&\s]+)/);
    if (match) {
      console.log('Schema detectado en URL:', match[1]);
    }
  } else {
    console.log('❗ No hay schema especificado en DATABASE_URL');
    console.log('💡 Prisma usará el schema DEFAULT de PostgreSQL');
  }
}

// Check env variables
console.log('DATABASE_SCHEMA variable:', process.env.DATABASE_SCHEMA || 'No configurado');
console.log('NODE_ENV:', process.env.NODE_ENV || 'No configurado');

// Simulate what PostgreSQL will use as default
console.log('\n📊 PostgreSQL behavior:');
console.log('- Sin schema= en URL → usa search_path default');
console.log('- search_path default en PostgreSQL → "public"');
console.log('- Pero si staging está en search_path, podría usar staging');

console.log('\n🎯 Conclusión probable:');
console.log('- El core-service podría estar usando staging por configuración de PostgreSQL');
console.log('- O el DATABASE_URL tiene configuración específica');