/**
 * Debug test for user creation
 */

const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3001');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
          });
        } catch (e) {
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

async function test() {
  console.log('Testing registration...');

  const uniqueEmail = `test_${Date.now()}@example.com`;
  console.log('Email:', uniqueEmail);

  const res = await request('POST', '/api/auth/register', {
    email: uniqueEmail,
    password: 'Password123!',
    name: 'Test User'
  });

  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.data, null, 2));

  if (res.status === 201) {
    console.log('✅ Registration successful');
    console.log('User ID:', res.data.user.id);
    console.log('Role:', res.data.user.role);
  } else {
    console.log('❌ Registration failed');
  }
}

test().catch(console.error);
