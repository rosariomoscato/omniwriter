#!/usr/bin/env node

/**
 * Feature #3: Data persists across server restart
 *
 * This test verifies that data created via the API survives a complete server stop and restart.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE = 'http://localhost:5001/api';
const TEST_EMAIL = `persistence-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test1234!';
const TEST_NAME = 'Persistence Test User';

let authToken = null;
let userId = null;

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
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

async function step1_createUser() {
  log('\n=== STEP 1: Creating test user ===', 'blue');
  log(`Email: ${TEST_EMAIL}`, 'yellow');

  const response = await makeRequest('/auth/register', 'POST', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    name: TEST_NAME
  });

  if (response.status === 201 || response.status === 200) {
    log('✓ User created successfully', 'green');
    authToken = response.data.token;
    userId = response.data.user?.id || response.data.id;
    log(`  Token: ${authToken?.substring(0, 20)}...`, 'yellow');
    log(`  User ID: ${userId}`, 'yellow');
    return true;
  } else {
    log(`✗ Failed to create user: ${JSON.stringify(response.data)}`, 'red');
    return false;
  }
}

async function step2_verifyUserExists() {
  log('\n=== STEP 2: Verifying user exists via API ===', 'blue');

  const response = await makeRequest('/auth/me', 'GET', null, {
    'Authorization': `Bearer ${authToken}`
  });

  if (response.status === 200 && response.data.email === TEST_EMAIL) {
    log('✓ User verified via /api/auth/me', 'green');
    log(`  Email: ${response.data.email}`, 'yellow');
    log(`  Name: ${response.data.name}`, 'yellow');
    log(`  Role: ${response.data.role}`, 'yellow');
    return true;
  } else {
    log(`✗ Failed to verify user: ${JSON.stringify(response.data)}`, 'red');
    return false;
  }
}

async function step3_createProject() {
  log('\n=== STEP 3: Creating a test project ===', 'blue');

  const response = await makeRequest('/projects', 'POST', {
    title: `Persistence Test Project ${Date.now()}`,
    description: 'This project should persist after server restart',
    area: 'redattore'
  }, {
    'Authorization': `Bearer ${authToken}`
  });

  if (response.status === 201 || response.status === 200) {
    log('✓ Project created successfully', 'green');
    log(`  Project ID: ${response.data.id}`, 'yellow');
    log(`  Title: ${response.data.title}`, 'yellow');
    return response.data.id;
  } else {
    log(`✗ Failed to create project: ${JSON.stringify(response.data)}`, 'red');
    return null;
  }
}

async function step4_verifyProject(projectId) {
  log('\n=== STEP 4: Verifying project exists ===', 'blue');

  const response = await makeRequest(`/projects/${projectId}`, 'GET', null, {
    'Authorization': `Bearer ${authToken}`
  });

  if (response.status === 200) {
    log('✓ Project verified via API', 'green');
    log(`  Title: ${response.data.title}`, 'yellow');
    log(`  Area: ${response.data.area}`, 'yellow');
    return true;
  } else {
    log(`✗ Failed to verify project: ${JSON.stringify(response.data)}`, 'red');
    return false;
  }
}

async function step5_stopServer() {
  log('\n=== STEP 5: Stopping server ===', 'blue');

  try {
    // Kill server on port 5001
    const { execSync } = require('child_process');
    execSync('lsof -ti :5001 | xargs kill -9 2>/dev/null || true', { encoding: 'utf8' });
    log('✓ Server stop command executed', 'green');

    // Wait a bit for the server to fully stop
    await sleep(3000);

    // Verify server is stopped
    try {
      await makeRequest('/health', 'GET');
      log('✗ Server still responding - may not have stopped', 'red');
      return false;
    } catch (e) {
      log('✓ Server confirmed stopped (connection refused)', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ Error stopping server: ${error.message}`, 'red');
    return false;
  }
}

async function step6_restartServer() {
  log('\n=== STEP 6: Restarting server ===', 'blue');
  log('Starting server in background...', 'yellow');

  try {
    const { spawn } = require('child_process');

    // Start server
    const serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'server'),
      detached: true,
      stdio: 'ignore',
      shell: true
    });

    serverProcess.unref();

    log('✓ Server start command executed', 'green');
    log('Waiting for server to be ready...', 'yellow');

    // Wait for server to start
    let serverReady = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!serverReady && attempts < maxAttempts) {
      await sleep(2000);
      attempts++;

      try {
        const response = await makeRequest('/health', 'GET');
        if (response.status === 200) {
          serverReady = true;
          log(`✓ Server is ready (took ${attempts * 2}s)`, 'green');
        }
      } catch (e) {
        process.stdout.write('.');
      }
    }

    if (!serverReady) {
      log('\n✗ Server failed to start in time', 'red');
      return false;
    }

    // Additional wait for all routes to load
    await sleep(3000);
    return true;
  } catch (error) {
    log(`✗ Error restarting server: ${error.message}`, 'red');
    return false;
  }
}

async function step7_relogin() {
  log('\n=== STEP 7: Logging in after server restart ===', 'blue');

  const response = await makeRequest('/auth/login', 'POST', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (response.status === 200 || response.status === 201) {
    log('✓ Login successful after server restart', 'green');
    authToken = response.data.token;
    log(`  New token: ${authToken?.substring(0, 20)}...`, 'yellow');
    return true;
  } else {
    log(`✗ CRITICAL: Login failed after restart!`, 'red');
    log(`  Response: ${JSON.stringify(response.data)}`, 'red');
    log(`  This indicates IN-MEMORY STORAGE!`, 'red');
    return false;
  }
}

async function step8_verifyProjectAfterRestart(projectId) {
  log('\n=== STEP 8: Verifying project still exists ===', 'blue');

  const response = await makeRequest(`/projects/${projectId}`, 'GET', null, {
    'Authorization': `Bearer ${authToken}`
  });

  if (response.status === 200) {
    log('✓ Project still exists after restart', 'green');
    log(`  Title: ${response.data.title}`, 'yellow');
    log(`  Area: ${response.data.area}`, 'yellow');
    return true;
  } else {
    log(`✗ CRITICAL: Project not found after restart!`, 'red');
    log(`  Response: ${JSON.stringify(response.data)}`, 'red');
    return false;
  }
}

async function step9_cleanup(projectId) {
  log('\n=== STEP 9: Cleaning up test data ===', 'blue');

  try {
    // Delete project
    await makeRequest(`/projects/${projectId}`, 'DELETE', null, {
      'Authorization': `Bearer ${authToken}`
    });
    log('✓ Test project deleted', 'green');
  } catch (e) {
    log('  Note: Could not delete test project', 'yellow');
  }

  try {
    // Delete user (if API supports it)
    await makeRequest('/users/account', 'DELETE', null, {
      'Authorization': `Bearer ${authToken}`
    });
    log('✓ Test user deleted', 'green');
  } catch (e) {
    log('  Note: Could not delete test user (may need admin intervention)', 'yellow');
  }

  log(`\nTest email for manual cleanup: ${TEST_EMAIL}`, 'yellow');
}

async function runTest() {
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║   Feature #3: Data Persists Across Server Restart    ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  let projectId = null;
  const results = {};

  // Step 1: Create user
  results.createUser = await step1_createUser();
  if (!results.createUser) {
    log('\n✗ Test aborted: Could not create user', 'red');
    process.exit(1);
  }

  // Step 2: Verify user exists
  results.verifyUser = await step2_verifyUserExists();

  // Step 3: Create project
  projectId = await step3_createProject();
  results.createProject = !!projectId;

  // Step 4: Verify project
  if (projectId) {
    results.verifyProject = await step4_verifyProject(projectId);
  }

  // Step 5: Stop server
  results.stopServer = await step5_stopServer();

  if (!results.stopServer) {
    log('\n⚠ Cannot proceed - server did not stop properly', 'yellow');
    process.exit(1);
  }

  // Step 6: Restart server
  results.restartServer = await step6_restartServer();

  if (!results.restartServer) {
    log('\n⚠ Cannot proceed - server did not restart properly', 'yellow');
    log('Please manually restart the server and run the test again', 'yellow');
    process.exit(1);
  }

  // Step 7: Re-login (CRITICAL TEST)
  results.relogin = await step7_relogin();

  if (!results.relogin) {
    log('\n╔════════════════════════════════════════════════════════╗', 'red');
    log('║        CRITICAL FAILURE: IN-MEMORY STORAGE!        ║', 'red');
    log('╚════════════════════════════════════════════════════════╝', 'red');
    log('\nThe application lost user data after server restart.', 'red');
    log('This means the application is using in-memory storage', 'red');
    log('instead of a real database (SQLite).', 'red');
  }

  // Step 8: Verify project after restart
  if (results.relogin && projectId) {
    results.verifyAfterRestart = await step8_verifyProjectAfterRestart(projectId);
  }

  // Step 9: Cleanup
  await step9_cleanup(projectId);

  // Print results
  log('\n╔════════════════════════════════════════════════════════╗', 'blue');
  log('║                    TEST RESULTS                         ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  log('\nSteps completed:', 'blue');
  log(`  1. Create user:              ${results.createUser ? '✓' : '✗'}`, results.createUser ? 'green' : 'red');
  log(`  2. Verify user exists:       ${results.verifyUser ? '✓' : '✗'}`, results.verifyUser ? 'green' : 'red');
  log(`  3. Create project:           ${results.createProject ? '✓' : '✗'}`, results.createProject ? 'green' : 'red');
  log(`  4. Verify project:           ${results.verifyProject ? '✓' : '✗'}`, results.verifyProject ? 'green' : 'red');
  log(`  5. Stop server:              ${results.stopServer ? '✓' : '✗'}`, results.stopServer ? 'green' : 'red');
  log(`  6. Restart server:           ${results.restartServer ? '✓' : '✗'}`, results.restartServer ? 'green' : 'red');
  log(`  7. Re-login (CRITICAL):      ${results.relogin ? '✓' : '✗'}`, results.relogin ? 'green' : 'red');
  log(`  8. Verify after restart:     ${results.verifyAfterRestart ? '✓' : '✗'}`, results.verifyAfterRestart ? 'green' : 'red');

  const allPassed = Object.values(results).every(v => v === true);

  if (allPassed) {
    log('\n╔════════════════════════════════════════════════════════╗', 'green');
    log('║          ✓ FEATURE #3: PASSING                         ║', 'green');
    log('║    Data persists correctly across server restart       ║', 'green');
    log('╚════════════════════════════════════════════════════════╝', 'green');
    process.exit(0);
  } else {
    log('\n╔════════════════════════════════════════════════════════╗', 'red');
    log('║          ✗ FEATURE #3: FAILING                         ║', 'red');
    log('║    Data does NOT persist across server restart        ║', 'red');
    log('╚════════════════════════════════════════════════════════╝', 'red');
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  log(`\n✗ Test error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
