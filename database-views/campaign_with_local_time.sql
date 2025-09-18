-- Vista para mostrar campaigns con fecha local
-- Uso: SELECT * FROM campaign_local_view;

CREATE OR REPLACE VIEW campaign_local_view AS
SELECT 
  id,
  creation_date,
  creation_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica' AS creation_date_local,
  modification_date,
  modification_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica' AS modification_date_local,
  id_product,
  tracking,
  status,
  uuid,
  status_post_back,
  date_post_back,
  date_post_back AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica' AS date_post_back_local,
  params,
  xafra_tracking_id,
  short_tracking,
  country,
  operator
FROM campaign;

-- Comentarios de uso:
-- En DBeaver: SELECT * FROM campaign_local_view WHERE creation_date_local >= '2025-09-18'
-- Para desarrollo: Usar esta vista en reportes que necesiten hora local
-- Performance: No impacta tabla original, cálculo en tiempo real