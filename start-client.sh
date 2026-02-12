#!/bin/bash
rm -rf /Users/rosario/CODICE/omniwriter/client/node_modules/.vite
cd /Users/rosario/CODICE/omniwriter/client && PORT=3000 npm run dev > /Users/rosario/CODICE/omniwriter/client.log 2>&1 &
echo $! > /Users/rosario/CODICE/omniwriter/client.pid
echo "Client started"
