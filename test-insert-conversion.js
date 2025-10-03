const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: '34.28.245.62',
    port: 5432,
    database: 'xafra-ads',
    user: 'postgres',
    password: 'XafraTech2025!'
  });

  const tracking = `diagnostic-${Date.now()}`;

  const conversionData = {
    customer_id: 1n,
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

  const bufferDiagnostics = Object.fromEntries(
    Object.entries(sanitizedData)
      .filter(([_, value]) => typeof value === 'string')
      .map(([key, value]) => {
        const buffer = Buffer.from(value, 'utf8');
        return [key, {
          hex: buffer.toString('hex'),
          length: buffer.length,
          containsNullByte: buffer.includes(0)
        }];
      })
  );

  console.log('Prepared payload:', sanitizedData);
  console.log('Buffer diagnostics:', bufferDiagnostics);

  try {
    await client.connect();
    console.log('Connected to database.');

    const insertSQL = `
      INSERT INTO staging.conversions
        (customer_id, tracking, id_product, msisdn, empello_token, source, status_post_back, date_post_back, campaign, country, operator)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, tracking;
    `;

    const params = [
      Number(sanitizedData.customer_id),
      sanitizedData.tracking,
      sanitizedData.id_product,
      sanitizedData.msisdn,
      sanitizedData.empello_token,
      sanitizedData.source,
      sanitizedData.status_post_back,
      sanitizedData.date_post_back,
      sanitizedData.campaign,
      sanitizedData.country,
      sanitizedData.operator
    ];

    const result = await client.query(insertSQL, params);
    console.log('Insert success:', result.rows[0]);
  } catch (error) {
    console.error('Insert failed:', error);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Unexpected error:', err);
});
