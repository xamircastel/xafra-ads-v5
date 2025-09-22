#!/bin/bash
# 🔧 Script de cambio de ambiente
# ===============================

set -e

ENVIRONMENT=$1
ROOT_DIR="$(dirname "$(realpath "$0")")"

if [ -z "$ENVIRONMENT" ]; then
    echo "❌ Error: Especifica el ambiente"
    echo "📖 Uso: $0 [dev|staging|production]"
    exit 1
fi

case $ENVIRONMENT in
    "dev")
        echo "🔧 Cambiando a ambiente DESARROLLO..."
        cp "$ROOT_DIR/environments/dev/.env.dev" "$ROOT_DIR/.env"
        echo "✅ Configuración DEV activada"
        echo "🌐 URLs: localhost con puertos específicos"
        echo "🗄️ BD: 34.28.245.62 (existente)"
        ;;
    "staging")
        echo "🧪 Cambiando a ambiente STAGING..."
        cp "$ROOT_DIR/environments/staging/.env.staging" "$ROOT_DIR/.env"
        echo "✅ Configuración STG activada"
        echo "🌐 URLs: stg-api.xafra-ads.com"
        echo "🗄️ BD: Cloud SQL STG"
        ;;
    "production")
        echo "🏭 Cambiando a ambiente PRODUCCIÓN..."
        cp "$ROOT_DIR/environments/production/.env.production" "$ROOT_DIR/.env"
        echo "✅ Configuración PROD activada"
        echo "🌐 URLs: api.xafra-ads.com"  
        echo "🗄️ BD: Cloud SQL PROD"
        ;;
    *)
        echo "❌ Error: Ambiente no válido"
        echo "📖 Ambientes disponibles: dev, staging, production"
        exit 1
        ;;
esac

echo ""
echo "🎯 Ambiente actual: $ENVIRONMENT"
echo "📁 Archivo .env actualizado"
echo "🔄 Reinicia los servicios para aplicar cambios"