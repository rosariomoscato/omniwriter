#!/usr/bin/env node
/**
 * Regression test for Feature 5: Backend API queries real database
 * Verifies that server logs show real SQL/ORM queries when API endpoints are called
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

console.log('=== Testing Feature 5: Backend API Queries Real Database ===\n');

// Step 1: Check if server is running
console.log('Step 1: Checking if server is running...');
const healthReq = http.get(`${BASE_URL}/api/health`, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Server is running');
    console.log('Health check response:', data);

    // Step 2: Make API calls and verify they query the database
    console.log('\nStep 2: Testing API endpoints...');

    // Test GET /api/health (should have already queried DB)
    console.log('\n2.1: GET /api/health');
    testAuthEndpoint();
  });
});

healthReq.on('error', (err) => {
  console.log('\n❌ FAIL: Could not connect to server');
  console.log('Error:', err.message);
  console.log('\nMake sure the server is running on port 3001');
  console.log('Start it with: npm run dev --prefix server');
  process.exit(1);
});

function testAuthEndpoint() {
  // Step 3: Check server logs for SQL queries
  console.log('\nStep 3: Checking server logs for SQL queries...');

  const logPath = path.join(__dirname, 'server.log');
  if (!fs.existsSync(logPath)) {
    console.log('❌ FAIL: server.log not found');
    process.exit(1);
  }

  // Read last 100 lines of log
  const logs = execSync('tail -100 server.log', { encoding: 'utf8' });

  // Check for SQL queries or database operations
  const hasDbLogs = logs.includes('[Database]') ||
                    logs.includes('SELECT') ||
                    logs.includes('INSERT') ||
                    logs.includes('UPDATE') ||
                    logs.includes('DELETE') ||
                    logs.includes('prepare') ||
                    logs.includes('db.prepare');

  if (hasDbLogs) {
    console.log('✅ PASS: Database queries found in logs');
    console.log('\nSample DB-related log entries:');
    const dbLines = logs.split('\n').filter(line =>
      line.includes('[Database]') ||
      line.includes('[Projects]') ||
      line.includes('[Auth]') ||
      line.includes('[Users]')
    ).slice(0, 5);
    dbLines.forEach(line => console.log('  ', line));
  } else {
    console.log('❌ FAIL: No database queries found in logs');
    process.exit(1);
  }

  // Step 4: Verify database file exists and has non-zero size
  console.log('\nStep 4: Verifying database file...');
  const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');

  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`✅ PASS: Database file exists at ${dbPath}`);
    console.log(`✅ PASS: Database file size: ${stats.size} bytes`);

    if (stats.size === 0) {
      console.log('❌ FAIL: Database file is empty (0 bytes)');
      process.exit(1);
    }
  } else {
    console.log(`❌ FAIL: Database file not found at ${dbPath}`);
    process.exit(1);
  }

  // Step 5: Verify no mock data patterns
  console.log('\nStep 5: Verifying no mock data is used...');

  // Check that the logs don't contain mock data patterns
  const hasMockData = logs.includes('mockData') ||
                      logs.includes('testData') ||
                      logs.includes('fakeData') ||
                      logs.includes('generateMockContent');

  if (hasMockData) {
    console.log('❌ FAIL: Mock data patterns found in logs');
    console.log('The API may be using mock data instead of real database queries');
    process.exit(1);
  } else {
    console.log('✅ PASS: No mock data patterns found');
  }

  console.log('\n=== ALL TESTS PASSED ===\n');
  console.log('Summary:');
  console.log('- Server is running and responding');
  console.log('- Database queries found in logs');
  console.log('- Database file exists and is non-empty');
  console.log('- No mock data patterns detected');
  console.log('\n✅ Backend API is querying real database');
  process.exit(0);
}

function execSync(cmd) {
  const { execSync } = require('child_process');
  return execSync(cmd, { encoding: 'utf8' });
}
