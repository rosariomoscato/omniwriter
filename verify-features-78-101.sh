#!/bin/bash

# Verification Script for Features #78 and #101
# Feature #78: Feature gating for free users
# Feature #101: User data isolation between accounts

API_BASE="http://localhost:8080/api"

echo "========================================"
echo "FEATURE #78: Feature Gating for Free Users"
echo "========================================"
echo ""

# Generate unique IDs
ID_A="test_$(date +%s)_a@example.com"
ID_B="test_$(date +%s)_b@example.com"
PASS="Test123456"

# Step 1: Register free user
echo "Step 1: Register free user..."
RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ID_A\",\"password\":\"$PASS\",\"name\":\"Test User A\"}")

TOKEN_A=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
ROLE_A=$(echo $RESPONSE | grep -o '"role":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN_A" ]; then
  echo "❌ FAILED: Could not register user A"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ Registered free user: $ID_A (role: $ROLE_A)"

# Step 2: Try to access sagas (premium feature)
echo ""
echo "Step 2: Try to access sagas (premium feature)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/sagas" \
  -H "Authorization: Bearer $TOKEN_A")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if echo "$BODY" | grep -q "PREMIUM_REQUIRED"; then
  echo "✅ PASSED: Free user blocked from sagas"
  echo "   Error: $(echo $BODY | grep -o '"message":"[^"]*' | cut -d'"' -f4)"
else
  echo "❌ FAILED: Free user accessed sagas (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi

# Step 3: Try to create saga (premium feature)
echo ""
echo "Step 3: Try to create saga (premium feature)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/sagas" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Saga","description":"Test","area":"romanziere"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if echo "$BODY" | grep -q "PREMIUM_REQUIRED"; then
  echo "✅ PASSED: Free user blocked from creating sagas"
else
  echo "❌ FAILED: Free user created saga (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi

# Step 4: Create a project for export tests
echo ""
echo "Step 4: Create a test project..."
RESPONSE=$(curl -s -X POST "$API_BASE/projects" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"title":"Export Test Project","area":"romanziere"}')
PROJECT_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
  echo "❌ FAILED: Could not create project"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ Created project: $PROJECT_ID"

# Step 5: Try to export to EPUB (premium)
echo ""
echo "Step 5: Try to export to EPUB (premium)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/projects/$PROJECT_ID/export" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"format":"epub"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if echo "$BODY" | grep -q "PREMIUM_REQUIRED"; then
  echo "✅ PASSED: Free user blocked from EPUB export"
  echo "   Error: $(echo $BODY | grep -o '"message":"[^"]*' | cut -d'"' -f4)"
elif [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASSED: Free user blocked from EPUB export (HTTP 403)"
else
  echo "❌ FAILED: Free user exported to EPUB (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi

# Step 6: Try to export to PDF (premium)
echo ""
echo "Step 6: Try to export to PDF (premium)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/projects/$PROJECT_ID/export" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"format":"pdf"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if echo "$BODY" | grep -q "PREMIUM_REQUIRED"; then
  echo "✅ PASSED: Free user blocked from PDF export"
  echo "   Error: $(echo $BODY | grep -o '"message":"[^"]*' | cut -d'"' -f4)"
elif [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASSED: Free user blocked from PDF export (HTTP 403)"
else
  echo "❌ FAILED: Free user exported to PDF (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
fi

# Step 7: Verify TXT export still works (free feature)
echo ""
echo "Step 7: Verify TXT export still works (free feature)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/projects/$PROJECT_ID/export" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"format":"txt"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASSED: Free user can export to TXT"
else
  echo "❌ FAILED: TXT export failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "========================================"
echo "FEATURE #101: User Data Isolation"
echo "========================================"
echo ""

# Register user B
echo "Step 1: Register User B..."
RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ID_B\",\"password\":\"$PASS\",\"name\":\"Test User B\"}")

TOKEN_B=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_B_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN_B" ]; then
  echo "❌ FAILED: Could not register user B"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ Registered User B: $ID_B (ID: $USER_B_ID)"

# Step 2: User B lists projects (should not see User A's project)
echo ""
echo "Step 2: User B lists projects..."
RESPONSE=$(curl -s -X GET "$API_BASE/projects" \
  -H "Authorization: Bearer $TOKEN_B")

if echo "$RESPONSE" | grep -q "$PROJECT_ID"; then
  echo "❌ FAILED: User B can see User A's project!"
  echo "Response: $RESPONSE"
else
  PROJECT_COUNT=$(echo $RESPONSE | grep -o '"count":[0-9]*' | cut -d':' -f2)
  echo "✅ PASSED: User B sees only their projects (count: $PROJECT_COUNT)"
fi

# Step 3: User B tries to access User A's project directly
echo ""
echo "Step 3: User B tries to access User A's project directly..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN_B")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASSED: User B blocked from accessing User A's project (HTTP $HTTP_CODE)"
else
  echo "❌ FAILED: User B accessed User A's project (HTTP $HTTP_CODE)"
fi

# Step 4: User B tries to update User A's project
echo ""
echo "Step 4: User B tries to update User A's project..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Project"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASSED: User B blocked from updating User A's project (HTTP $HTTP_CODE)"
else
  echo "❌ FAILED: User B updated User A's project (HTTP $HTTP_CODE)"
fi

# Step 5: User B tries to delete User A's project
echo ""
echo "Step 5: User B tries to delete User A's project..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN_B")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "403" ]; then
  echo "✅ PASSED: User B blocked from deleting User A's project (HTTP $HTTP_CODE)"
else
  echo "❌ FAILED: User B deleted User A's project (HTTP $HTTP_CODE)"
fi

# Step 6: User A creates a chapter
echo ""
echo "Step 6: User A creates a chapter..."
RESPONSE=$(curl -s -X POST "$API_BASE/projects/$PROJECT_ID/chapters" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"title":"Chapter 1"}')
CHAPTER_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CHAPTER_ID" ]; then
  echo "❌ FAILED: Could not create chapter"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "✅ User A created chapter: $CHAPTER_ID"

# Step 7: User B tries to access User A's chapter
echo ""
echo "Step 7: User B tries to access User A's chapter..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/chapters/$CHAPTER_ID" \
  -H "Authorization: Bearer $TOKEN_B")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "404" ]; then
  echo "✅ PASSED: User B blocked from accessing User A's chapter (HTTP 404)"
else
  echo "❌ FAILED: User B accessed User A's chapter (HTTP $HTTP_CODE)"
fi

# Step 8: User A verifies their project still exists
echo ""
echo "Step 8: User A verifies their project still exists..."
RESPONSE=$(curl -s -X GET "$API_BASE/projects" \
  -H "Authorization: Bearer $TOKEN_A")

if echo "$RESPONSE" | grep -q "$PROJECT_ID"; then
  echo "✅ PASSED: User A's project still intact"
else
  echo "❌ FAILED: User A's project disappeared!"
fi

echo ""
echo "========================================="
echo "Verification Complete"
echo "========================================="
