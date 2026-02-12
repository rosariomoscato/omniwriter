#!/bin/bash
# Login as test user and get token
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-17-valid@example.com","password":"password123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4
