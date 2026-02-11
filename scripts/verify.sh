#!/bin/bash
#
# Final Verification Script for Agent Arena
# Checks all components are in place and ready for deployment
#

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔍 Agent Arena - Final Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

ERRORS=0
WARNINGS=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        return 0
    else
        echo -e "${RED}❌${NC} $2 (missing: $1)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅${NC} $2"
        return 0
    else
        echo -e "${RED}❌${NC} $2 (missing: $1)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Check project structure
echo -e "\n${YELLOW}📁 Checking Project Structure...${NC}"
check_file "package.json" "Package configuration"
check_file ".env.template" "Environment template"
check_file "docker-compose.yml" "Docker Compose (dev)"
check_file "docker-compose.prod.yml" "Docker Compose (production)"
check_file "Dockerfile" "Backend Dockerfile"

# Check documentation
echo -e "\n${YELLOW}📚 Checking Documentation...${NC}"
check_file "README.md" "Main README"
check_file "docs/API.md" "API Documentation"
check_file "docs/SETUP.md" "Setup Guide"
check_file "docs/ARCHITECTURE.md" "Architecture Overview"
check_file "docs/DEPLOYMENT.md" "Deployment Guide"

# Check backend source
echo -e "\n${YELLOW}⚙️  Checking Backend Source...${NC}"
check_file "src/index.js" "Main server entry"
check_dir "src/routes" "API Routes"
check_dir "src/models" "Database Models"
check_dir "src/services" "Business Services"
check_dir "src/middleware" "Middleware"
check_dir "src/games" "Game Implementations"

# Check frontend
echo -e "\n${YELLOW}🎨 Checking Frontend...${NC}"
check_file "frontend/package.json" "Frontend package config"
check_file "frontend/Dockerfile" "Frontend Dockerfile"
check_file "frontend/nginx.conf" "Nginx configuration"
check_file "frontend/vite.config.js" "Vite configuration"
check_dir "frontend/src/components" "React Components"
check_dir "frontend/src/pages" "Page Components"

# Check tests
echo -e "\n${YELLOW}🧪 Checking Tests...${NC}"
check_dir "tests" "Test Directory"
check_file "scripts/e2e-test.js" "E2E Test Script"
check_file "scripts/run-e2e-tests.sh" "E2E Test Runner"

# Check SDK and examples
echo -e "\n${YELLOW}📦 Checking SDK & Examples...${NC}"
check_file "sdk/index.js" "Agent SDK"
check_file "examples/simple-agent.js" "Simple Agent Example"
check_file "examples/test-agent.js" "Test Agent Example"

# Check deployment files
echo -e "\n${YELLOW}🚀 Checking Deployment Configuration...${NC}"
check_dir "monitoring" "Monitoring Configuration"
check_file "monitoring/prometheus.yml" "Prometheus Config"
check_dir "monitoring/grafana/dashboards" "Grafana Dashboards"
check_dir "monitoring/grafana/datasources" "Grafana Datasources"

# Check migrations
echo -e "\n${YELLOW}🗄️  Checking Database Migrations...${NC}"
check_dir "migrations" "Migration Directory"
if [ -d "migrations" ]; then
    MIGRATION_COUNT=$(find migrations -name "*.sql" | wc -l)
    echo -e "${GREEN}✅${NC} Found $MIGRATION_COUNT migration files"
fi

# Summary
echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Verification Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo -e "${GREEN}   Project is ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS error(s)${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $WARNINGS warning(s)${NC}"
    fi
    echo -e "${YELLOW}   Please fix the errors before deploying.${NC}"
    exit 1
fi