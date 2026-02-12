#!/usr/bin/env node
// Feature 3: Data Persists Across Server Restart
const http = require('http');
const crypto = require('crypto');

const API_BASE = 'http://localhost:3001/api';

// Generate unique test user
const timestamp = Date.now();
const testUser = {
  email: `feature3_test_${timestamp}@example.com`,
  password: 'TestPassword123!',
  name: 'Feature 3 Test User'
};

console.log('=== Feature 3: Data Persistence Test ===');
console.log('Test user email:', testUser.email);

// Helper function for HTTP requests
function request(method, path, data, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testPersistence() {
  // Step 1: Create test user
  console.log('\n1. Creating test user...');
  const createResult = await request('POST', '/auth/register', testUser);
  console.log('   Status:', createResult.status);
  if (createResult.status !== 201) {
    console.log('   ❌ Failed to create user:', createResult.data);
    return false;
  }
  console.log('   ✓ User created successfully');

  // Step 2: Verify user appears via API
  console.log('\n2. Verifying user exists via login...');
  const loginBefore = await request('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  console.log('   Status:', loginBefore.status);
  if (loginBefore.status !== 200) {
    console.log('   ❌ Failed to login before restart');
    return false;
  }
  const tokenBefore = loginBefore.data.token;
  console.log('   ✓ Login successful, token received');

  // Step 3: Get user details
  console.log('\n3. Fetching user details...');
  const userBefore = await request('GET', '/users/me', null, tokenBefore);
  console.log('   Status:', userBefore.status);
  console.log('   User email:', userBefore.data.email);
  if (userBefore.status !== 200 || userBefore.data.email !== testUser.email) {
    console.log('   ❌ Failed to get user details');
    return false;
  }
  console.log('   ✓ User details verified before restart');

  // Step 4: Stop server
  console.log('\n4. Stopping server...');
  console.log('   ⚠️  Note: This test requires manual server restart');
  console.log('   Please: 1) Stop the server (Ctrl+C or kill process)');
  console.log('           2) Restart the server');
  console.log('           3) Press Enter to continue...');
  console.log('\n   For automated testing, run: ./init.sh to restart server');
  console.log('   Then run: node verify-feature-3-check.js with email:', testUser.email);

  return true;
}

testPersistence()
  .then(success => {
    if (success) {
      console.log('\n✅ Feature 3: Initial part passed');
      console.log('   Full restart verification requires server restart');
    } else {
      console.log('\n❌ Feature 3: FAILED');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
