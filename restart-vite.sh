#!/bin/bash
echo "Stopping Vite..."
pkill -9 -f vite
pkill -9 -f node

echo "Clearing all caches..."
rm -rf /Users/rosario/CODICE/omniwriter/client/node_modules/.vite
rm -rf /Users/rosario/CODICE/omniwriter/client/.vite

echo "Starting fresh..."
cd /Users/rosario/CODICE/omniwriter/client
PORT=3000 npm run dev > /Users/rosario/CODICE/omniwriter/client.log 2>&1 &
echo $! > /Users/rosario/CODICE/omniwriter/client.pid

echo "Waiting for startup..."
sleep 10

echo "Checking logs..."
tail -20 /Users/rosario/CODICE/omniwriter/client.log
