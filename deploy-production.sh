#!/bin/bash
# 🏭 DEPLOYMENT OPTIMIZADO PARA PRODUCCIÓN  
# =========================================
# Costo estimado: $8 USD/mes (3 servicios esenciales)

set -e

PROJECT_ID="xafra-ads"
REGION="us-central1" 
ENVIRONMENT="production"

echo "🏭 DEPLOYING XAFRA-ADS V5 TO PRODUCTION"
echo "======================================="
echo "Proyecto: $PROJECT_ID"
echo "Región: $REGION"
echo "Ambiente: $ENVIRONMENT"
echo "Costo estimado: $8 USD/mes"
echo ""

# 1. Configurar proyecto
gcloud config set project $PROJECT_ID

# 2. Build y deploy Core Service (CRÍTICO)
echo "🔧 Building Core Service..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/core-service-prod \
  --build-arg SERVICE_NAME=core-service \
  -f infrastructure/docker/Dockerfile.service .

echo "🚀 Deploying Core Service..."
gcloud run deploy core-service-prod \
  --image gcr.io/$PROJECT_ID/core-service-prod \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --port 8080 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=production"

# 3. Build y deploy Tracking Service (CRÍTICO)
echo "🔧 Building Tracking Service..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/tracking-service-prod \
  --build-arg SERVICE_NAME=tracking-service \
  -f infrastructure/docker/Dockerfile.service .

echo "🚀 Deploying Tracking Service..."
gcloud run deploy tracking-service-prod \
  --image gcr.io/$PROJECT_ID/tracking-service-prod \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 5 \
  --port 8080 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=production"

# 4. Build y deploy Auth Service (IMPORTANTE)
echo "🔧 Building Auth Service..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/auth-service-prod \
  --build-arg SERVICE_NAME=auth-service \
  -f infrastructure/docker/Dockerfile.service .

echo "🚀 Deploying Auth Service..."
gcloud run deploy auth-service-prod \
  --image gcr.io/$PROJECT_ID/auth-service-prod \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --port 8080 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=production"

echo ""
echo "🎉 PRODUCTION DEPLOYMENT COMPLETADO"
echo "==================================="
echo "Core Service URL:"
gcloud run services describe core-service-prod --region=$REGION --format="value(status.url)"
echo ""
echo "Tracking Service URL:"
gcloud run services describe tracking-service-prod --region=$REGION --format="value(status.url)"
echo ""
echo "Auth Service URL:"
gcloud run services describe auth-service-prod --region=$REGION --format="value(status.url)"
echo ""
echo "💰 Costo estimado: $8 USD/mes"
echo "🏭 Ambiente: PRODUCTION (schema: production)"