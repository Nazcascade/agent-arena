#!/bin/bash
#
# End-to-End Test Runner Script
# 
# Usage: ./scripts/run-e2e-tests.sh
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🤖 Agent Arena - E2E Test Runner${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check if infrastructure is running
echo -e "\n${YELLOW}🔍 Checking infrastructure...${NC}"

if ! docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Infrastructure not running. Starting...${NC}"
    docker-compose up -d
    
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 10
else
    echo -e "${GREEN}✅ Infrastructure is running${NC}"
fi

# Check backend health
echo -e "\n${YELLOW}🔍 Checking backend health...${NC}"

for i in {1..10}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        break
    fi
    
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        docker-compose logs backend
        exit 1
    fi
    
    echo -e "${YELLOW}   Waiting for backend... ($i/10)${NC}"
    sleep 3
done

# Run migrations
echo -e "\n${YELLOW}🗄️  Running database migrations...${NC}"
npm run db:migrate

# Run E2E tests
echo -e "\n${YELLOW}🧪 Running end-to-end tests...${NC}"
node scripts/e2e-test.js

# Test result
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ All E2E tests passed!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
else
    echo -e "\n${RED}═══════════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ Some E2E tests failed${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════${NC}"
fi

exit $TEST_RESULT