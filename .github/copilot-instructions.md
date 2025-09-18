# Xafra-ads v5 - Copilot Instructions

## Project Overview
Xafra-ads v5 is a modern advertising backend application built with Node.js + TypeScript microservices architecture. This is a complete rewrite of the legacy system focused on performance, scalability, and maintainability.

## Architecture
- **Microservices**: 5 core services (Core, Tracking, Auth, Campaign, Postback)
- **Technology Stack**: Node.js 20 LTS + TypeScript 5.x + Express.js + Prisma ORM
- **Database**: PostgreSQL (existing structure) + Redis cache
- **Deployment**: GCP Cloud Run + Docker containers
- **API Gateway**: Nginx for service routing

## Key Business Rules
- URL redirects must be < 50ms for advertising performance
- Support for country/operator specific logic (especially Costa Rica Kolbi)
- Traffic optimization with weighted distribution based on conversion rates
- Comprehensive logging for debugging and performance monitoring
- Backward compatibility with existing database structure (2.9M+ records)

## Development Guidelines
- Use TypeScript strict mode for type safety
- Follow microservices patterns with clear service boundaries
- Implement proper error handling and logging
- Write unit tests for critical business logic
- Use Prisma for database operations
- Implement caching for frequently accessed data

## Special Considerations
- Costa Rica Kolbi requires short tracking ID mapping
- Random traffic distribution for performance optimization
- Encryption/decryption for product IDs in URLs
- Webhook postback notifications to traffic sources
- API key authentication for customer endpoints

## Progress Tracking
- [x] Project structure created
- [x] Root configuration setup
- [ ] Microservices implementation
- [ ] Database integration
- [ ] Docker containerization
- [ ] Testing and QA