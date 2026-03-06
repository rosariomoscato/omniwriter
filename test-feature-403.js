/**
 * Test Feature #403: Admin Middleware Update
 *
 * This test verifies that:
 * 1. The requireAdmin middleware checks for role === 'admin'
 * 2. All /admin/* routes are protected
 * 3. Regular users cannot access admin routes
 * 4. Admin users can access both user and admin features
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let regularUserToken = null;
let adminUserToken = null;
let regularUserId = null;
let adminUserId = null;

// Helper function to make HTTP requests
function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n=== Feature #403: Admin Middleware Update Tests ===\n');

  let passed = 0;
  let total = 0;

  // Test 1: Verify requireAdmin middleware exists and checks role === 'admin'
  total++;
  const test1 = await test('1. requireAdmin middleware checks role === "admin"', async () => {
    const fs = require('fs');
    const rolesContent = fs.readFileSync('./server/src/middleware/roles.ts', 'utf8');

    // Check that requireAdmin function exists
    if (!rolesContent.includes('function requireAdmin')) {
      throw new Error('requireAdmin function not found');
    }

    // Check that it verifies role === 'admin'
    // The code uses "userRole === 'admin'" where userRole = req.user?.role
    if (!rolesContent.includes("=== 'admin'") && !rolesContent.includes('=== "admin"')) {
      throw new Error('requireAdmin does not check for admin role');
    }

    // Check that it returns 403 for non-admin
    if (!rolesContent.includes('ADMIN_REQUIRED')) {
      throw new Error('requireAdmin does not return ADMIN_REQUIRED error');
    }
  });
  if (test1) passed++;

  // Test 2: Verify all admin routes use requireAdmin middleware
  total++;
  const test2 = await test('2. All /admin/* routes use requireAdmin middleware', async () => {
    const fs = require('fs');
    const adminContent = fs.readFileSync('./server/src/routes/admin.ts', 'utf8');

    // List of admin routes that should be protected
    const adminRoutes = [
      'get(/users',
      "patch('/users/:id/role'",
      "put('/users/:id/role'",
      "patch('/users/:id/suspend'",
      "put('/users/:id/suspend'",
      'delete(/users/:id',
      'get(/stats',
      'get(/health',
      'post(/reset-rate-limit',
      'get(/rate-limit-status',
      'get(/stats/projects',
      'get(/stats/usage',
      'get(/stats/activity',
      'get(/stats/registrations',
      'get(/logs',
      'get(/activity',
    ];

    // Check that requireAdmin is imported and used
    if (!adminContent.includes("requireAdmin")) {
      throw new Error('requireAdmin middleware not imported in admin.ts');
    }

    // Verify each route definition includes requireAdmin
    for (const route of adminRoutes) {
      // Find the route definition
      const routeIndex = adminContent.indexOf(route);
      if (routeIndex === -1) continue; // Route might not exist

      // Get the next 500 characters after the route definition
      const routeContext = adminContent.substring(routeIndex, routeIndex + 500);

      // Check that requireAdmin is present in the route definition
      if (!routeContext.includes('requireAdmin')) {
        throw new Error(`Route ${route} does not use requireAdmin middleware`);
      }
    }
  });
  if (test2) passed++;

  // Test 3: Create or get regular user
  total++;
  const test3 = await test('3. Create/get regular user account', async () => {
    try {
      // Try to login with existing test user
      const loginRes = await request('POST', '/api/auth/login', {
        email: 'testuser@example.com',
        password: 'password123'
      });

      if (loginRes.status === 200) {
        regularUserToken = loginRes.data.token;
        regularUserId = loginRes.data.user.id;
        console.log('   Using existing regular user');
      } else {
        // Create new user
        const registerRes = await request('POST', '/api/auth/register', {
          email: `testuser_${Date.now()}@example.com`,
          password: 'Password123!',
          name: 'Test User'
        });

        if (registerRes.status !== 201) {
          throw new Error(`Failed to create user: ${JSON.stringify(registerRes.data)}`);
        }

        regularUserToken = registerRes.data.token;
        regularUserId = registerRes.data.user.id;
        console.log('   Created new regular user');
      }
    } catch (error) {
      throw new Error(`Failed to setup regular user: ${error.message}`);
    }
  });
  if (test3) passed++;

  // Test 4: Create or get admin user
  total++;
  const test4 = await test('4. Create/get admin user account', async () => {
    try {
      // Try to login with existing admin
      const loginRes = await request('POST', '/api/auth/login', {
        email: 'admin@example.com',
        password: 'Admin123!'
      });

      if (loginRes.status === 200 && loginRes.data.user.role === 'admin') {
        adminUserToken = loginRes.data.token;
        adminUserId = loginRes.data.user.id;
        console.log('   Using existing admin user');
      } else {
        // Create new user and make them admin
        const registerRes = await request('POST', '/api/auth/register', {
          email: `admin_${Date.now()}@example.com`,
          password: 'Password123!',
          name: 'Admin User'
        });

        if (registerRes.status !== 201) {
          throw new Error(`Failed to create admin user: ${JSON.stringify(registerRes.data)}`);
        }

        const newUserId = registerRes.data.user.id;
        const newToken = registerRes.data.token;

        // We need to manually update this user to admin in the database
        // since we can't do it through the API without being admin already
        const Database = require('better-sqlite3');
        const db = new Database('./data/omniwriter.db');
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', newUserId);
        db.close();

        // Login again to get the admin role in the token
        const loginRes = await request('POST', '/api/auth/login', {
          email: registerRes.data.user.email,
          password: 'Password123!'
        });

        if (loginRes.status !== 200 || loginRes.data.user.role !== 'admin') {
          throw new Error('Failed to set user as admin');
        }

        adminUserToken = loginRes.data.token;
        adminUserId = loginRes.data.user.id;
        console.log('   Created new admin user');
      }
    } catch (error) {
      throw new Error(`Failed to setup admin user: ${error.message}`);
    }
  });
  if (test4) passed++;

  // Test 5: Regular user cannot access admin routes
  total++;
  const test5 = await test('5. Regular user cannot access /admin/users', async () => {
    const res = await request('GET', '/api/admin/users', null, regularUserToken);
    if (res.status !== 403) {
      throw new Error(`Expected 403, got ${res.status}. Response: ${JSON.stringify(res.data)}`);
    }
    if (res.data?.code !== 'ADMIN_REQUIRED') {
      throw new Error(`Expected ADMIN_REQUIRED error code, got: ${JSON.stringify(res.data)}`);
    }
  });
  if (test5) passed++;

  // Test 6: Regular user cannot access admin stats
  total++;
  const test6 = await test('6. Regular user cannot access /admin/stats', async () => {
    const res = await request('GET', '/api/admin/stats', null, regularUserToken);
    if (res.status !== 403) {
      throw new Error(`Expected 403, got ${res.status}`);
    }
  });
  if (test6) passed++;

  // Test 7: Regular user cannot access admin health
  total++;
  const test7 = await test('7. Regular user cannot access /admin/health', async () => {
    const res = await request('GET', '/api/admin/health', null, regularUserToken);
    if (res.status !== 403) {
      throw new Error(`Expected 403, got ${res.status}`);
    }
  });
  if (test7) passed++;

  // Test 8: Admin user CAN access admin routes
  total++;
  const test8 = await test('8. Admin user CAN access /admin/users', async () => {
    const res = await request('GET', '/api/admin/users', null, adminUserToken);
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}. Response: ${JSON.stringify(res.data)}`);
    }
    if (!res.data.users || !Array.isArray(res.data.users)) {
      throw new Error('Response does not contain users array');
    }
  });
  if (test8) passed++;

  // Test 9: Admin user CAN access admin stats
  total++;
  const test9 = await test('9. Admin user CAN access /admin/stats', async () => {
    const res = await request('GET', '/api/admin/stats', null, adminUserToken);
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    if (res.data.totalUsers === undefined) {
      throw new Error('Response does not contain expected stats');
    }
  });
  if (test9) passed++;

  // Test 10: Admin user CAN access admin health
  total++;
  const test10 = await test('10. Admin user CAN access /admin/health', async () => {
    const res = await request('GET', '/api/admin/health', null, adminUserToken);
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    if (!res.data.status) {
      throw new Error('Response does not contain health status');
    }
  });
  if (test10) passed++;

  // Test 11: Admin can access regular user features
  total++;
  const test11 = await test('11. Admin user CAN access regular user routes', async () => {
    const res = await request('GET', '/api/projects', null, adminUserToken);
    if (res.status !== 200) {
      throw new Error(`Admin cannot access regular user routes. Expected 200, got ${res.status}`);
    }
  });
  if (test11) passed++;

  // Test 12: Unauthenticated user cannot access admin routes
  total++;
  const test12 = await test('12. Unauthenticated user cannot access /admin/users', async () => {
    const res = await request('GET', '/api/admin/users');
    if (res.status !== 401) {
      throw new Error(`Expected 401, got ${res.status}`);
    }
  });
  if (test12) passed++;

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${total - passed}/${total}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (passed === total) {
    console.log('\n✅ All tests passed! Feature #403 is complete.\n');
    return 0;
  } else {
    console.log('\n❌ Some tests failed. Please review the failures above.\n');
    return 1;
  }
}

// Run the tests
runTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
