// Test admin login and get stats
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
        console.log('✅ Login successful!');
        console.log('User Role:', response.user.role);
        console.log('Token:', response.token.substring(0, 30) + '...');

        // Now test the stats endpoint
        const statsOptions = {
          hostname: '127.0.0.1',
          port: 3001,
          path: '/api/admin/stats',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + response.token
          }
        };

        const statsReq = http.request(statsOptions, (statsRes) => {
          let statsData = '';
          statsRes.on('data', (chunk) => { statsData += chunk; });
          statsRes.on('end', () => {
            console.log('\n=== Admin Stats Response ===');
            console.log('Status:', statsRes.statusCode);
            console.log('Data:', statsData);
          });
        });

        statsReq.on('error', (e) => console.error('Stats request error:', e.message));
        statsReq.end();
      } else {
        console.log('❌ Login failed:', response);
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.write(loginData);
req.end();
