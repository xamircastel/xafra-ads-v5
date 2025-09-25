FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create directories for static files
RUN mkdir -p /usr/share/nginx/html

# Copy homepage static files (will be added later)
# COPY ../../../homepage/dist/ /usr/share/nginx/html/

# Create a simple index.html for now
RUN echo '<!DOCTYPE html><html><head><title>Xafra-ads v5</title></head><body><h1>Xafra-ads v5 - Coming Soon</h1></body></html>' > /usr/share/nginx/html/index.html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]