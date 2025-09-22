#!/bin/sh
# Xafra-ads v5 - Gateway Docker Entrypoint
# Custom entrypoint for graceful Nginx startup with validation

set -e

echo "🚀 Starting Xafra-ads v5 API Gateway..."
echo "========================================="

# Function to test Nginx configuration
test_nginx_config() {
    echo "🔧 Testing Nginx configuration..."
    if nginx -t; then
        echo "✅ Nginx configuration is valid"
        return 0
    else
        echo "❌ Nginx configuration test failed"
        return 1
    fi
}

# Function to create necessary directories
create_directories() {
    echo "📁 Creating necessary directories..."
    mkdir -p /var/log/nginx
    mkdir -p /var/cache/nginx/client_temp
    mkdir -p /var/cache/nginx/proxy_temp
    mkdir -p /var/cache/nginx/fastcgi_temp
    mkdir -p /var/cache/nginx/uwsgi_temp
    mkdir -p /var/cache/nginx/scgi_temp
    chown -R nginx:nginx /var/log/nginx
    chown -R nginx:nginx /var/cache/nginx
    echo "✅ Directories created and permissions set"
}

# Function to validate upstream services
validate_upstreams() {
    echo "🔍 Validating upstream services..."
    
    services=(
        "core-service-stg-697203931362.us-central1.run.app"
        "tracking-service-stg-697203931362.us-central1.run.app"
        "auth-service-stg-697203931362.us-central1.run.app"
        "campaign-service-stg-697203931362.us-central1.run.app"
        "postback-service-stg-697203931362.us-central1.run.app"
    )
    
    for service in "${services[@]}"; do
        echo "  Checking $service..."
        if nslookup "$service" >/dev/null 2>&1; then
            echo "  ✅ $service - DNS resolution OK"
        else
            echo "  ⚠️  $service - DNS resolution failed (will retry at runtime)"
        fi
    done
}

# Function to setup logging
setup_logging() {
    echo "📝 Setting up logging..."
    
    # Create log files if they don't exist
    touch /var/log/nginx/access.log
    touch /var/log/nginx/error.log
    
    # Set proper permissions
    chown nginx:nginx /var/log/nginx/access.log
    chown nginx:nginx /var/log/nginx/error.log
    
    echo "✅ Logging configured"
}

# Function to display service information
display_info() {
    echo ""
    echo "📊 Gateway Information:"
    echo "======================"
    echo "  Image: Nginx 1.25 Alpine"
    echo "  Config: /etc/nginx/nginx.conf"
    echo "  Routes: /etc/nginx/conf.d/gateway-routes.conf"
    echo "  Logs: /var/log/nginx/"
    echo "  Health: http://localhost:8080/nginx-health"
    echo "  Status: http://localhost:8080/nginx-status"
    echo ""
    echo "🎯 Upstream Services:"
    echo "===================="
    echo "  Core Service: core-service-stg-697203931362.us-central1.run.app"
    echo "  Tracking Service: tracking-service-stg-697203931362.us-central1.run.app"
    echo "  Auth Service: auth-service-stg-697203931362.us-central1.run.app"
    echo "  Campaign Service: campaign-service-stg-697203931362.us-central1.run.app"
    echo "  Postback Service: postback-service-stg-697203931362.us-central1.run.app"
    echo ""
}

# Function to wait for services to be ready
wait_for_services() {
    echo "⏳ Waiting for upstream services to be ready..."
    
    # Give services time to start up
    sleep 5
    
    echo "✅ Proceeding with gateway startup"
}

# Main execution
main() {
    # Create directories
    create_directories
    
    # Setup logging
    setup_logging
    
    # Test Nginx configuration
    if ! test_nginx_config; then
        echo "❌ Configuration test failed. Exiting."
        exit 1
    fi
    
    # Validate upstreams (non-blocking)
    validate_upstreams
    
    # Wait for services
    wait_for_services
    
    # Display information
    display_info
    
    echo "🚀 Starting Nginx with provided arguments: $@"
    echo "========================================="
    
    # Execute the main command
    exec "$@"
}

# Handle signals for graceful shutdown
trap_handler() {
    echo ""
    echo "🛑 Received shutdown signal. Gracefully stopping Nginx..."
    nginx -s quit
    exit 0
}

trap trap_handler SIGTERM SIGINT

# Run main function
main "$@"