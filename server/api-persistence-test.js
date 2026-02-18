const http = require('http');

// Helper function to make HTTP requests
function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
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

// Generate unique test email
const testEmail = `persistence_test_${Date.now()}@example.com`;
const testPassword = 'TestPass123!';
const testName = 'Persistence Test User';

console.log('=== Feature 3: Data Persistence Test ===\n');
console.log(`Test email: ${testEmail}\n`);

async function runTest() {
  try {
    // Step 1: Create test user
    console.log('Step 1: Creating test user via API...');
    const registerResult = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: testEmail,
      password: testPassword,
      name: testName
    });

    if (registerResult.status !== 201 && registerResult.status !== 200) {
      console.error('❌ Registration failed:', registerResult.data);
      return false;
    }
    console.log('✅ User created via API:', registerResult.data.email || registerResult.data.user?.email);
    const userId = registerResult.data.id || registerResult.data.user?.id;

    // Step 2: Verify user exists via login BEFORE restart
    console.log('\nStep 2: Verifying user can login (before restart)...');
    const loginBefore = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: testEmail,
      password: testPassword
    });

    if (loginBefore.status !== 200) {
      console.error('❌ Login before restart failed:', loginBefore.data);
      return false;
    }
    console.log('✅ Login successful before restart');
    const token = loginBefore.data.token || loginBefore.data.accessToken;

    // Step 3: Verify user via API
    console.log('\nStep 3: Verifying user profile via API...');
    const profileResult = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    if (profileResult.status !== 200) {
      console.error('❌ Profile fetch failed:', profileResult.data);
      return false;
    }
    console.log('✅ User profile retrieved:', profileResult.data.email || profileResult.data.user?.email);

    console.log('\n✅ PART 1 COMPLETE: User created and verified via API');
    console.log('\n=== SERVER RESTART REQUIRED ===');
    console.log('The server will now be restarted to verify persistence...');

    // Save credentials for after restart
    const fs = require('fs');
    fs.writeFileSync(
      '/Users/rosario/CODICE/omniwriter/server/.persistence-test-credentials.json',
      JSON.stringify({ testEmail, testPassword, userId })
    );
    console.log('\nCredentials saved. After restart, run verify-persistence-after-restart.js');

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

runTest().then(success => {
  process.exit(success ? 0 : 1);
});
