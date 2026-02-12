// Test data persistence AFTER server restart
const http = require('http');

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
  // Use the test email from before restart
  const testEmail = 'persistence_test_1770900610003@example.com';
  const testPassword = 'TestPassword123!';
  const originalUserId = '65b8053e-ec11-4e0c-81a2-0e66c1a2fa5a';

  console.log('=== TESTING PERSISTENCE AFTER SERVER RESTART ===\n');
  console.log(`Attempting to login with user created before restart...`);
  console.log(`Email: ${testEmail}\n`);

  const loginAfter = await postData('/api/auth/login', {
    email: testEmail,
    password: testPassword
  });

  console.log(`Login status after restart: ${loginAfter.status}`);
  console.log('Response data:', JSON.stringify(loginAfter.data, null, 2));

  if (loginAfter.status === 200 && loginAfter.data.user) {
    const userId = loginAfter.data.user.id;
    if (userId === originalUserId) {
      console.log('\n✓ PERSISTENCE VERIFIED!');
      console.log(`✓ User ID matches: ${userId}`);
      console.log('✓ Data survived server restart');
      console.log('✓ SQLite database persistence confirmed');
      return true;
    } else {
      console.log('\n✗ User ID mismatch!');
      console.log(`Original: ${originalUserId}`);
      console.log(`Current: ${userId}`);
      return false;
    }
  } else {
    console.log('\n✗ FAILED: Login failed after restart');
    console.log('This indicates IN-MEMBERY STORAGE (data lost)');
    return false;
  }
}

runTest().then(success => {
  if (success) {
    console.log('\n=== FEATURE 3: DATA PERSISTENCE - PASSED ===');
  } else {
    console.log('\n=== FEATURE 3: DATA PERSISTENCE - FAILED ===');
    process.exit(1);
  }
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
