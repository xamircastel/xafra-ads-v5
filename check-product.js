const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProduct() {
  try {
    const product = await prisma.product.findFirst({
      where: { id_product: 1 }
    });
    
    console.log('Product ID 1:');
    console.log('name:', product?.name);
    console.log('url_redirect_postback:', product?.url_redirect_postback || 'NOT SET');
    console.log('method_postback:', product?.method_postback || 'NOT SET');
    console.log('body_postback:', product?.body_postback || 'NOT SET');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

checkProduct();