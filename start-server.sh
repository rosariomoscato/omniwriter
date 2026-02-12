#!/bin/bash
cd server && npm run dev > ../server.log 2>&1 &
echo $! > ../server.pid
echo "Server starting with PID: $(cat ../server.pid)"
