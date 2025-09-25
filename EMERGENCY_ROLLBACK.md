# XAFRA-ADS V5 - EMERGENCY ROLLBACK PROCEDURES
# En caso de problemas con cambios de PostgreSQL

## ROLLBACK IMMEDIATO - PostgreSQL Whitelist
```bash
# 1. RESTAURAR ACCESO COMPLETO (EMERGENCIA)
gcloud sql instances patch xafra-ads-postgres \
  --authorized-networks=0.0.0.0/0 \
  --quiet

# 2. VERIFICAR SERVICIOS
curl -f https://stg.xafra-ads.com/gateway/health
curl -f https://core-service-stg-shk2qzic2q-uc.a.run.app/health

# 3. REVERTIR SSL (si aplicable)
gcloud sql instances patch xafra-ads-postgres \
  --require-ssl=false \
  --quiet
```

## MONITOREO CONTINUO
```bash
# Verificar conexiones activas
gcloud logging read "resource.type=cloud_run_revision" \
  --filter="textPayload:\"database\"" \
  --limit=10 --freshness=5m

# Verificar errores PostgreSQL
gcloud logging read "resource.type=cloudsql_database" \
  --limit=20 --freshness=10m
```

## CONTACTS DE EMERGENCIA
- Xamir: [Usuario principal]
- Backup: [Definir contacto técnico]
- Horario: [Definir ventana de soporte]

## DATOS CRÍTICOS ACTUALES
- PostgreSQL IP: 34.28.245.62
- Redis IP: 10.147.230.83
- Tu IP actual: 186.86.34.48
- Fecha cambio: [LLENAR CUANDO SE IMPLEMENTE]