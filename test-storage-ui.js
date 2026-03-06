/**
 * Browser automation test for Features #404 and #406
 * Tests the storage API endpoint through the application
 */

const http = require('http');

// Helper to make HTTP requests
function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          });
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

async function testStorageEndpoint() {
  console.log('=== Testing Storage API Endpoint (Feature #406) ===\n');

  let passCount = 0;
  let failCount = 0;

  function test(name, condition, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      if (details) console.log(`   ${details}`);
      passCount++;
    } else {
      console.log(`❌ FAIL: ${name}`);
      if (details) console.log(`   ${details}`);
      failCount++;
    }
  }

  try {
    // First, login as admin to get a token
    console.log('--- Step 1: Login as admin ---');

    const loginResponse = await httpRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@omniwriter.com',
      password: 'Admin2026!'
    });

    test(
      'Login successful',
      loginResponse.statusCode === 200,
      `Status: ${loginResponse.statusCode}`
    );

    if (!loginResponse.body || !loginResponse.body.token) {
      console.log('❌ Cannot proceed without authentication token');
      console.log('Response:', loginResponse.body);
      return;
    }

    const token = loginResponse.body.token;
    console.log(`   Got token: ${token.substring(0, 20)}...`);

    // Test the storage endpoint
    console.log('\n--- Step 2: GET /api/users/storage ---');

    const storageResponse = await httpRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users/storage',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    test(
      'Storage endpoint returns 200',
      storageResponse.statusCode === 200,
      `Status: ${storageResponse.statusCode}`
    );

    if (storageResponse.statusCode === 200 && storageResponse.body) {
      console.log('\nResponse body:');
      console.log(JSON.stringify(storageResponse.body, null, 2));

      const storage = storageResponse.body.storage;

      test(
        'Response has storage object',
        storage && typeof storage === 'object'
      );

      test(
        'storage.used_bytes exists and is number',
        storage && typeof storage.used_bytes === 'number',
        `Value: ${storage?.used_bytes}`
      );

      test(
        'storage.limit_bytes exists and is number',
        storage && typeof storage.limit_bytes === 'number',
        `Value: ${storage?.limit_bytes}`
      );

      test(
        'storage.limit_bytes equals 100MB',
        storage && storage.limit_bytes === 104857600,
        `Expected: 104857600, Got: ${storage?.limit_bytes}`
      );

      test(
        'storage.used_mb exists and is number',
        storage && typeof storage.used_mb === 'number'
      );

      test(
        'storage.limit_mb exists and equals 100',
        storage && storage.limit_mb === 100,
        `Expected: 100, Got: ${storage?.limit_mb}`
      );

      test(
        'storage.percent_used exists and is number',
        storage && typeof storage.percent_used === 'number'
      );

      test(
        'storage.available_bytes exists',
        storage && typeof storage.available_bytes === 'number',
        `Value: ${storage?.available_bytes}`
      );

      // Verify the calculation is correct
      if (storage) {
        const expectedPercent = storage.limit_bytes > 0
          ? Math.round((storage.used_bytes / storage.limit_bytes) * 10000) / 100
          : 0;

        test(
          'percent_used is calculated correctly',
          Math.abs(storage.percent_used - expectedPercent) < 0.01,
          `Expected: ${expectedPercent}, Got: ${storage.percent_used}`
        );

        const expectedAvailable = Math.max(0, storage.limit_bytes - storage.used_bytes);

        test(
          'available_bytes is calculated correctly',
          storage.available_bytes === expectedAvailable,
          `Expected: ${expectedAvailable}, Got: ${storage.available_bytes}`
        );
      }
    }

    // Test without authentication (should fail)
    console.log('\n--- Step 3: Test without authentication (should fail) ---');

    const unauthResponse = await httpRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users/storage',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    test(
      'Unauthorized request returns 401',
      unauthResponse.statusCode === 401,
      `Status: ${unauthResponse.statusCode}`
    );

    // Test with invalid token (should fail)
    console.log('\n--- Step 4: Test with invalid token (should fail) ---');

    const invalidTokenResponse = await httpRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/users/storage',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
        'Content-Type': 'application/json'
      }
    });

    test(
      'Invalid token request returns 401 or 403',
      invalidTokenResponse.statusCode === 401 || invalidTokenResponse.statusCode === 403,
      `Status: ${invalidTokenResponse.statusCode}`
    );

    console.log('\n=== Test Results ===');
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`Total: ${passCount + failCount}`);

    if (failCount === 0) {
      console.log('\n🎉 All API tests passed!');
    } else {
      console.log(`\n⚠️  ${failCount} test(s) failed.`);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Server is not running on port 3001');
      console.error('Please start the server with: npm run dev --prefix server');
    }

    process.exit(1);
  }
}

testStorageEndpoint();
