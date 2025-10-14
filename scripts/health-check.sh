#!/bin/bash
# GeniusDB - Health Check Script

echo "🔍 Checking GeniusDB Services..."
echo "=================================="

# Check if Docker Compose is running
if ! docker-compose ps > /dev/null 2>&1; then
    echo "✗ Docker Compose is not running or not installed"
    exit 1
fi

# Function to check service
check_service() {
    local service=$1
    local url=$2
    
    echo -n "Checking $service... "
    
    # Check if container is running
    if docker-compose ps $service | grep -q "Up"; then
        echo -n "Container: ✓ "
        
        # Check HTTP endpoint if URL provided
        if [ -n "$url" ]; then
            if curl -s -f "$url" > /dev/null; then
                echo "HTTP: ✓"
                return 0
            else
                echo "HTTP: ✗"
                return 1
            fi
        else
            echo ""
            return 0
        fi
    else
        echo "Container: ✗"
        return 1
    fi
}

# Check each service
echo ""
check_service "postgres" ""
check_service "backend" "http://localhost:5801/health"
check_service "frontend" "http://localhost:5802"

echo ""
echo "=================================="

# Check container logs for errors
echo "Recent errors (if any):"
docker-compose logs --tail=10 2>&1 | grep -i "error" || echo "No recent errors found"

echo ""
echo "Container status:"
docker-compose ps

echo ""
echo "Resource usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "Health check complete!"

