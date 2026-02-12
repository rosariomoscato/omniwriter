const http = require('http');

const data = JSON.stringify({
  email: 'feature179@test.com',
  password: 'Test123456!',
  name: 'Feature 179 User'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Register response:', body);
  });
});

req.on('error', (e) => {
  console.error('Register error:', e.message);
});

req.write(data);
req.end();
