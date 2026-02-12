#!/usr/bin/env node
// Feature 3: Data Persists - Simple Direct API Test
const http = require('http');

const API_BASE = 'http://localhost:3001/api';

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        } catch {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err.message);
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTest() {
  console.log('Testing API connectivity...');

  try {
    // First check health
    console.log('1. Checking /api/health...');
    const health = await makeRequest('GET', '/health');
    console.log('   Status:', health.status);
    console.log('   Response:', JSON.stringify(health.body).substring(0, 100) + '...');

    if (health.status !== 200) {
      console.log('❌ Health check failed');
      return false;
    }
    console.log('✓ Health check passed\n');

    // Try to register a test user
    const timestamp = Date.now();
    const testUser = {
      email: `feature3_test_${timestamp}@test.com`,
      password: 'TestPass123!',
      name: 'Feature 3 Test'
    };

    console.log('2. Creating test user:', testUser.email);
    const register = await makeRequest('POST', '/auth/register', testUser);
    console.log('   Status:', register.status);
    console.log('   Response:', JSON.stringify(register.body));

    if (register.status === 201) {
      console.log('✓ User created successfully\n');
      console.log('✅ API is working correctly for persistence test');
      return true;
    } else {
      console.log('❌ Registration failed');
      return false;
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

runTest().then(success => {
  process.exit(success ? 0 : 1);
});
