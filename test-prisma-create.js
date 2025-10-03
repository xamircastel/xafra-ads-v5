const { PrismaClient } = require('@prisma/client');

async function run() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=staging'
      }
    },
    log: [{ emit: 'event', level: 'query' }, 'error', 'warn']
  });

  prisma.$on('query', (event) => {
    console.log('Prisma query:', event.query);
    console.log('Prisma params:', event.params);
  });

  const tracking = `prisma-test-${Date.now()}`;

  const conversionData = {
    customer_id: BigInt(1),
    tracking,
    id_product: null,
    msisdn: null,
    empello_token: null,
    campaign: null,
    source: 'google',
    country: 'CR',
    operator: 'KOLBI',
    status_post_back: 0,
    date_post_back: null
  };

  const sanitizedData = {};
  for (const [key, value] of Object.entries(conversionData)) {
    if (typeof value === 'string') {
      sanitizedData[key] = value.replace(/\0/g, '');
    } else {
      sanitizedData[key] = value;
    }
  }

  try {
    console.log('Attempting prisma.conversion.create with data:', sanitizedData);
    const conversion = await prisma.conversion.create({
      data: sanitizedData
    });
    console.log('Success:', conversion.id, conversion.tracking);
  } catch (error) {
    console.error('Prisma create failed:', error);
    try {
      console.log('Trying raw execute via Prisma $executeRaw...');
      const result = await prisma.$executeRaw`
        INSERT INTO "staging"."conversions"
          ("customer_id", "tracking", "id_product", "msisdn", "empello_token", "source", "status_post_back", "date_post_back", "campaign", "country", "operator")
        VALUES (${sanitizedData.customer_id}, ${sanitizedData.tracking}, ${sanitizedData.id_product}, ${sanitizedData.msisdn}, ${sanitizedData.empello_token}, ${sanitizedData.source}, ${sanitizedData.status_post_back}, ${sanitizedData.date_post_back}, ${sanitizedData.campaign}, ${sanitizedData.country}, ${sanitizedData.operator})
      `;
      console.log('Raw execute result:', result);
      const rows = await prisma.$queryRaw`
        SELECT * FROM "staging"."conversions" WHERE "tracking" = ${sanitizedData.tracking} ORDER BY "conversion_date" DESC LIMIT 1;
      `;
      console.log('Row fetched via $queryRaw:', rows);
    } catch (rawError) {
      console.error('Prisma $executeRaw failed:', rawError);
    }
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('Unexpected error:', err);
});
