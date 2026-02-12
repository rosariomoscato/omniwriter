#!/bin/bash
# Test script for Feature 3: Data persists across server restart

echo "=== Feature 3: Data Persistence Test ==="
echo ""

# Step 1: Get current test user info
echo "Step 1: Verifying user exists BEFORE restart..."
node verify-before-restart.js
if [ $? -ne 0 ]; then
  echo "ERROR: No test user found before restart"
  exit 1
fi
echo ""

# Step 2: Stop the server
echo "Step 2: Stopping server..."
if [ -f server.pid ]; then
  PID=$(cat server.pid)
  echo "Killing server PID: $PID"
  kill $PID 2>/dev/null || true
  rm server.pid
fi
pkill -f "tsx.*server" 2>/dev/null || true
sleep 3
echo "Server stopped"
echo ""

# Step 3: Verify server is stopped
echo "Step 3: Verifying server is stopped..."
curl -s http://localhost:3001/api/health && echo "ERROR: Server still responding!" && exit 1
echo "✓ Server is not responding (as expected)"
echo ""

# Step 4: Restart the server
echo "Step 4: Restarting server..."
cd server && npm run dev > ../server.log 2>&1 &
PID=$!
cd ..
echo $PID > server.pid
echo "Server started with PID: $PID"
sleep 8
echo ""

# Step 5: Verify server is responding
echo "Step 5: Verifying server is responding..."
curl -s http://localhost:3001/api/health > /dev/null
if [ $? -eq 0 ]; then
  echo "✓ Server is responding"
else
  echo "ERROR: Server not responding after restart"
  exit 1
fi
echo ""

# Step 6: Verify user still exists
echo "Step 6: Verifying user exists AFTER restart..."
node verify-before-restart.js
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS: Data persists across server restart!"
  echo "Feature 3 is PASSING"
else
  echo ""
  echo "❌ FAILURE: Data does NOT persist across server restart"
  echo "Feature 3 is FAILING - using in-memory storage!"
  exit 1
fi
