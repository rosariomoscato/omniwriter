// Test script for admin endpoints (Feature #351 and #352)
// Usage: node test-admin-endpoints.js

const API_BASE = 'http://localhost:8081/api';

async function testAdminEndpoints() {
  console.log('=== Testing Admin Endpoints ===\n');

  // Step 1: Login as admin
  console.log('1. Logging in as admin...');
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin-test-351@example.com',
      password: 'Admin123!'
    })
  });

  if (!loginResponse.ok) {
    console.error('Login failed:', await loginResponse.text());
    return;
  }

  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log('✓ Login successful, token:', token.substring(0, 20) + '...\n');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Feature #351 Tests
  console.log('=== Feature #351: User Management Endpoints ===\n');

  // Test GET /api/admin/users
  console.log('2. Testing GET /api/admin/users...');
  const usersResponse = await fetch(`${API_BASE}/admin/users`, { headers });
  const usersData = await usersResponse.json();
  console.log('✓ Users endpoint works');
  console.log('  - Total users:', usersData.pagination?.total || 'N/A');
  console.log('  - Users on page 1:', usersData.users?.length || 'N/A');

  // Test GET /api/admin/users with filters
  console.log('\n3. Testing GET /api/admin/users?role=free...');
  const freeUsersResponse = await fetch(`${API_BASE}/admin/users?role=free`, { headers });
  const freeUsersData = await freeUsersResponse.json();
  console.log('✓ Role filter works');
  console.log('  - Free users:', freeUsersData.pagination?.total || 'N/A');

  // Test GET /api/admin/stats (existing endpoint)
  console.log('\n4. Testing GET /api/admin/stats...');
  const statsResponse = await fetch(`${API_BASE}/admin/stats`, { headers });
  const statsData = await statsResponse.json();
  console.log('✓ Stats endpoint works');
  console.log('  - Total users:', statsData.totalUsers);
  console.log('  - Total projects:', statsData.totalProjects);
  console.log('  - Users by role:', JSON.stringify(statsData.usersByRole));

  // Test PATCH /api/admin/users/:id/role (Feature #351)
  console.log('\n5. Testing PATCH /api/admin/users/:id/role...');
  if (usersData.users && usersData.users.length > 1) {
    const targetUser = usersData.users.find(u => u.role !== 'admin');
    if (targetUser) {
      const oldRole = targetUser.role;
      const newRole = oldRole === 'free' ? 'premium' : 'free';

      const roleResponse = await fetch(`${API_BASE}/admin/users/${targetUser.id}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: newRole })
      });
      const roleData = await roleResponse.json();
      console.log('✓ Role update works');
      console.log('  - Changed from', roleData.oldRole, 'to', roleData.newRole);

      // Revert the change
      await fetch(`${API_BASE}/admin/users/${targetUser.id}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: oldRole })
      });
      console.log('  - Role reverted to', oldRole);
    }
  }

  // Test PATCH /api/admin/users/:id/suspend (Feature #351)
  console.log('\n6. Testing PATCH /api/admin/users/:id/suspend...');
  if (usersData.users && usersData.users.length > 1) {
    const targetUser = usersData.users.find(u => u.role !== 'admin' && !u.is_suspended);
    if (targetUser) {
      const suspendResponse = await fetch(`${API_BASE}/admin/users/${targetUser.id}/suspend`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ suspended: true })
      });
      const suspendData = await suspendResponse.json();
      console.log('✓ Suspend works');
      console.log('  - User suspended:', suspendData.is_suspended);

      // Reactivate the user
      await fetch(`${API_BASE}/admin/users/${targetUser.id}/suspend`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ suspended: false })
      });
      console.log('  - User reactivated');
    }
  }

  // Feature #352 Tests
  console.log('\n=== Feature #352: Statistics Endpoints ===\n');

  // Test GET /api/admin/stats/projects
  console.log('7. Testing GET /api/admin/stats/projects...');
  try {
    const projectStatsResponse = await fetch(`${API_BASE}/admin/stats/projects`, { headers });
    if (projectStatsResponse.ok) {
      const projectStatsData = await projectStatsResponse.json();
      console.log('✓ Project stats endpoint works');
      console.log('  - Projects by area:', JSON.stringify(projectStatsData.projectsByArea));
      console.log('  - Avg chapters per project:', projectStatsData.avgChaptersPerProject);
      console.log('  - Top 10 longest projects:', projectStatsData.top10LongestProjects?.length || 0);
    } else {
      console.log('✗ Project stats endpoint returned:', projectStatsResponse.status);
    }
  } catch (e) {
    console.log('✗ Project stats endpoint error:', e.message);
  }

  // Test GET /api/admin/stats/usage
  console.log('\n8. Testing GET /api/admin/stats/usage...');
  try {
    const usageStatsResponse = await fetch(`${API_BASE}/admin/stats/usage`, { headers });
    if (usageStatsResponse.ok) {
      const usageStatsData = await usageStatsResponse.json();
      console.log('✓ Usage stats endpoint works');
      console.log('  - Total AI generations:', usageStatsData.totalAiGenerations);
      console.log('  - Total sources:', usageStatsData.totalSourcesUploaded);
      console.log('  - Total human models:', usageStatsData.totalHumanModelsCreated);
      console.log('  - Exports by format:', JSON.stringify(usageStatsData.exportsByFormat));
    } else {
      console.log('✗ Usage stats endpoint returned:', usageStatsResponse.status);
    }
  } catch (e) {
    console.log('✗ Usage stats endpoint error:', e.message);
  }

  // Test GET /api/admin/stats/activity
  console.log('\n9. Testing GET /api/admin/stats/activity...');
  try {
    const activityStatsResponse = await fetch(`${API_BASE}/admin/stats/activity`, { headers });
    if (activityStatsResponse.ok) {
      const activityStatsData = await activityStatsResponse.json();
      console.log('✓ Activity stats endpoint works');
      console.log('  - Activity entries:', activityStatsData.activityLast7Days?.length || 0);
      console.log('  - Peak hours:', activityStatsData.peakUsageHours?.length || 0);
    } else {
      console.log('✗ Activity stats endpoint returned:', activityStatsResponse.status);
    }
  } catch (e) {
    console.log('✗ Activity stats endpoint error:', e.message);
  }

  // Test GET /api/admin/health
  console.log('\n10. Testing GET /api/admin/health...');
  try {
    const healthResponse = await fetch(`${API_BASE}/admin/health`, { headers });
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✓ Health endpoint works');
      console.log('  - Status:', healthData.status);
      console.log('  - DB connected:', healthData.database?.connected);
      console.log('  - DB size:', healthData.database?.size);
    } else {
      console.log('✗ Health endpoint returned:', healthResponse.status);
    }
  } catch (e) {
    console.log('✗ Health endpoint error:', e.message);
  }

  console.log('\n=== All Tests Complete ===');
}

testAdminEndpoints().catch(console.error);
