#!/bin/bash
# Restart client to apply PostCSS configuration fix
# This script fixes the Tailwind CSS not being processed

echo "Restarting client to apply PostCSS configuration fix..."

# Kill existing client on port 3000
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

# Wait for ports to be free
sleep 2

# Change to client directory
cd /Users/rosario/CODICE/omniwriter/client

# Start client
echo "Starting client..."
npm run dev > /Users/rosario/CODICE/omniwriter/client.log 2>&1 &
echo $! > /Users/rosario/CODICE/omniwriter/client.pid

echo "Client restarted. Tailwind CSS should now be properly processed."
