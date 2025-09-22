# ============================================
# MULTI-STAGE DOCKERFILE PARA PRODUCCIÓN
# ============================================

# STAGE 1: Base with dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache curl bash git
WORKDIR /app

# STAGE 2: Install dependencies and build
FROM base AS builder

# Copy workspace files
COPY package*.json ./
COPY tsconfig*.json ./
COPY packages/ ./packages/
COPY services/core-service/ ./services/core-service/

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Build packages in correct order
RUN npm run build --workspace=@xafra/shared
RUN npm run build --workspace=@xafra/database  
RUN npm run build --workspace=core-service

# Verify build output
RUN ls -la services/core-service/dist/
RUN ls -la packages/shared/dist/
RUN ls -la packages/database/dist/

# STAGE 3: Production runtime
FROM base AS production

# Copy package.json files for workspace structure
COPY package*.json ./

# Copy built packages with correct structure
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist/ ./packages/shared/dist/
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/dist/ ./packages/database/dist/

# Copy built service
COPY --from=builder /app/services/core-service/package.json ./services/core-service/
COPY --from=builder /app/services/core-service/dist/ ./services/core-service/dist/

# Install only production dependencies
RUN npm ci --omit=dev

# Create symlinks for workspace packages (CRITICAL FIX)
RUN mkdir -p node_modules/@xafra
RUN ln -sf /app/packages/shared node_modules/@xafra/shared
RUN ln -sf /app/packages/database node_modules/@xafra/database

# Verify package structure
RUN ls -la node_modules/@xafra/
RUN node -e "console.log(require('@xafra/shared/package.json').name)"

# Runtime configuration
EXPOSE 8080
ENV NODE_ENV=staging
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Security user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Start command
CMD ["node", "services/core-service/dist/index.js"]