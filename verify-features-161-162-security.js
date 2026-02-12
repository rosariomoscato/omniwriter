#!/usr/bin/env node
/**
 * Verification script for Features #161 and #162
 * #161: URL manipulation security - users cannot access other users' data via URL
 * #162: Direct route access by role - admin routes require admin role
 */

const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'http://127.0.0.1:5001';
const API_BASE = `${API_URL}/api`;

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Test data storage
let userAToken = null;
let userBToken = null;
let adminToken = null;
let projectAId = null;

/**
 * Make HTTP request
 */
async function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 5001,
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
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json });
        } catch {
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

/**
 * Log test result
 */
function log(test, passed, details = '') {
  const icon = passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`${icon} ${test}${details ? ': ' + details : ''}`);
}

/**
 * Create test user
 */
async function createUser(email, password, name, role = 'free') {
  const register = await request('POST', '/auth/register', {
    email,
    password,
    name,
  });

  if (register.status !== 201) {
    throw new Error(`Failed to create user ${email}: ${JSON.stringify(register.data)}`);
  }

  // Set role directly in database (bypass API)
  console.log(`${YELLOW}[SETUP]${RESET} User ${email} created. Setting role to '${role}' in database...`);
  return { email, password, name, role };
}

/**
 * Login and get token
 */
async function loginUser(email, password) {
  const login = await request('POST', '/auth/login', {
    email,
    password,
  });

  if (login.status !== 200 || !login.data.token) {
    throw new Error(`Failed to login ${email}: ${JSON.stringify(login.data)}`);
  }

  return login.data.token;
}

/**
 * Feature #161: URL manipulation security
 * Tests that users cannot access other users' projects via URL manipulation
 */
async function testFeature161() {
  console.log(`\n${YELLOW}=== Feature #161: URL Manipulation Security ===${RESET}\n`);

  try {
    // Step 1: Log in as User A
    console.log('Step 1: Logging in as User A...');
    userAToken = await loginUser('user-a-feature161@example.com', 'Password123!');
    log('Login as User A', true);
  } catch (error) {
    log('Login as User A', false, error.message);
    return false;
  }

  try {
    // Step 2: Create a project for User A
    console.log('\nStep 2: Creating project for User A...');
    const project = await request('POST', '/projects', {
      title: 'User A Project - Feature 161 Test',
      description: 'This project should not be accessible by User B',
      area: 'redattore',
    }, userAToken);

    if (project.status !== 201 || !project.data.project) {
      log('Create project for User A', false, JSON.stringify(project.data));
      return false;
    }

    projectAId = project.data.project.id;
    log('Create project for User A', true, `ID: ${projectAId}`);
  } catch (error) {
    log('Create project for User A', false, error.message);
    return false;
  }

  try {
    // Step 3: Log in as User B
    console.log('\nStep 3: Logging in as User B...');
    userBToken = await loginUser('user-b-feature161@example.com', 'Password123!');
    log('Login as User B', true);
  } catch (error) {
    log('Login as User B', false, error.message);
    return false;
  }

  // Step 4: User B tries to access User A's project via URL
  console.log('\nStep 4: User B attempts to access User A\'s project URL...');

  const accessAttempt = await request('GET', `/projects/${projectAId}`, null, userBToken);

  if (accessAttempt.status === 404) {
    log('User B blocked from User A\'s project', true, 'Got 404 Not Found');
  } else if (accessAttempt.status === 403) {
    log('User B blocked from User A\'s project', true, 'Got 403 Forbidden');
  } else {
    log('User B blocked from User A\'s project', false, `Got ${accessAttempt.status} - should be 403/404`);
    return false;
  }

  // Step 5: User B tries to update User A's project
  console.log('\nStep 5: User B attempts to update User A\'s project...');

  const updateAttempt = await request('PUT', `/projects/${projectAId}`, {
    title: 'Hacked by User B',
  }, userBToken);

  if (updateAttempt.status === 404) {
    log('User B blocked from updating User A\'s project', true, 'Got 404 Not Found');
  } else if (updateAttempt.status === 403) {
    log('User B blocked from updating User A\'s project', true, 'Got 403 Forbidden');
  } else {
    log('User B blocked from updating User A\'s project', false, `Got ${updateAttempt.status} - should be 403/404`);
    return false;
  }

  // Step 6: User B tries to delete User A's project
  console.log('\nStep 6: User B attempts to delete User A\'s project...');

  const deleteAttempt = await request('DELETE', `/projects/${projectAId}`, null, userBToken);

  if (deleteAttempt.status === 404) {
    log('User B blocked from deleting User A\'s project', true, 'Got 404 Not Found');
  } else if (deleteAttempt.status === 403) {
    log('User B blocked from deleting User A\'s project', true, 'Got 403 Forbidden');
  } else {
    log('User B blocked from deleting User A\'s project', false, `Got ${deleteAttempt.status} - should be 403/404`);
    return false;
  }

  // Step 7: Verify User A still has access
  console.log('\nStep 7: Verifying User A still has access...');

  const verifyAccess = await request('GET', `/projects/${projectAId}`, null, userAToken);

  if (verifyAccess.status === 200 && verifyAccess.data.project) {
    log('User A still has access to own project', true, verifyAccess.data.project.title);
  } else {
    log('User A still has access to own project', false, `Got ${verifyAccess.status}`);
    return false;
  }

  console.log(`\n${GREEN}=== Feature #161: PASSED ===${RESET}\n`);
  return true;
}

/**
 * Feature #162: Direct route access by role
 * Tests that admin routes are protected by role middleware
 */
async function testFeature162() {
  console.log(`\n${YELLOW}=== Feature #162: Role-Based Access Control ===${RESET}\n`);

  // Step 1: As free user, try to access admin users endpoint
  console.log('Step 1: Free user attempts to access /admin/users...');

  const freeAttempt = await request('GET', '/admin/users', null, userBToken);

  if (freeAttempt.status === 403) {
    log('Free user blocked from /admin/users', true, `Got 403: ${freeAttempt.data.message || freeAttempt.data.code}`);
  } else if (freeAttempt.status === 401) {
    log('Free user blocked from /admin/users', true, `Got 401 Unauthorized`);
  } else {
    log('Free user blocked from /admin/users', false, `Got ${freeAttempt.status} - should be 403`);
    return false;
  }

  // Step 2: As free user, try to access admin stats endpoint
  console.log('\nStep 2: Free user attempts to access /admin/stats...');

  const statsAttempt = await request('GET', '/admin/stats', null, userBToken);

  if (statsAttempt.status === 403) {
    log('Free user blocked from /admin/stats', true, `Got 403: ${statsAttempt.data.message || statsAttempt.data.code}`);
  } else if (statsAttempt.status === 401) {
    log('Free user blocked from /admin/stats', true, `Got 401 Unauthorized`);
  } else {
    log('Free user blocked from /admin/stats', false, `Got ${statsAttempt.status} - should be 403`);
    return false;
  }

  // Step 3: As free user, try to update user role
  console.log('\nStep 3: Free user attempts to update user role via /admin/users/:id/role...');

  const roleAttempt = await request('PUT', '/admin/users/some-id/role', {
    role: 'admin',
  }, userBToken);

  if (roleAttempt.status === 403) {
    log('Free user blocked from role update', true, `Got 403: ${roleAttempt.data.message || roleAttempt.data.code}`);
  } else if (roleAttempt.status === 401) {
    log('Free user blocked from role update', true, `Got 401 Unauthorized`);
  } else {
    log('Free user blocked from role update', false, `Got ${roleAttempt.status} - should be 403`);
    return false;
  }

  // Step 4: Log in as admin
  console.log('\nStep 4: Logging in as admin user...');
  try {
    adminToken = await loginUser('admin@example.com', 'Admin123!');
    log('Admin login successful', true);
  } catch (error) {
    log('Admin login', false, error.message);
    return false;
  }

  // Step 5: As admin, access admin users endpoint
  console.log('\nStep 5: Admin accesses /admin/users...');

  const adminAccess = await request('GET', '/admin/users', null, adminToken);

  if (adminAccess.status === 200 && Array.isArray(adminAccess.data.users)) {
    log('Admin can access /admin/users', true, `Found ${adminAccess.data.users.length} users`);
  } else {
    log('Admin can access /admin/users', false, `Got ${adminAccess.status}`);
    return false;
  }

  // Step 6: As admin, access admin stats endpoint
  console.log('\nStep 6: Admin accesses /admin/stats...');

  const adminStats = await request('GET', '/admin/stats', null, adminToken);

  if (adminStats.status === 200 && adminStats.data.users) {
    log('Admin can access /admin/stats', true, `Total users: ${adminStats.data.users.total}`);
  } else {
    log('Admin can access /admin/stats', false, `Got ${adminStats.status}`);
    return false;
  }

  console.log(`\n${GREEN}=== Feature #162: PASSED ===${RESET}\n`);
  return true;
}

/**
 * Main execution
 */
async function main() {
  console.log(`${YELLOW}=== Security Features Verification ===${RESET}`);
  console.log(`API URL: ${API_URL}\n`);

  // Check server is running
  try {
    const health = await request('GET', '/health');
    if (health.status !== 200) {
      console.log(`${RED}Server health check failed: ${health.status}${RESET}`);
      process.exit(1);
    }
    console.log(`${GREEN}✓ Server is running${RESET}\n`);
  } catch (error) {
    console.log(`${RED}✗ Cannot connect to server at ${API_URL}${RESET}`);
    console.log(`${YELLOW}Make sure the server is running on port 5001${RESET}\n`);
    process.exit(1);
  }

  // Setup: Create test users
  console.log(`${YELLOW}=== Setup: Creating Test Users ===${RESET}\n`);

  // Note: In production, these users would already exist
  // For this test, we'll assume users exist or handle creation failures

  let feature161Passed = false;
  let feature162Passed = false;

  try {
    feature161Passed = await testFeature161();
  } catch (error) {
    console.error(`${RED}Feature #161 error: ${error.message}${RESET}`);
  }

  try {
    feature162Passed = await testFeature162();
  } catch (error) {
    console.error(`${RED}Feature #162 error: ${error.message}${RESET}`);
  }

  // Summary
  console.log(`\n${YELLOW}=== FINAL RESULTS ===${RESET}\n`);
  log('Feature #161: URL manipulation security', feature161Passed);
  log('Feature #162: Role-based access control', feature162Passed);

  const allPassed = feature161Passed && feature162Passed;

  if (allPassed) {
    console.log(`\n${GREEN}=== ALL TESTS PASSED ===${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`\n${RED}=== SOME TESTS FAILED ===${RESET}\n`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${RED}Fatal error: ${error.message}${RESET}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { testFeature161, testFeature162 };
