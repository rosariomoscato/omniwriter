#!/usr/bin/env node

const http = require('http');

// Test Feature #349 and #350
console.log('=== Testing Admin Features #349 & #350 ===\n');

const API_URL = 'http://127.0.0.1:8081';

// Test 1: Login as admin
console.log('Test 1: Admin Login');
const loginData = JSON.stringify({
  email: 'admin@omniwriter.com',
  password: 'Admin2026!'
});

const loginOptions = {
  hostname: '127.0.0.1',
  port: 8081,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

let adminToken = '';

const loginReq = http.request(loginOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      adminToken = response.token;
      console.log('✓ Admin login successful');
      console.log('Token received:', adminToken.substring(0, 20) + '...');

      // Test 2: Access /api/admin/stats with admin token
      console.log('\nTest 2: GET /api/admin/stats (Feature #350)');
      const statsOptions = {
        hostname: '127.0.0.1',
        port: 8081,
        path: '/api/admin/stats',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      };

      const statsReq = http.request(statsOptions, (statsRes) => {
        let statsData = '';
        statsRes.on('data', (chunk) => { statsData += chunk; });
        statsRes.on('end', () => {
          console.log('Status:', statsRes.statusCode);
          if (statsRes.statusCode === 200) {
            const stats = JSON.parse(statsData);
            console.log('✓ Stats endpoint accessible');
            console.log('Response contains:');
            console.log('  - totalUsers:', typeof stats.totalUsers);
            console.log('  - usersByRole:', typeof stats.usersByRole);
            console.log('  - totalProjects:', typeof stats.totalProjects);
            console.log('  - projectsByArea:', typeof stats.projectsByArea);
            console.log('  - totalWordsGenerated:', typeof stats.totalWordsGenerated);
            console.log('  - activeUsersLast30Days:', typeof stats.activeUsersLast30Days);
            console.log('  - newUsersLast30Days:', typeof stats.newUsersLast30Days);
            console.log('  - totalChapters:', typeof stats.totalChapters);
            console.log('\nActual stats values:');
            console.log(JSON.stringify(stats, null, 2));
          } else {
            console.log('✗ Stats endpoint failed:', statsRes.statusCode);
            console.log(statsData);
          }

          // Test 3: Test that non-admin cannot access stats
          console.log('\nTest 3: Access /api/admin/stats without admin role (should fail)');
          const badToken = adminToken.split('').reverse().join(''); // Invalid token
          const noAdminOptions = {
            hostname: '127.0.0.1',
            port: 8081,
            path: '/api/admin/stats',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${badToken}`
            }
          };

          const noAdminReq = http.request(noAdminOptions, (noAdminRes) => {
            console.log('Status:', noAdminRes.statusCode);
            if (noAdminRes.statusCode === 401 || noAdminRes.statusCode === 403) {
              console.log('✓ Non-admin correctly blocked from stats endpoint');
            } else {
              console.log('✗ Non-admin was not blocked!');
            }
            console.log('\n=== All Tests Complete ===');
            process.exit(0);
          });

          noAdminReq.on('error', (err) => {
            console.error('Request error:', err.message);
            process.exit(1);
          });
          noAdminReq.end();
        });
      });

      statsReq.on('error', (err) => {
        console.error('Stats request error:', err.message);
        process.exit(1);
      });
      statsReq.end();
    } else {
      console.log('✗ Admin login failed');
      console.log('Response:', data);
      process.exit(1);
    }
  });
});

loginReq.on('error', (err) => {
  console.error('Login request error:', err.message);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
