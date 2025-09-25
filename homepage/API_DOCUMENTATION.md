# Xafra Ads - API Documentation

## Overview
Esta documentación define las APIs que el backend debe implementar para soportar el frontend de Xafra Ads.

## Base URL
```
https://api.xafra-ads.com/v1
```

## Authentication
Todas las APIs protegidas requieren un token JWT en el header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Authentication APIs

#### POST /api/auth/login
Autenticación de usuarios
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "affiliate"
    }
  }
}
```

#### POST /api/auth/register
Registro de nuevos usuarios
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "affiliate"
}
```

### 2. Campaign APIs

#### GET /api/campaigns
Lista todas las campañas
```json
Query Parameters:
- page: number (default: 1)
- limit: number (default: 10)
- status: string (active|paused|completed)
- category: string

Response:
{
  "success": true,
  "data": [
    {
      "id": "campaign_id",
      "name": "Campaign Name",
      "description": "Campaign description",
      "category": "mobile-mvas",
      "status": "active",
      "budget": 10000,
      "spent": 2500,
      "conversions": 150,
      "clicks": 5000,
      "impressions": 50000,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### POST /api/campaigns
Crear nueva campaña
```json
Request:
{
  "name": "New Campaign",
  "description": "Campaign description",
  "category": "mobile-mvas",
  "budget": 10000,
  "endDate": "2024-12-31T23:59:59Z"
}
```

### 3. Offers APIs

#### GET /api/offers
Lista todas las ofertas disponibles
```json
Query Parameters:
- category: string
- type: string (direct|indirect)
- country: string
- isActive: boolean

Response:
{
  "success": true,
  "data": [
    {
      "id": "offer_id",
      "title": "Offer Title",
      "description": "Offer description",
      "type": "direct",
      "payout": 25.50,
      "currency": "USD",
      "countries": ["PE", "CO", "MX"],
      "category": "mobile-mvas",
      "isActive": true,
      "requirements": ["18+ years", "Mobile device"],
      "trackingUrl": "https://track.xafra-ads.com/click/offer_id"
    }
  ]
}
```

### 4. Analytics APIs

#### GET /api/analytics/dashboard
Datos del dashboard principal
```json
Response:
{
  "success": true,
  "data": {
    "totalCampaigns": 150,
    "activeCampaigns": 75,
    "totalRevenue": 250000,
    "totalClicks": 1000000,
    "totalConversions": 25000,
    "conversionRate": 2.5,
    "topCountries": [
      {
        "country": "Peru",
        "revenue": 75000,
        "campaigns": 25
      }
    ]
  }
}
```

#### GET /api/analytics/campaigns
Analytics por campaña
```json
Query Parameters:
- period: string (daily|weekly|monthly)
- startDate: string (ISO date)
- endDate: string (ISO date)
- campaignId: string (optional)

Response:
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "impressions": 10000,
      "clicks": 500,
      "conversions": 25,
      "revenue": 625.00
    }
  ]
}
```

### 5. Payment APIs

#### GET /api/payments
Lista de pagos del usuario
```json
Query Parameters:
- status: string (pending|processing|completed|failed)
- page: number
- limit: number

Response:
{
  "success": true,
  "data": [
    {
      "id": "payment_id",
      "amount": 1250.00,
      "currency": "USD",
      "status": "completed",
      "method": "bank_transfer",
      "createdAt": "2024-01-01T00:00:00Z",
      "processedAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

#### POST /api/payments
Solicitar nuevo pago
```json
Request:
{
  "amount": 1000.00,
  "method": "bank_transfer",
  "bankDetails": {
    "accountNumber": "1234567890",
    "bankName": "Banco de la Nación",
    "accountHolder": "John Doe"
  }
}
```

### 6. Countries APIs

#### GET /api/countries/stats
Estadísticas por país
```json
Response:
{
  "success": true,
  "data": [
    {
      "code": "PE",
      "name": "Peru",
      "isActive": true,
      "campaigns": 25,
      "revenue": 75000
    },
    {
      "code": "CO",
      "name": "Colombia",
      "isActive": true,
      "campaigns": 30,
      "revenue": 85000
    }
  ]
}
```

### 7. Contact APIs

#### POST /api/contact/message
Enviar mensaje de contacto
```json
Request:
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Consulta sobre servicios",
  "message": "Me interesa conocer más sobre sus servicios",
  "phone": "+51987654321"
}

Response:
{
  "success": true,
  "message": "Mensaje enviado correctamente"
}
```

## Error Responses
Todas las APIs pueden retornar errores en el siguiente formato:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting
- 1000 requests per hour per IP
- 100 requests per minute per authenticated user

## Data Validation
- Todos los campos requeridos deben ser validados
- Emails deben tener formato válido
- Passwords deben tener mínimo 8 caracteres
- Amounts deben ser números positivos
- Dates deben estar en formato ISO 8601