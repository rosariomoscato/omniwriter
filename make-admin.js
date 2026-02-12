#!/usr/bin/env node

/**
 * Make test user an admin via API
 */

const http = require('http');

const testData = {
  email: 'test@example.com',
  password: 'Test123!'
};

// First, let's try to login with the test user
const loginData = JSON.stringify(testData);

const loginOptions = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

const req = http.request(loginOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.token) {
        console.log('✅ Login successful!');
        console.log('Token:', response.token.substring(0, 20) + '...');

        // Now update user to admin
        const updateOptions = {
          hostname: '127.0.0.1',
          port: 3001,
          path: '/api/users/' + response.user.id + '/role',
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + response.token
          }
        };

        // But first, we need to add the update user endpoint...
        console.log('\n❌ The endpoint to update user role does not exist yet.');
        console.log('Will need to use database directly or add the endpoint.');
      } else {
        console.log('❌ Login failed:', response);
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(loginData);
req.end();
