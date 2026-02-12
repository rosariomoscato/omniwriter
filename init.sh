#!/bin/bash
# OmniWriter - Development Environment Setup Script
# This script installs dependencies and starts the development servers

set -e

echo "========================================="
echo "  OmniWriter - Development Environment"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${YELLOW}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js >= 18.x${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version must be >= 18. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js $(node -v) detected${NC}"

# Check npm
echo -e "${YELLOW}Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}npm $(npm -v) detected${NC}"

# Project root directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Kill any existing processes on port 3000 and 3001
echo ""
echo -e "${YELLOW}Checking for existing processes on ports 3000 and 3001...${NC}"
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Install backend dependencies
echo ""
echo -e "${YELLOW}Installing backend dependencies...${NC}"
if [ -d "server" ] && [ -f "server/package.json" ]; then
    cd server
    npm install
    cd "$PROJECT_DIR"
    echo -e "${GREEN}Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}Backend directory not yet set up - skipping${NC}"
fi

# Install frontend dependencies
echo ""
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
if [ -d "client" ] && [ -f "client/package.json" ]; then
    cd client
    npm install
    cd "$PROJECT_DIR"
    echo -e "${GREEN}Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}Frontend directory not yet set up - skipping${NC}"
fi

# Start backend server
echo ""
echo -e "${YELLOW}Starting backend server on port 3001...${NC}"
if [ -d "server" ] && [ -f "server/package.json" ]; then
    cd server
    npm run dev &
    BACKEND_PID=$!
    cd "$PROJECT_DIR"
    echo -e "${GREEN}Backend server starting (PID: $BACKEND_PID)${NC}"
else
    echo -e "${YELLOW}Backend not available yet${NC}"
fi

# Start frontend server
echo ""
echo -e "${YELLOW}Starting frontend on port 3000...${NC}"
if [ -d "client" ] && [ -f "client/package.json" ]; then
    cd client
    PORT=3000 npm run dev &
    FRONTEND_PID=$!
    cd "$PROJECT_DIR"
    echo -e "${GREEN}Frontend starting (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${YELLOW}Frontend not available yet${NC}"
fi

# Wait for servers to start
echo ""
echo -e "${YELLOW}Waiting for servers to start...${NC}"
sleep 5

echo ""
echo "========================================="
echo -e "${GREEN}  OmniWriter is starting up!${NC}"
echo "========================================="
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  API:       http://localhost:3001/api"
echo "  Health:    http://localhost:3001/api/health"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "========================================="

# Wait for any background process to exit
wait
