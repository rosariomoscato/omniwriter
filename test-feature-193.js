#!/usr/bin/env node

/**
 * Test script for Feature #193 - Rate Limiting Fixes
 *
 * This script tests:
 * 1. Successful logins don't increment the rate limit counter
 * 2. Failed logins DO increment the counter
 * 3. Error message shows correct wait time
 * 4. Admin can reset rate limits
 */

const http = require('http');

const API_URL = 'http://localhost:5000';
let adminToken = null;
let testUserId = null;

// Helper function to make HTTP requests
function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body)
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test 1: Login as admin
async function testAdminLogin() {
  console.log('\n=== Test 1: Admin Login ===');
  const response = await request('POST', '/api/auth/login', {
    email: 'admin@omniwriter.ai',
    password: 'Admin123!'
  });

  if (response.statusCode === 200) {
    adminToken = response.body.token;
    console.log('✅ Admin login successful');
    console.log('Token:', adminToken.substring(0, 20) + '...');
  } else {
    console.log('❌ Admin login failed:', response.body);
  }
}

// Test 2: Create test user
async function testCreateUser() {
  console.log('\n=== Test 2: Create Test User ===');
  const email = `ratelimit-test-${Date.now()}@test.com`;

  const response = await request('POST', '/api/auth/register', {
    email,
    password: 'Test123!',
    name: 'Rate Limit Test'
  });

  if (response.statusCode === 201 || response.statusCode === 409) {
    testUserId = response.body.user?.id;
    console.log('✅ Test user ready:', email);
    return email;
  } else {
    console.log('❌ User creation failed:', response.body);
    return null;
  }
}

// Test 3: Successful login should NOT increment counter
async function testSuccessfulLoginNoIncrement(email) {
  console.log('\n=== Test 3: Successful Login Should NOT Increment Counter ===');

  // Make 5 successful logins
  for (let i = 1; i <= 5; i++) {
    const response = await request('POST', '/api/auth/login', {
      email,
      password: 'Test123!'
    });

    if (response.statusCode === 200) {
      console.log(`✅ Login ${i} successful (should NOT count toward rate limit)`);
    } else {
      console.log(`❌ Login ${i} failed:`, response.body);
    }
  }

  // Now try a failed login - should be first count
  console.log('\n--- Testing first FAILED login ---');
  const failResponse = await request('POST', '/api/auth/login', {
    email,
    password: 'WrongPassword123!'
  });

  if (failResponse.statusCode === 401) {
    console.log('✅ Failed login correctly returned 401');
    console.log('Rate limit headers:', {
      limit: failResponse.headers['x-ratelimit-limit'],
      remaining: failResponse.headers['x-ratelimit-remaining'],
      reset: failResponse.headers['x-ratelimit-reset']
    });
  } else {
    console.log('❌ Unexpected response:', failResponse.statusCode, failResponse.body);
  }
}

// Test 4: Failed logins increment counter
async function testFailedLoginsIncrement(email) {
  console.log('\n=== Test 4: Failed Logins SHOULD Increment Counter ===');

  let failCount = 0;
  for (let i = 1; i <= 11; i++) {
    const response = await request('POST', '/api/auth/login', {
      email,
      password: `WrongPassword${i}!`
    });

    if (response.statusCode === 401) {
      failCount++;
      const remaining = response.headers['x-ratelimit-remaining'];
      console.log(`Failed login ${i}: remaining = ${remaining}`);
    } else if (response.statusCode === 429) {
      console.log(`\n✅ Rate limited after ${failCount} failed attempts`);
      console.log('Rate limit response:', {
        message: response.body.message,
        retryAfter: response.body.retryAfter,
        resetTime: response.body.resetTime
      });

      // Check if wait time is shown correctly
      const waitMinutes = Math.ceil(response.body.retryAfter / 60);
      console.log(`\n⏱️  Wait time: ~${waitMinutes} minutes`);
      return true;
    }
  }

  console.log('⚠️  Did not hit rate limit after 11 failed attempts');
  return false;
}

// Test 5: Admin can reset rate limit
async function testAdminResetRateLimit() {
  console.log('\n=== Test 5: Admin Can Reset Rate Limit ===');

  if (!adminToken) {
    console.log('⚠️  No admin token, skipping this test');
    return false;
  }

  // Try to reset for localhost (IPv4)
  const response = await request(
    'POST',
    '/api/admin/reset-rate-limit/127.0.0.1',
    { path: '/api/auth/login' },
    { Authorization: `Bearer ${adminToken}` }
  );

  if (response.statusCode === 200) {
    console.log('✅ Admin reset successful:', response.body);
    return true;
  } else {
    console.log('❌ Admin reset failed:', response.body);
    return false;
  }
}

// Test 6: After reset, can try logging in again
async function testLoginAfterReset(email) {
  console.log('\n=== Test 6: Can Login After Reset ===');

  // This should still fail (wrong password) but not be rate limited
  const response = await request('POST', '/api/auth/login', {
    email,
    password: 'WrongPasswordAgain!'
  });

  if (response.statusCode === 401) {
    console.log('✅ Request accepted (401 invalid credentials, not 429 rate limit)');
    console.log('Rate limit headers:', {
      limit: response.headers['x-ratelimit-limit'],
      remaining: response.headers['x-ratelimit-remaining']
    });
  } else if (response.statusCode === 429) {
    console.log('❌ Still rate limited, reset may not have worked');
  } else {
    console.log('❌ Unexpected response:', response.statusCode, response.body);
  }
}

// Test 7: Check rate limit status endpoint
async function testRateLimitStatusEndpoint() {
  console.log('\n=== Test 7: Admin Can Check Rate Limit Status ===');

  if (!adminToken) {
    console.log('⚠️  No admin token, skipping this test');
    return;
  }

  const response = await request(
    'GET',
    '/api/admin/rate-limit-status/127.0.0.1',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );

  if (response.statusCode === 200) {
    console.log('✅ Rate limit status retrieved:');
    console.log(JSON.stringify(response.body, null, 2));
  } else {
    console.log('❌ Failed to get status:', response.body);
  }
}

// Main test runner
async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   Feature #193 - Rate Limiting Fixes Test Suite          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    await testAdminLogin();
    const email = await testCreateUser();

    if (email) {
      await testSuccessfulLoginNoIncrement(email);
      const wasLimited = await testFailedLoginsIncrement(email);

      if (wasLimited) {
        await testAdminResetRateLimit();
        await testLoginAfterReset(email);
      }

      await testRateLimitStatusEndpoint();
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   Test Suite Complete                                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
}

// Run tests
runTests();
