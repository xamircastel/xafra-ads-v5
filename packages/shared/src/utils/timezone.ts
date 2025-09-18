// Utility para convertir fechas UTC a hora local de Costa Rica
// Uso en servicios para mostrar fechas locales en APIs

export function convertToCostaRicaTime(utcDate: Date | string | null): string | null {
  if (!utcDate) return null;
  
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  
  // Convertir a hora de Costa Rica (UTC-6)
  return date.toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Ejemplo de uso en Campaign Service
export function formatCampaignWithLocalTime(campaign: any) {
  return {
    ...campaign,
    creation_date_utc: campaign.creation_date,
    creation_date_local: convertToCostaRicaTime(campaign.creation_date),
    modification_date_utc: campaign.modification_date,
    modification_date_local: convertToCostaRicaTime(campaign.modification_date)
  };
}

// Para queries en Prisma con fecha local
export const campaignWithLocalTime = {
  select: {
    id: true,
    creation_date: true,
    tracking: true,
    status: true,
    country: true,
    operator: true,
    // Otros campos...
  }
  // Post-proceso con convertToCostaRicaTime()
};