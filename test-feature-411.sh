#!/bin/bash

echo "=== Feature #411 Test: Admin Role Management ==="
echo ""

# Get admin token
echo "1. Logging in as admin..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123!"}')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to get admin token"
  echo "Response: $ADMIN_RESPONSE"
  exit 1
fi

echo "✅ Admin login successful"
echo ""

# Get all users
echo "2. Fetching all users..."
USERS_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Users response:"
echo $USERS_RESPONSE | jq '.users[] | {id, email, role}' 2>/dev/null || echo "Failed to parse JSON"
echo ""

# Test 1: Change role from user to admin
echo "3. Testing role change (user -> admin)..."
# Find a non-admin user first
USER_ID=$(echo $USERS_RESPONSE | jq -r '.users[] | select(.role == "user") | .id' | head -1)

if [ -z "$USER_ID" ]; then
  echo "⚠️  No non-admin users found, creating test user..."
  # Create a test user
  TEST_USER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test-role-411@example.com","password":"Test1234!","name":"Test Role 411"}')

  echo "Test user creation response: $TEST_USER_RESPONSE"
  USER_ID=$(echo $TEST_USER_RESPONSE | jq -r '.user.id // empty')

  if [ -z "$USER_ID" ]; then
    echo "❌ Failed to create test user"
    exit 1
  fi
fi

echo "Selected user ID: $USER_ID"

# Change role to admin
echo "Changing role to admin..."
ROLE_RESPONSE=$(curl -s -X PUT "http://localhost:3001/api/admin/users/$USER_ID/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}')

echo "Role change response: $ROLE_RESPONSE"

if echo "$ROLE_RESPONSE" | grep -q "successfully"; then
  echo "✅ Role change to admin successful"
else
  echo "❌ Role change to admin failed"
  echo "Response: $ROLE_RESPONSE"
fi
echo ""

# Verify the change
echo "4. Verifying role change..."
VERIFY_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

UPDATED_ROLE=$(echo $VERIFY_RESPONSE | jq -r ".users[] | select(.id == \"$USER_ID\") | .role")

if [ "$UPDATED_ROLE" = "admin" ]; then
  echo "✅ Role verification passed: user is now admin"
else
  echo "❌ Role verification failed: expected 'admin', got '$UPDATED_ROLE'"
fi
echo ""

# Test 2: Change role back to user
echo "5. Testing role change (admin -> user)..."
ROLE_BACK_RESPONSE=$(curl -s -X PUT "http://localhost:3001/api/admin/users/$USER_ID/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"user"}')

echo "Role change response: $ROLE_BACK_RESPONSE"

if echo "$ROLE_BACK_RESPONSE" | grep -q "successfully"; then
  echo "✅ Role change to user successful"
else
  echo "❌ Role change to user failed"
  echo "Response: $ROLE_BACK_RESPONSE"
fi
echo ""

# Test 3: Try invalid role (should fail)
echo "6. Testing invalid role (should fail)..."
INVALID_ROLE_RESPONSE=$(curl -s -X PUT "http://localhost:3001/api/admin/users/$USER_ID/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"premium"}')

echo "Invalid role response: $INVALID_ROLE_RESPONSE"

if echo "$INVALID_ROLE_RESPONSE" | grep -q "Invalid role"; then
  echo "✅ Invalid role correctly rejected"
else
  echo "⚠️  Invalid role may not have been rejected properly"
  echo "Response: $INVALID_ROLE_RESPONSE"
fi
echo ""

echo "=== Feature #411 Test Complete ==="
