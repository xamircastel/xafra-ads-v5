// EJEMPLO DE CÓMO DEBERÍA SER LA LÓGICA CORRECTA:

// En lugar de:
// campaign._count.tracking (NO EXISTE)
// campaign._count.confirm (NO EXISTE)

// Deberíamos usar:
const campaignStats = await prisma.campaign.aggregate({
  where: { 
    id_product: productId,
    // Otros filtros si son necesarios
  },
  _count: {
    _all: true,  // Total de registros (total clicks)
  }
});

const conversions = await prisma.campaign.count({
  where: { 
    id_product: productId,
    status: 1  // Solo las confirmadas como ventas
  }
});

const totalClicks = campaignStats._count._all;
const totalConversions = conversions;
const conversionRate = totalClicks > 0 ? 
  Math.round((totalConversions / totalClicks) * 10000) / 100 : 0;