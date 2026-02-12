#!/usr/bin/env node

/**
 * Feature #3: Data persists across server restart
 *
 * This test verifies that:
 * 1. Data created via API is stored in the SQLite database
 * 2. Data survives a complete server stop and restart
 * 3. No in-memory storage patterns are being used
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_BASE = 'http://localhost:3000/api';
let testUserId = null;
let testUserEmail = null;
let testUserToken = null;
let testUserName = 'PERSIST_TEST_' + Date.now();
let testProjectId = null;

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60) + '\n');
}

function makeRequest(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
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
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
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

async function checkServerHealth() {
  log('→ Checking server health...', 'blue');
  try {
    const result = await makeRequest('GET', '/health');
    if (result.status === 200 && result.data.status === 'ok') {
      log('✓ Server is healthy', 'green');
      log(`  Database: ${result.data.database}`, 'green');
      log(`  Uptime: ${result.data.uptime}s`, 'green');
      return true;
    } else {
      log('✗ Server health check failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Server health check error: ${error.message}`, 'red');
    return false;
  }
}

async function createTestUser() {
  log('→ Creating test user via API...', 'blue');
  testUserEmail = `persist_test_${Date.now()}@example.com`;

  const userData = {
    name: testUserName,
    email: testUserEmail,
    password: 'TestPassword123!',
    preferred_language: 'it'
  };

  try {
    const result = await makeRequest('POST', '/auth/register', userData);

    if (result.status === 201 && result.data.user) {
      testUserId = result.data.user.id;
      testUserToken = result.data.token;
      log('✓ Test user created successfully', 'green');
      log(`  ID: ${testUserId}`, 'green');
      log(`  Email: ${testUserEmail}`, 'green');
      log(`  Name: ${result.data.user.name}`, 'green');
      log(`  Token: ${testUserToken.substring(0, 20)}...`, 'green');
      return true;
    } else {
      log('✗ Failed to create user', 'red');
      log(`  Status: ${result.status}`, 'red');
      log(`  Response: ${JSON.stringify(result.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error creating user: ${error.message}`, 'red');
    return false;
  }
}

async function verifyUserExists() {
  log('→ Verifying user exists via API...', 'blue');

  try {
    const result = await makeRequest('GET', '/users/me', null, testUserToken);

    if (result.status === 200 && result.data.user) {
      log('✓ User verified via /users/me', 'green');
      log(`  ID: ${result.data.user.id}`, 'green');
      log(`  Email: ${result.data.user.email}`, 'green');
      log(`  Name: ${result.data.user.name}`, 'green');
      return true;
    } else {
      log('✗ Failed to verify user', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error verifying user: ${error.message}`, 'red');
    return false;
  }
}

async function createTestProject() {
  log('→ Creating test project via API...', 'blue');

  const projectData = {
    title: `PERSIST_TEST_PROJECT_${Date.now()}`,
    description: 'Project to test data persistence across server restart',
    area: 'romanziere',
    genre: 'Fantasy',
    tone: 'Epic',
    status: 'draft'
  };

  try {
    const result = await makeRequest('POST', '/projects', projectData, testUserToken);

    if (result.status === 201 && result.data.project) {
      testProjectId = result.data.project.id;
      log('✓ Test project created successfully', 'green');
      log(`  ID: ${testProjectId}`, 'green');
      log(`  Title: ${result.data.project.title}`, 'green');
      return true;
    } else {
      log('✗ Failed to create project', 'red');
      log(`  Response: ${JSON.stringify(result.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error creating project: ${error.message}`, 'red');
    return false;
  }
}

async function verifyProjectExists() {
  log('→ Verifying project exists via API...', 'blue');

  try {
    const result = await makeRequest('GET', `/projects/${testProjectId}`, null, testUserToken);

    if (result.status === 200 && result.data.project) {
      log('✓ Project verified via API', 'green');
      log(`  ID: ${result.data.project.id}`, 'green');
      log(`  Title: ${result.data.project.title}`, 'green');
      return true;
    } else {
      log('✗ Failed to verify project', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error verifying project: ${error.message}`, 'red');
    return false;
  }
}

async function checkDatabaseFile() {
  log('→ Checking database file...', 'blue');

  const dbPath = path.join(__dirname, 'data', 'omniwriter.db');

  try {
    const stats = fs.statSync(dbPath);
    log('✓ Database file exists', 'green');
    log(`  Path: ${dbPath}`, 'green');
    log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`, 'green');
    log(`  Modified: ${stats.mtime.toISOString()}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Database file not found: ${dbPath}`, 'red');
    return false;
  }
}

async function stopServer() {
  logSection('STEP 1: STOPPING SERVER');

  log('→ Stopping development server...', 'yellow');

  try {
    // Kill process on port 3000
    execSync('lsof -ti :3000 | xargs kill -9 2>/dev/null || true', { stdio: 'inherit' });
    log('✓ Server stop command executed', 'green');
  } catch (error) {
    log(`  Note: ${error.message}`, 'yellow');
  }

  // Wait for server to fully stop
  log('→ Waiting 5 seconds for server to stop...', 'yellow');
  execSync('sleep 5', { stdio: 'inherit' });

  // Verify server is stopped
  log('→ Verifying server is stopped...', 'yellow');
  try {
    const result = await makeRequest('GET', '/health');
    log('✗ Server is still running!', 'red');
    return false;
  } catch (error) {
    log('✓ Server is stopped (connection refused as expected)', 'green');
    return true;
  }
}

async function startServer() {
  logSection('STEP 2: RESTARTING SERVER');

  log('→ Starting development server...', 'yellow');
  log('  Running: ./init.sh', 'yellow');

  try {
    // Start server in background
    execSync('./init.sh > /dev/null 2>&1 &', { stdio: 'inherit' });
    log('✓ Server start command executed', 'green');
  } catch (error) {
    log(`  Note: ${error.message}`, 'yellow');
  }

  // Wait for server to start
  log('→ Waiting 15 seconds for server to fully start...', 'yellow');
  execSync('sleep 15', { stdio: 'inherit' });

  return true;
}

async function verifyServerRestarted() {
  log('→ Verifying server restarted successfully...', 'yellow');

  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await makeRequest('GET', '/health');
      if (result.status === 200) {
        log('✓ Server restarted successfully', 'green');
        log(`  Database: ${result.data.database}`, 'green');
        return true;
      }
    } catch (error) {
      if (i < maxAttempts - 1) {
        log(`  Attempt ${i + 1}/${maxAttempts} failed, retrying in 2s...`, 'yellow');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  log('✗ Server failed to restart after 10 attempts', 'red');
  return false;
}

async function verifyDataPersisted() {
  logSection('STEP 3: VERIFYING DATA PERSISTENCE');

  let allPassed = true;

  // Try to login with the same credentials
  log('→ Attempting to login with same credentials...', 'blue');

  const loginData = {
    email: testUserEmail,
    password: 'TestPassword123!'
  };

  try {
    const result = await makeRequest('POST', '/auth/login', loginData);

    if (result.status === 200 && result.data.token) {
      log('✓ Login successful after server restart', 'green');
      testUserToken = result.data.token;
      log(`  New token: ${result.data.token.substring(0, 20)}...`, 'green');
    } else {
      log('✗ LOGIN FAILED - CRITICAL: Data not persisted!', 'red');
      log('  This indicates in-memory storage is being used', 'red');
      allPassed = false;
      return false;
    }
  } catch (error) {
    log(`✗ Login error: ${error.message}`, 'red');
    log('✗ CRITICAL: Cannot authenticate - data was not persisted!', 'red');
    allPassed = false;
    return false;
  }

  // Verify user data
  const userVerified = await verifyUserExists();
  if (!userVerified) {
    log('✗ User data not found after restart', 'red');
    allPassed = false;
  }

  // Verify project data
  if (testProjectId) {
    const projectVerified = await verifyProjectExists();
    if (!projectVerified) {
      log('✗ Project data not found after restart', 'red');
      allPassed = false;
    }
  }

  return allPassed;
}

async function cleanupTestData() {
  logSection('CLEANUP');

  log('→ Cleaning up test data...', 'yellow');

  // Delete test project
  if (testProjectId && testUserToken) {
    try {
      await makeRequest('DELETE', `/projects/${testProjectId}`, null, testUserToken);
      log('✓ Test project deleted', 'green');
    } catch (error) {
      log(`  Note: Could not delete project: ${error.message}`, 'yellow');
    }
  }

  // Delete test user
  if (testUserId && testUserToken) {
    try {
      await makeRequest('DELETE', `/users/${testUserId}`, null, testUserToken);
      log('✓ Test user deleted', 'green');
    } catch (error) {
      log(`  Note: Could not delete user: ${error.message}`, 'yellow');
    }
  }

  log('✓ Cleanup completed', 'green');
}

async function runTest() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'bold');
  log('║     FEATURE #3: DATA PERSISTENCE ACROSS RESTART TEST       ║', 'bold');
  log('╚════════════════════════════════════════════════════════════╝', 'bold');

  // PHASE 1: Initial setup and data creation
  logSection('PHASE 1: INITIAL SETUP');

  const healthOk = await checkServerHealth();
  if (!healthOk) {
    log('\n✗ TEST FAILED: Server not healthy', 'red');
    process.exit(1);
  }

  const dbExists = await checkDatabaseFile();
  if (!dbExists) {
    log('\n✗ TEST FAILED: Database file not found', 'red');
    process.exit(1);
  }

  const userCreated = await createTestUser();
  if (!userCreated) {
    log('\n✗ TEST FAILED: Could not create test user', 'red');
    process.exit(1);
  }

  const userExists = await verifyUserExists();
  if (!userExists) {
    log('\n✗ TEST FAILED: Could not verify user exists', 'red');
    process.exit(1);
  }

  const projectCreated = await createTestProject();
  if (!projectCreated) {
    log('\n⚠ WARNING: Could not create test project (continuing anyway)', 'yellow');
  } else {
    await verifyProjectExists();
  }

  // PHASE 2: Stop server
  const stopped = stopServer();
  if (!stopped) {
    log('\n✗ TEST FAILED: Could not stop server', 'red');
    process.exit(1);
  }

  // PHASE 3: Restart server
  startServer();
  const restarted = await verifyServerRestarted();
  if (!restarted) {
    log('\n✗ TEST FAILED: Server did not restart properly', 'red');
    process.exit(1);
  }

  // PHASE 4: Verify data persisted
  const dataPersisted = await verifyDataPersisted();

  // PHASE 5: Cleanup
  await cleanupTestData();

  // FINAL RESULT
  logSection('TEST RESULT');

  if (dataPersisted) {
    log('✓✓✓ FEATURE #3: PASSED ✓✓✓', 'green');
    log('');
    log('Data created via the API successfully survived a complete server stop', 'green');
    log('and restart. The application is using persistent SQLite storage.', 'green');
    log('');
    log('Verified:', 'green');
    log('  • User authentication persisted', 'green');
    log('  • User data persisted', 'green');
    if (testProjectId) {
      log('  • Project data persisted', 'green');
    }
    log('  • No in-memory storage detected', 'green');
    log('');

    process.exit(0);
  } else {
    log('✗✗✗ FEATURE #3: FAILED ✗✗✗', 'red');
    log('');
    log('CRITICAL FAILURE: Data did not persist across server restart!', 'red');
    log('This indicates the application may be using in-memory storage', 'red');
    log('instead of the persistent SQLite database.', 'red');
    log('');

    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  log(`\n✗ TEST ERROR: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
