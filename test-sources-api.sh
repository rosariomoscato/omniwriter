#!/bin/bash
# Test Sources API with alternative port

PORT_PID=$(lsof -ti :54321 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    kill -9 $PORT_PID 2>/dev/null
    sleep 1
fi

cd /Users/rosario/CODICE/omniwriter/server
PORT=54321 npm start > /Users/rosario/CODICE/omniwriter/server-test.log 2>&1 &
echo $! > /Users/rosario/CODICE/omniwriter/server-test.pid
sleep 4

# Test health endpoint
echo "Testing health endpoint on port 54321..."
curl -s http://127.0.0.1:54321/api/health | head -20 || echo "Failed to connect"

# Test sources endpoint
echo ""
echo "Testing /api/sources endpoint..."
curl -s http://127.0.0.1:54321/api/sources | head -20 || echo "Failed to connect to sources"

echo ""
echo "Server logs:"
tail -10 /Users/rosario/CODICE/omniwriter/server-test.log
