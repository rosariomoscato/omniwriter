#!/bin/bash
# Start servers for testing feature #203

echo "Starting servers..."

# Kill any existing processes
npx kill-port 3000 2>/dev/null || true
npx kill-port 3001 2>/dev/null || true
sleep 2

# Start backend from dist (no tsx needed)
cd server
node dist/index.js > ../server-test.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../server-test.pid
cd ..

# Start frontend
cd client
npm run dev > ../client-test.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../client-test.pid
cd ..

echo "Servers starting..."
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Waiting for servers to be ready..."

sleep 8

# Check status
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "✓ Backend is running on http://localhost:3001"
else
  echo "✗ Backend failed to start"
  tail -10 ../server-test.log
fi

if curl -s http://localhost:3000 -o /dev/null -w "%{http_code}" 2>/dev/null | grep -q "200"; then
  echo "✓ Frontend is running on http://localhost:3000"
else
  echo "✗ Frontend may still be starting..."
fi

echo ""
echo "To stop servers, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
