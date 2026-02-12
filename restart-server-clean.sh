#!/bin/bash
# Clean restart script for OmniWriter server

cd /Users/rosario/CODICE/omniwriter

# Find and kill any node process listening on port 3001
PORT_PID=$(lsof -ti :3001 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "Killing process $PORT_PID on port 3001"
    kill -9 $PORT_PID 2>/dev/null
    sleep 2
fi

# Remove old PID files
rm -f server.pid client.pid

# Start server
echo "Starting server..."
cd server
npm start > ../server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > ../server.pid
echo "Server started with PID: $SERVER_PID"

# Wait and check
sleep 4
if curl -s http://127.0.0.1:3001/api/health > /dev/null; then
    echo "Server is responding on port 3001"
    curl -s http://127.0.0.1:3001/api/health
else
    echo "Server failed to start, checking logs..."
    tail -20 ../server.log
fi
