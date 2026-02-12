const http = require('http');

const data = JSON.stringify({
  email: 'onboardtest191@example.com',
  password: 'Test1234',
  name: 'Onboarding Test'
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
  res.on('end', () => { console.log(body); });
});

req.on('error', (e) => { console.error(e.message); });
req.write(data);
req.end();
