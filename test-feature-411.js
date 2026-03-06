const http = require('http');

const postData = (data, path, method = 'POST', token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
};

const getData = (path, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.end();
  });
};

async function testFeature411() {
  console.log('=== Feature #411 Test: Admin Role Management ===\n');

  // 1. Login as admin
  console.log('1. Logging in as admin...');
  const loginRes = await postData({
    email: 'admin@test.com',
    password: 'Admin123!'
  }, '/api/auth/login');

  const loginData = JSON.parse(loginRes.body);
  const adminToken = loginData.token;

  if (!adminToken) {
    console.log('❌ Failed to get admin token');
    console.log('Response:', loginData);
    return;
  }
  console.log('✅ Admin login successful\n');

  // 2. Get all users
  console.log('2. Fetching all users...');
  const usersRes = await getData('/api/admin/users?page=1&limit=10', adminToken);
  const usersData = JSON.parse(usersRes.body);

  console.log('Users:');
  usersData.users.forEach(u => {
    console.log(`  - ${u.email} (${u.role})`);
  });
  console.log('');

  // 3. Find or create a test user
  let testUserId = usersData.users.find(u => u.role === 'user')?.id;

  if (!testUserId) {
    console.log('⚠️  No non-admin users found, creating test user...');
    try {
      const createRes = await postData({
        email: `test-role-411-${Date.now()}@example.com`,
        password: 'Test1234!',
        name: 'Test Role 411'
      }, '/api/auth/register');

      const createData = JSON.parse(createRes.body);
      testUserId = createData.user?.id;

      if (!testUserId) {
        console.log('❌ Failed to create test user');
        return;
      }
      console.log('✅ Test user created:', testUserId);
    } catch (e) {
      console.log('❌ Error creating test user:', e.message);
      return;
    }
  } else {
    console.log('✅ Found test user:', testUserId);
  }
  console.log('');

  // 4. Test role change: user -> admin
  console.log('3. Testing role change (user -> admin)...');
  const roleRes1 = await postData({ role: 'admin' }, `/api/admin/users/${testUserId}/role`, 'PUT', adminToken);
  const roleData1 = JSON.parse(roleRes1.body);

  console.log('Response:', roleData1);

  if (roleData1.message && roleData1.message.includes('successfully')) {
    console.log('✅ Role change to admin successful');
  } else {
    console.log('❌ Role change to admin failed');
  }
  console.log('');

  // 5. Verify the change
  console.log('4. Verifying role change...');
  const verifyRes = await getData('/api/admin/users?page=1&limit=10', adminToken);
  const verifyData = JSON.parse(verifyRes.body);

  const updatedUser = verifyData.users.find(u => u.id === testUserId);
  if (updatedUser && updatedUser.role === 'admin') {
    console.log('✅ Role verification passed: user is now admin');
  } else {
    console.log('❌ Role verification failed');
    console.log('Expected role: admin, Got:', updatedUser?.role);
  }
  console.log('');

  // 6. Test role change: admin -> user
  console.log('5. Testing role change (admin -> user)...');
  const roleRes2 = await postData({ role: 'user' }, `/api/admin/users/${testUserId}/role`, 'PUT', adminToken);
  const roleData2 = JSON.parse(roleRes2.body);

  console.log('Response:', roleData2);

  if (roleData2.message && roleData2.message.includes('successfully')) {
    console.log('✅ Role change to user successful');
  } else {
    console.log('❌ Role change to user failed');
  }
  console.log('');

  // 7. Test invalid role (should fail)
  console.log('6. Testing invalid role (should fail)...');
  const invalidRes = await postData({ role: 'premium' }, `/api/admin/users/${testUserId}/role`, 'PUT', adminToken);
  const invalidData = JSON.parse(invalidRes.body);

  console.log('Response:', invalidData);

  if (invalidData.message && invalidData.message.includes('Invalid role')) {
    console.log('✅ Invalid role correctly rejected');
  } else {
    console.log('⚠️  Invalid role may not have been rejected properly');
  }
  console.log('');

  console.log('=== Feature #411 Test Complete ===');
}

testFeature411().catch(console.error);
