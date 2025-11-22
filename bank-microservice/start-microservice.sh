#!/bin/bash

# Start Bank Microservice
# This script starts Redis and MongoDB in Docker, then runs the microservice locally

echo "🚀 Starting Bank Microservice..."
echo ""

cd "$(dirname "$0")"

# Start Redis and MongoDB in Docker
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo "📦 Starting Redis and MongoDB with Docker Compose..."
    docker-compose up -d redis mongodb
    
    echo ""
    echo "⏳ Waiting for services to be healthy..."
    sleep 5
    
    echo ""
    echo "✅ Redis and MongoDB started! Check status with:"
    echo "   docker-compose ps"
    echo ""
else
    echo "⚠️  Docker not available. Make sure Redis and MongoDB are running locally!"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Set environment variables for local development
export HOST=0.0.0.0
export PORT=3000
export REDIS_HOST=${REDIS_HOST:-localhost}
export REDIS_PORT=${REDIS_PORT:-6379}
export MONGODB_URI=${MONGODB_URI:-mongodb://localhost:27017/bank-microservice}

echo "🚀 Starting microservice..."
echo "   HOST: $HOST"
echo "   PORT: $PORT"
echo "   REDIS_HOST: $REDIS_HOST"
echo "   REDIS_PORT: $REDIS_PORT"
echo "   MONGODB_URI: $MONGODB_URI"
echo ""

pnpm run start:dev
