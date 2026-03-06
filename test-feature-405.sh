#!/bin/bash

# Test Feature #405: Storage quota enforcement on upload

set -e

API_BASE="http://localhost:3001/api"

echo "========================================="
echo "Feature #405: Storage Quota Enforcement"
echo "========================================="
echo ""

# Create a unique test user
TIMESTAMP=$(date +%s)
EMAIL="test405_${TIMESTAMP}@example.com"

# Step 1: Register user
echo "Step 1: Creating test user..."
REGISTER=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"Test1234\", \"name\": \"Test User 405\"}")

echo "Register response: $REGISTER"

# Login
echo ""
echo "Logging in..."
LOGIN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"Test1234\"}")

TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$LOGIN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Token: ${TOKEN:0:20}..."
echo "User ID: $USER_ID"

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get token"
  exit 1
fi

# Step 2: Set storage to 95 MB using node
echo ""
echo "Step 2: Setting storage to 95 MB..."
node -e "
const db = require('./server/node_modules/better-sqlite3')('./server/data/omniwriter.db');
db.prepare('UPDATE users SET storage_used_bytes = ? WHERE id = ?').run(95 * 1024 * 1024, '$USER_ID');
console.log('Storage set to 95 MB');
"
echo "✅ Storage set to 95 MB"

# Step 3: Check storage
echo ""
echo "Step 3: Checking current storage..."
STORAGE=$(curl -s "$API_BASE/users/storage" \
  -H "Authorization: Bearer $TOKEN")

echo "Storage info: $STORAGE"

# Step 4: Try to upload 10 MB file (should fail with 413)
echo ""
echo "Step 4: Creating and uploading 10 MB test file (should be rejected)..."
dd if=/dev/zero of=/tmp/test-upload-10mb.bin bs=1M count=10 2>/dev/null

UPLOAD_10MB=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_BASE/sources/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-upload-10mb.bin")

HTTP_STATUS_10MB=$(echo "$UPLOAD_10MB" | grep "HTTP_STATUS:" | cut -d':' -f2)
RESPONSE_10MB=$(echo "$UPLOAD_10MB" | grep -v "HTTP_STATUS:")

echo "HTTP Status: $HTTP_STATUS_10MB"
echo "Response: $RESPONSE_10MB"

if [ "$HTTP_STATUS_10MB" = "413" ]; then
  echo "✅ CORRECT: Upload rejected with 413"

  if echo "$RESPONSE_10MB" | grep -q "STORAGE_QUOTA_EXCEEDED"; then
    echo "✅ CORRECT: Error code is STORAGE_QUOTA_EXCEEDED"
  else
    echo "❌ ERROR: Wrong error code"
  fi

  if echo "$RESPONSE_10MB" | grep -q '"used":' && echo "$RESPONSE_10MB" | grep -q '"limit":' && echo "$RESPONSE_10MB" | grep -q '"available":'; then
    echo "✅ CORRECT: Error includes storage details"
    USED=$(echo "$RESPONSE_10MB" | grep -o '"usedMB":[^,}]*' | cut -d':' -f2)
    LIMIT=$(echo "$RESPONSE_10MB" | grep -o '"limitMB":[^,}]*' | cut -d':' -f2)
    AVAILABLE=$(echo "$RESPONSE_10MB" | grep -o '"availableMB":[^,}]*' | cut -d':' -f2)
    REQUIRED=$(echo "$RESPONSE_10MB" | grep -o '"fileMB":[^,}]*' | cut -d':' -f2)
    echo "   Used: $USED MB"
    echo "   Limit: $LIMIT MB"
    echo "   Available: $AVAILABLE MB"
    echo "   Required: $REQUIRED MB"
  else
    echo "❌ ERROR: Missing storage details"
  fi
else
  echo "❌ ERROR: Expected 413, got $HTTP_STATUS_10MB"
fi

rm -f /tmp/test-upload-10mb.bin
echo ""

# Step 5: Upload 1 MB file (should succeed)
echo "Step 5: Uploading 1 MB test file (should succeed)..."
dd if=/dev/zero of=/tmp/test-upload-1mb.bin bs=1M count=1 2>/dev/null

UPLOAD_1MB=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_BASE/sources/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-upload-1mb.bin")

HTTP_STATUS_1MB=$(echo "$UPLOAD_1MB" | grep "HTTP_STATUS:" | cut -d':' -f2)
RESPONSE_1MB=$(echo "$UPLOAD_1MB" | grep -v "HTTP_STATUS:")

echo "HTTP Status: $HTTP_STATUS_1MB"

if [ "$HTTP_STATUS_1MB" = "201" ]; then
  echo "✅ CORRECT: Upload succeeded with 201"
  SOURCE_ID=$(echo "$RESPONSE_1MB" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "Source ID: $SOURCE_ID"
else
  echo "❌ ERROR: Expected 201, got $HTTP_STATUS_1MB"
  echo "Response: $RESPONSE_1MB"
  SOURCE_ID=""
fi

rm -f /tmp/test-upload-1mb.bin
echo ""

# Step 6: Verify storage increased
if [ -n "$SOURCE_ID" ]; then
  echo "Step 6: Verifying storage increased..."
  STORAGE_AFTER=$(curl -s "$API_BASE/users/storage" \
    -H "Authorization: Bearer $TOKEN")

  USED_AFTER=$(echo "$STORAGE_AFTER" | grep -o '"storage_used_bytes":[0-9]*' | cut -d':' -f2)
  USED_AFTER_MB=$((USED_AFTER / 1024 / 1024))

  echo "Storage after upload: $USED_AFTER_MB MB"

  if [ "$USED_AFTER_MB" -gt 95 ]; then
    echo "✅ CORRECT: Storage increased after upload"
  else
    echo "❌ ERROR: Storage did not increase"
  fi
  echo ""

  # Step 7: Delete the file
  echo "Step 7: Deleting uploaded file..."
  DELETE=$(curl -s -X DELETE "$API_BASE/sources/$SOURCE_ID" \
    -H "Authorization: Bearer $TOKEN")

  echo "Delete response: $DELETE"
  echo ""

  # Step 8: Verify storage decreased
  echo "Step 8: Verifying storage decreased..."
  STORAGE_FINAL=$(curl -s "$API_BASE/users/storage" \
    -H "Authorization: Bearer $TOKEN")

  USED_FINAL=$(echo "$STORAGE_FINAL" | grep -o '"storage_used_bytes":[0-9]*' | cut -d':' -f2)
  USED_FINAL_MB=$((USED_FINAL / 1024 / 1024))

  echo "Storage after delete: $USED_FINAL_MB MB"

  if [ "$USED_FINAL_MB" -lt "$USED_AFTER_MB" ]; then
    echo "✅ CORRECT: Storage decreased after deletion"
  else
    echo "❌ ERROR: Storage did not decrease"
  fi
fi

echo ""
echo "========================================="
echo "Feature #405 Test Complete"
echo "========================================="
