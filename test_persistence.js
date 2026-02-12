const http = require('http');
const fs = require('fs');

const timestamp = Date.now();
const testEmail = `test-persistence-${timestamp}@example.com`;

// Store email for later verification
fs.writeFileSync('/Users/rosario/CODICE/omniwriter/test_user_email.txt', testEmail);

const postData = JSON.stringify({
  email: testEmail,
  password: 'TestPassword123!',
  name: 'Persistence Test User'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    console.log('Test email:', testEmail);

    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log('✅ User created successfully');
      process.exit(0);
    } else {
      console.log('❌ Failed to create user');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

req.write(postData);
req.end();
