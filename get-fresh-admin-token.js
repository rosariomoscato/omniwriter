// Get a fresh admin token
const http = require('http');

const testData = {
  email: 'admin77@example.com',
  password: 'Admin77!'
};

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
        console.log('FRESH ADMIN TOKEN:');
        console.log(response.token);
        console.log('\nCopy this token and paste in browser console:');
        console.log('localStorage.setItem("token", "' + response.token + '");');
        console.log('location.reload();');
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.write(loginData);
req.end();
