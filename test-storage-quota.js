/**
 * Test Feature #405: Storage quota enforcement on upload
 *
 * This script tests that:
 * 1. Uploads are blocked when quota would be exceeded
 * 2. Error messages include storage details (used, limit, available)
 * 3. Uploads succeed when there is space
 * 4. Storage tracking updates after upload
 * 5. Storage decreases after file deletion
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const API_BASE = 'http://localhost:3001/api';

// Helper function to make HTTP requests
async function request(method, endpoint, token, body = null, isFile = false) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(!isFile && { 'Content-Type': 'application/json' })
    }
  };

  if (body && !isFile) {
    options.body = JSON.stringify(body);
  }

  // For file uploads, we need to use FormData
  if (isFile && body) {
    const FormData = require('form-data');
    const form = new FormData();
    for (const [key, value] of Object.entries(body)) {
      form.append(key, value);
    }
    options.body = form;
    delete options.headers['Content-Type'];
  }

  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

// Helper to create test file
function createTestFile(sizeMB) {
  const buffer = Buffer.alloc(sizeMB * 1024 * 1024, 'a');
  const filePath = `/tmp/test-upload-${sizeMB}mb.bin`;
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function main() {
  console.log('=========================================');
  console.log('Feature #405: Storage Quota Enforcement');
  console.log('=========================================\n');

  // Step 1: Register and login test user
  console.log('Step 1: Creating test user...');
  let result = await request('POST', '/auth/register', null, {
    email: 'test405_' + Date.now() + '@example.com',
    password: 'Test1234',
    name: 'Test User 405'
  });
  console.log('Register:', result.status, result.data);

  const email = result.data.email || result.data.user?.email;
  console.log('Login in with email:', email);

  result = await request('POST', '/auth/login', null, {
    email: email,
    password: 'Test1234'
  });

  if (result.status !== 200) {
    console.error('❌ Login failed:', result.data);
    process.exit(1);
  }

  const token = result.data.token;
  const userId = result.data.user.id;
  console.log('✅ Logged in, user ID:', userId, '\n');

  // Step 2: Set storage to 95 MB (near 100 MB limit)
  console.log('Step 2: Setting storage to 95 MB used...');
  const db = new Database(path.join(__dirname, 'server/data/omniwriter.db'));
  const updateStmt = db.prepare('UPDATE users SET storage_used_bytes = ? WHERE id = ?');
  updateStmt.run(95 * 1024 * 1024, userId);
  db.close();
  console.log('✅ Storage set to 95 MB\n');

  // Step 3: Check current storage
  console.log('Step 3: Checking current storage...');
  result = await request('GET', '/users/storage', token);
  console.log('Storage info:', result.data);
  console.log('');

  // Step 4: Try to upload 10 MB file (should fail with 413)
  console.log('Step 4: Attempting to upload 10 MB file (should be rejected)...');
  const testFile10MB = createTestFile(10);
  const form10MB = new (require('form-data'))();
  form10MB.append('file', fs.createReadStream(testFile10MB));

  const response10MB = await fetch(`${API_BASE}/sources/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form10MB
  });

  const status10MB = response10MB.status;
  const data10MB = await response10MB.json();

  console.log('HTTP Status:', status10MB);
  console.log('Response:', JSON.stringify(data10MB, null, 2));

  if (status10MB === 413) {
    console.log('✅ CORRECT: Upload rejected with 413');
    if (data10MB.code === 'STORAGE_QUOTA_EXCEEDED') {
      console.log('✅ CORRECT: Error code is STORAGE_QUOTA_EXCEEDED');
      if (data10MB.used !== undefined && data10MB.limit !== undefined && data10MB.available !== undefined) {
        console.log('✅ CORRECT: Error includes storage details (used, limit, available)');
      } else {
        console.log('❌ ERROR: Missing storage details in error response');
      }
    } else {
      console.log('❌ ERROR: Wrong error code, expected STORAGE_QUOTA_EXCEEDED');
    }
  } else {
    console.log(`❌ ERROR: Expected 413, got ${status10MB}`);
  }
  fs.unlinkSync(testFile10MB);
  console.log('');

  // Step 5: Upload 1 MB file (should succeed)
  console.log('Step 5: Uploading 1 MB file (should succeed)...');
  const testFile1MB = createTestFile(1);
  const form1MB = new (require('form-data'))();
  form1MB.append('file', fs.createReadStream(testFile1MB));

  const response1MB = await fetch(`${API_BASE}/sources/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form1MB
  });

  const status1MB = response1MB.status;
  const data1MB = await response1MB.json();

  console.log('HTTP Status:', status1MB);

  if (status1MB === 201) {
    console.log('✅ CORRECT: Upload succeeded with 201');
    const sourceId = data1MB.source?.id;
    console.log('Source ID:', sourceId);
    console.log('');

    // Step 6: Verify storage increased
    console.log('Step 6: Verifying storage increased...');
    result = await request('GET', '/users/storage', token);
    const storageUsed = result.data.storage_used_bytes;
    const storageUsedMB = Math.round(storageUsed / (1024 * 1024) * 100) / 100;
    console.log('Storage after upload:', storageUsedMB, 'MB');

    if (storageUsed > 95 * 1024 * 1024) {
      console.log('✅ CORRECT: Storage increased after upload');
    } else {
      console.log('❌ ERROR: Storage did not increase');
    }
    console.log('');

    // Step 7: Delete the uploaded file
    console.log('Step 7: Deleting uploaded file...');
    result = await request('DELETE', `/sources/${sourceId}`, token);
    console.log('Delete response:', result.data);

    if (result.status === 200) {
      console.log('✅ File deleted successfully');
    } else {
      console.log('❌ Delete failed');
    }
    console.log('');

    // Step 8: Verify storage decreased
    console.log('Step 8: Verifying storage decreased...');
    result = await request('GET', '/users/storage', token);
    const storageAfterDelete = result.data.storage_used_bytes;
    const storageAfterDeleteMB = Math.round(storageAfterDelete / (1024 * 1024) * 100) / 100;
    console.log('Storage after delete:', storageAfterDeleteMB, 'MB');

    if (storageAfterDelete < storageUsed) {
      console.log('✅ CORRECT: Storage decreased after deletion');
    } else {
      console.log('❌ ERROR: Storage did not decrease');
    }
  } else {
    console.log(`❌ ERROR: Expected 201, got ${status1MB}`);
    console.log('Response:', data1MB);
  }

  fs.unlinkSync(testFile1MB);

  console.log('\n=========================================');
  console.log('Feature #405 Test Complete');
  console.log('=========================================');
}

main().catch(console.error);
