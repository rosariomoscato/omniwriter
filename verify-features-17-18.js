#!/usr/bin/env node
/**
 * Verification script for Features #17 and #18
 *
 * Feature #17: Registration rejects invalid password format
 * Feature #18: Registration rejects duplicate email
 */

const http = require('http');

const API_BASE = 'http://localhost:8080/api';

// Helper to make HTTP requests
function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, ...response });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// Helper to clean test users from database
const sqlite3 = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';

function cleanTestUsers() {
  const db = new sqlite3(dbPath);
  db.prepare('DELETE FROM users WHERE email LIKE ?').run('test-17-18@%');
  db.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)').run('test-17-18@%');
  db.close();
  console.log('✓ Cleaned test users from database\n');
}

async function testFeature17() {
  console.log('='.repeat(60));
  console.log('FEATURE #17: Registration rejects invalid password format');
  console.log('='.repeat(60));

  const tests = [
    {
      name: 'Short password (7 chars)',
      email: 'test-17-short@example.com',
      password: 'Short1',
      expectedError: 'Password must be at least 8 characters'
    },
    {
      name: 'No uppercase letter',
      email: 'test-17-noupper@example.com',
      password: 'lowercase123',
      expectedError: 'Password must contain at least 1 uppercase letter'
    },
    {
      name: 'No lowercase letter',
      email: 'test-17-nolower@example.com',
      password: 'UPPERCASE123',
      expectedError: 'Password must contain at least 1 lowercase letter'
    },
    {
      name: 'No number',
      email: 'test-17-nonumber@example.com',
      password: 'NoNumbers',
      expectedError: 'Password must contain at least 1 number'
    },
    {
      name: 'Valid password',
      email: 'test-17-valid@example.com',
      password: 'Valid123',
      expectedError: null
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n[Test] ${test.name}`);
    console.log(`  Email: ${test.email}`);
    console.log(`  Password: ${test.password}`);

    try {
      const response = await makeRequest('POST', '/auth/register', {
        email: test.email,
        password: test.password,
        name: 'Test User'
      });

      if (test.expectedError === null) {
        // Should succeed
        if (response.status === 201 && response.user) {
          console.log(`  ✅ PASS - User registered successfully`);
          passed++;
        } else {
          console.log(`  ❌ FAIL - Expected success but got: ${JSON.stringify(response)}`);
          failed++;
        }
      } else {
        // Should fail with specific error
        if (response.status === 400 && response.message && response.message.includes('Password must')) {
          console.log(`  ✅ PASS - Rejected with: ${response.message}`);
          passed++;
        } else {
          console.log(`  ❌ FAIL - Expected error containing "${test.expectedError}"`);
          console.log(`     Got status ${response.status}: ${JSON.stringify(response)}`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`  ❌ FAIL - Request error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${'-'.repeat(60)}`);
  console.log(`Feature #17 Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60) + '\n');

  return { passed, failed };
}

async function testFeature18() {
  console.log('='.repeat(60));
  console.log('FEATURE #18: Registration rejects duplicate email');
  console.log('='.repeat(60));

  const email = 'test-18-duplicate@example.com';
  const password = 'Password123';

  // First registration attempt
  console.log(`\n[Test 1] First registration with ${email}`);
  try {
    const response1 = await makeRequest('POST', '/auth/register', {
      email: email,
      password: password,
      name: 'First User'
    });

    if (response1.status === 201 && response1.user) {
      console.log(`  ✅ PASS - First registration succeeded`);
      console.log(`  User ID: ${response1.user.id}`);
    } else {
      console.log(`  ❌ FAIL - First registration failed: ${JSON.stringify(response1)}`);
      return { passed: 0, failed: 2 };
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Request error: ${error.message}`);
    return { passed: 0, failed: 2 };
  }

  // Second registration attempt with same email
  console.log(`\n[Test 2] Second registration with same email ${email}`);
  try {
    const response2 = await makeRequest('POST', '/auth/register', {
      email: email,
      password: password,
      name: 'Second User'
    });

    if (response2.status === 409 && response2.message === 'User with this email already exists') {
      console.log(`  ✅ PASS - Duplicate email rejected with 409`);
      console.log(`  Message: ${response2.message}`);
    } else {
      console.log(`  ❌ FAIL - Expected 409 conflict error`);
      console.log(`     Got status ${response2.status}: ${JSON.stringify(response2)}`);
      return { passed: 1, failed: 1 };
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Request error: ${error.message}`);
    return { passed: 1, failed: 1 };
  }

  // Verify only one user exists
  console.log(`\n[Test 3] Verify only one user exists in database`);
  try {
    const db = new sqlite3.default(dbPath);
    const count = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get(email);
    db.close();

    if (count.count === 1) {
      console.log(`  ✅ PASS - Only one user exists with this email`);
      return { passed: 3, failed: 0 };
    } else {
      console.log(`  ❌ FAIL - Found ${count.count} users (expected 1)`);
      return { passed: 2, failed: 1 };
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Database error: ${error.message}`);
    return { passed: 2, failed: 1 };
  }
}

async function runTests() {
  console.log('\n🧪 Starting Verification for Features #17 and #18\n');

  // Clean up before tests
  cleanTestUsers();

  // Test Feature #17
  const result17 = await testFeature17();

  // Clean up between tests
  cleanTestUsers();

  // Test Feature #18
  const result18 = await testFeature18();

  // Final summary
  const totalPassed = result17.passed + result18.passed;
  const totalFailed = result17.failed + result18.failed;
  const totalTests = totalPassed + totalFailed;

  console.log('\n' + '='.repeat(60));
  console.log('FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`Feature #17 (Password Validation): ${result17.passed}/${result17.passed + result17.failed} passed`);
  console.log(`Feature #18 (Duplicate Email):    ${result18.passed}/${result18.passed + result18.failed} passed`);
  console.log(`\nTotal: ${totalPassed}/${totalTests} tests passed`);
  console.log('='.repeat(60));

  // Clean up after all tests
  cleanTestUsers();

  if (totalFailed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
