// Test Feature 3: Data persists across server restart
const http = require('http');

const API_BASE = 'http://127.0.0.1:5000';

// Generate unique test user
const testEmail = `test_persistence_${Date.now()}@example.com`;
const testPassword = 'TestPass123!';
const testName = 'Persistence Test User';

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const fullPath = path.startsWith('/') ? path : '/' + path;
    const url = new URL(fullPath, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
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

async function testPersistence() {
  console.log("=== Feature 3: Data Persistence Test ===\n");

  // Step 1: Create test user
  console.log("Step 1: Creating test user...");
  console.log("  Email:", testEmail);
  const createResult = await makeRequest('/api/auth/register', 'POST', {
    email: testEmail,
    password: testPassword,
    name: testName
  });

  if (createResult.status !== 201 && createResult.status !== 200) {
    console.log("  ✗ Failed to create user:", createResult.data);
    return false;
  }
  console.log("  ✓ User created successfully");

  // Step 2: Verify user exists via login
  console.log("\nStep 2: Verifying user can login...");
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    email: testEmail,
    password: testPassword
  });

  if (loginResult.status !== 200) {
    console.log("  ✗ Login failed:", loginResult.data);
    return false;
  }
  console.log("  ✓ Login successful before restart");
  const userId = loginResult.data.user.id;
  console.log("  User ID:", userId);

  // Step 3: Get server PID
  const fs = require('fs');
  const serverPid = fs.readFileSync('server.pid', 'utf8').trim();
  console.log("\nStep 3: Current server PID:", serverPid);

  // Step 4: Stop server
  console.log("\nStep 4: Stopping server...");
  const { exec } = require('child_process');
  await new Promise(resolve => {
    exec(`kill -9 ${serverPid}`, resolve);
  });
  console.log("  ✓ Server stopped");

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 5: Restart server
  console.log("\nStep 5: Restarting server...");
  const { spawn } = require('child_process');
  const server = spawn('node', ['server/dist/index.js'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  fs.writeFileSync('server.pid', String(server.pid));
  console.log("  New PID:", server.pid);

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 6: Verify data persists by logging in again
  console.log("\nStep 6: Verifying data persists after restart...");
  const loginAfterRestart = await makeRequest('/api/auth/login', 'POST', {
    email: testEmail,
    password: testPassword
  });

  if (loginAfterRestart.status !== 200) {
    console.log("  ✗ CRITICAL FAILURE: Login failed after restart!");
    console.log("  Response:", loginAfterRestart.data);
    console.log("\n  ⚠️  This indicates IN-MEMORY storage - data was lost!");
    return false;
  }

  console.log("  ✓ Login successful after restart");
  const userIdAfter = loginAfterRestart.data.user.id;

  if (userId !== userIdAfter) {
    console.log("  ✗ User ID mismatch!");
    console.log("    Before:", userId);
    console.log("    After:", userIdAfter);
    return false;
  }

  console.log("  ✓ User ID matches:", userId);
  console.log("\n=== Overall: ✓ PASS - Data persisted across restart ===");

  // Cleanup: Delete test user
  console.log("\nCleanup: Deleting test user...");
  // You might need to implement delete user endpoint or use direct DB
  console.log("  (Test user can be manually removed if needed)");

  return true;
}

testPersistence().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
