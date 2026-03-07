#!/bin/bash
# Start servers in background

# Start backend
cd /Users/rosario/CODICE/omniwriter/server && npm run dev > /Users/rosario/CODICE/omniwriter/server.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /Users/rosario/CODICE/omniwriter/server.pid
echo "Backend started with PID: $BACKEND_PID"

# Start frontend
cd /Users/rosario/CODICE/omniwriter/client && PORT=3000 npm run dev > /Users/rosario/CODICE/omniwriter/client.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /Users/rosario/CODICE/omniwriter/client.pid
echo "Frontend started with PID: $FRONTEND_PID"

# Wait a bit for startup
sleep 5

echo "Servers starting..."
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
