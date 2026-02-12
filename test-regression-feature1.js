#!/usr/bin/env node
/**
 * Regression test for Feature 1: Database connection established
 */
const http = require('http');
const fs = require('fs');

const HEALTH_URL = 'http://localhost:3001/api/health';

console.log('=== Testing Feature 1: Database Connection Established ===\n');

// Step 1: Check if server is running
console.log('Step 1: Checking if server is running...');

const req = http.get(HEALTH_URL, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response status:', res.statusCode);
    console.log('Response body:', data);

    try {
      const health = JSON.parse(data);

      // Step 4: Verify response includes database status: connected
      if (health.database && health.database.status === 'connected') {
        console.log('\n✅ PASS: Database status is connected');
        process.exit(0);
      } else {
        console.log('\n❌ FAIL: Database status is not connected');
        console.log('Expected: { database: { status: "connected" } }');
        console.log('Got:', health);
        process.exit(1);
      }
    } catch (e) {
      console.log('\n❌ FAIL: Could not parse response as JSON');
      console.log('Error:', e.message);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.log('\n❌ FAIL: Could not connect to server');
  console.log('Error:', err.message);
  console.log('\nMake sure the server is running on port 3001');
  process.exit(1);
});

req.setTimeout(5000, () => {
  req.destroy();
  console.log('\n❌ FAIL: Request timed out after 5 seconds');
  console.log('Server may not be responding');
  process.exit(1);
});
