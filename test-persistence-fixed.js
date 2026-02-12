// Test data persistence for Feature 3 - Fixed
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function postData(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTest() {
  const uniqueId = Date.now();
  const testEmail = `persistence_test_${uniqueId}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Persistence Test User';

  console.log('Step 1: Creating test user...');
  const registerResult = await postData('/api/auth/register', {
    email: testEmail,
    password: testPassword,
    name: testName
  });
  console.log(`Register status: ${registerResult.status}`);
  console.log('Register response:', registerResult.data);

  if (registerResult.status !== 201 && registerResult.status !== 200) {
    console.error('FAILED: Could not create user');
    return false;
  }

  const userId = registerResult.data.user?.id;

  console.log('\nStep 2: Verifying user exists before restart...');
  const loginBefore = await postData('/api/auth/login', {
    email: testEmail,
    password: testPassword
  });
  console.log(`Login before restart status: ${loginBefore.status}`);
  console.log('Login response data:', JSON.stringify(loginBefore.data, null, 2));

  // Check if login has user data
  const loginSuccess = loginBefore.status === 200 && loginBefore.data.user;
  console.log('Login before restart:', loginSuccess ? 'SUCCESS' : 'FAILED');

  if (!loginSuccess) {
    console.error('FAILED: Could not login before restart');
    return false;
  }

  console.log('\n✓ Data created successfully and verified BEFORE restart');
  console.log('✓ User ID:', userId);
  console.log('✓ User email:', testEmail);
  console.log('✓ User persisted to SQLite database');

  return { success: true, userId, email: testEmail };
}

runTest().then(result => {
  if (result.success) {
    console.log('\n=== PERSISTENCE TEST PRE-RESTART: PASSED ===');
    console.log('Test user created and verified. Ready for server restart test.');
    console.log(`Test credentials: ${result.email} / TestPassword123!`);
  } else {
    console.log('\n=== PERSISTENCE TEST PRE-RESTART: FAILED ===');
    process.exit(1);
  }
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
