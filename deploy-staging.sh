#!/bin/bash
# 🚀 DEPLOYMENT OPTIMIZADO PARA STAGING
# =====================================
# Costo estimado: $4 USD/mes (2 servicios mínimos)

set -e

PROJECT_ID="xafra-ads"
REGION="us-central1"
ENVIRONMENT="staging"

echo "🧪 DEPLOYING XAFRA-ADS V5 TO STAGING"
echo "===================================="
echo "Proyecto: $PROJECT_ID"
echo "Región: $REGION"
echo "Ambiente: $ENVIRONMENT"
echo "Costo estimado: $4 USD/mes"
echo ""

# 1. Configurar proyecto
gcloud config set project $PROJECT_ID

# 2. Build y deploy Core Service (ESENCIAL)
echo "🔧 Building Core Service..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/core-service-stg \
  --build-arg SERVICE_NAME=core-service \
  -f infrastructure/docker/Dockerfile.service .

echo "🚀 Deploying Core Service..."
gcloud run deploy core-service-stg \
  --image gcr.io/$PROJECT_ID/core-service-stg \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --port 8080 \
  --set-env-vars NODE_ENV=staging \
  --set-env-vars DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=staging"

# 3. Build y deploy Tracking Service (ESENCIAL)  
echo "🔧 Building Tracking Service..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/tracking-service-stg \
  --build-arg SERVICE_NAME=tracking-service \
  -f infrastructure/docker/Dockerfile.service .

echo "🚀 Deploying Tracking Service..."
gcloud run deploy tracking-service-stg \
  --image gcr.io/$PROJECT_ID/tracking-service-stg \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --port 8080 \
  --set-env-vars NODE_ENV=staging \
  --set-env-vars DATABASE_URL="postgresql://postgres:XafraTech2025!@34.28.245.62:5432/xafra-ads?schema=staging"

echo ""
echo "🎉 STAGING DEPLOYMENT COMPLETADO"
echo "================================"
echo "Core Service URL:"
gcloud run services describe core-service-stg --region=$REGION --format="value(status.url)"
echo ""
echo "Tracking Service URL:"  
gcloud run services describe tracking-service-stg --region=$REGION --format="value(status.url)"
echo ""
echo "💰 Costo estimado: $4 USD/mes"
echo "🧪 Ambiente: STAGING (schema: staging)"