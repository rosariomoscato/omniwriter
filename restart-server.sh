#!/bin/bash
echo "Stopping any existing server..."
pkill -f "node.*server" 2>/dev/null
sleep 1

echo "Starting server..."
cd server
npm run dev > ../server.log 2>&1 &
PID=$!
echo $PID > ../server.pid
echo "Server started with PID: $PID"
sleep 2
curl -s http://localhost:5001/api/health && echo "Server is responding!" || echo "Server not responding yet"
