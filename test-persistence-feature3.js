// Test data persistence for Feature 3
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
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getData(path, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };
    if (token) {
      options.headers = { 'Authorization': `Bearer ${token}` };
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
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
  const registerData = JSON.parse(registerResult.body);
  console.log('Register response:', registerData);

  if (registerResult.status !== 201 && registerResult.status !== 200) {
    console.error('FAILED: Could not create user');
    return false;
  }

  console.log('\nStep 2: Verifying user exists before restart...');
  const loginBefore = await postData('/api/auth/login', {
    email: testEmail,
    password: testPassword
  });
  console.log(`Login before restart status: ${loginBefore.status}`);
  const loginBeforeData = JSON.parse(loginBefore.body);
  console.log('Login before restart:', loginBeforeData.success ? 'SUCCESS' : 'FAILED');

  if (!loginBeforeData.success) {
    console.error('FAILED: Could not login before restart');
    return false;
  }

  console.log('\n✓ Data created successfully and verified BEFORE restart');
  console.log('✓ User ID:', loginBeforeData.user?.id || 'N/A');
  console.log('✓ User email:', testEmail);

  return true;
}

runTest().then(success => {
  if (success) {
    console.log('\n=== PERSISTENCE TEST PRE-RESTART: PASSED ===');
    console.log('Ready for server restart test...');
  } else {
    console.log('\n=== PERSISTENCE TEST PRE-RESTART: FAILED ===');
    process.exit(1);
  }
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
