# Xafra-ads v5 🚀

## Modern Advertising Backend Application

Xafra-ads v5 is a complete rewrite of our advertising backend system using modern microservices architecture. Built for high-performance URL redirects, traffic optimization, and scalable campaign management.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌐 GCP Load Balancer                          │
└─────────────┬───────────────────────┬───────────────────────────┘
              │                       │
        ┌─────▼─────┐           ┌─────▼─────┐
        │  HOMEPAGE │           │    API    │
        │   React   │           │ GATEWAY   │
        └───────────┘           └─────┬─────┘
                                      │
      ┌─────────────┬─────────────┬───▼───┬─────────────┐
      │             │             │       │             │
 ┌────▼────┐  ┌────▼────┐  ┌────▼────┐ ┌▼────┐  ┌────▼────┐
 │  CORE   │  │TRACKING │  │  AUTH   │ │CAMP │  │POSTBACK │
 │SERVICE  │  │SERVICE  │  │SERVICE  │ │MGMT │  │SERVICE  │
 └─────────┘  └─────────┘  └─────────┘ └─────┘  └─────────┘
```

### 🛠️ Tech Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.x
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Deployment**: GCP Cloud Run + Docker
- **API Gateway**: Nginx

### 🚀 Quick Start

#### Prerequisites
- Node.js 20+ 
- Docker & Docker Compose
- PostgreSQL (local or GCP Cloud SQL)
- Redis (local or GCP Memorystore)

#### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/xamircastel/xafra-ads-v5.git
   cd xafra-ads-v5/dev
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database and Redis credentials
   ```

4. **Setup database**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Start development environment**
   ```bash
   # Start all microservices
   npm run dev
   
   # Or start with Docker
   npm run docker:up
   ```

### 📁 Project Structure

```
xafra-ads-v5/
├── services/                  # Microservices
│   ├── core-service/         # URL redirects & encryption
│   ├── tracking-service/     # Tracking ID management
│   ├── auth-service/         # Authentication & API keys
│   ├── campaign-service/     # Campaign CRUD & analytics
│   └── postback-service/     # Webhook notifications
├── packages/                  # Shared libraries
│   ├── shared/               # Common utilities
│   ├── database/             # Prisma schemas & migrations
│   ├── types/                # TypeScript definitions
│   └── utils/                # Helper functions
├── infrastructure/           # Docker & deployment
│   ├── docker/               # Dockerfiles
│   ├── nginx/                # API Gateway config
│   └── k8s/                  # Kubernetes manifests
└── docs/                     # Documentation
```

### 🔧 Available Scripts

```bash
# Development
npm run dev                   # Start all services in development
npm run build                 # Build all services
npm run test                  # Run tests across all services
npm run lint                  # Lint TypeScript code
npm run format                # Format code with Prettier

# Database
npm run db:generate           # Generate Prisma client
npm run db:migrate            # Run database migrations
npm run db:studio             # Open Prisma Studio

# Docker
npm run docker:build          # Build Docker images
npm run docker:up             # Start services with Docker
npm run docker:down           # Stop Docker services
```

### 🌐 API Endpoints

#### Core Tracking
```
GET  /ads/{encryptedId}                     # Standard tracking
GET  /ads/tr/{encryptedId}                  # Auto-generate tracking
GET  /ads/random/{encryptedId}              # Traffic optimization
```

#### Confirmation & Postback
```
POST /confirm/{apikey}/{tracking}           # Standard confirmation
POST /confirm/short/{apikey}/{shortTracking} # Costa Rica Kolbi
```

#### Campaign Management
```
GET    /api/campaigns                       # List campaigns
POST   /api/campaigns                       # Create campaign
GET    /api/campaigns/{id}                  # Get campaign
PUT    /api/campaigns/{id}                  # Update campaign
```

### 🌍 Supported Countries & Operators

- **Costa Rica**: Kolbi (special short tracking support)
- **Global**: Standard tracking for all operators
- **Custom**: Configurable per country/operator

### 📊 Key Features

- **⚡ Ultra-fast redirects** (< 50ms target)
- **🎯 Traffic optimization** with conversion rate analysis
- **🔐 Secure encryption** for product IDs
- **📈 Real-time analytics** and performance monitoring
- **🌐 Multi-country support** with operator-specific logic
- **🔄 Webhook postbacks** for traffic source notifications

### 🏥 Health Monitoring

- **Metrics**: Response times, conversion rates, error rates
- **Logging**: Structured JSON logs with trace correlation
- **Alerts**: Real-time monitoring with GCP Cloud Monitoring

### 🚢 Deployment

#### Staging
```bash
git push origin develop
# Auto-deploys to GCP Cloud Run staging
```

#### Production
```bash
git push origin main
# Auto-deploys to GCP Cloud Run production
```

### 📋 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/xafra_ads
REDIS_URL=redis://localhost:6379

# Encryption
ENCRYPTION_KEY=your-256-bit-encryption-key
ENCRYPTION_SALT=your-salt-value

# Services
CORE_SERVICE_PORT=3001
TRACKING_SERVICE_PORT=3002
AUTH_SERVICE_PORT=3003
CAMPAIGN_SERVICE_PORT=3004
POSTBACK_SERVICE_PORT=3005

# External APIs
GCP_PROJECT_ID=your-gcp-project
GCP_REGION=us-central1
```

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📄 License

This project is proprietary and confidential.

### 🆘 Support

For support, contact the Xafra development team or create an issue in the repository.

---

**Built with ❤️ by the Xafra Team**