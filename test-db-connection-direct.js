#!/usr/bin/env node
/**
 * Direct test of database connection for Feature 1
 * Tests the database module without needing a running server
 */
const path = require('path');

console.log('=== Testing Feature 1: Database Connection Established ===\n');
console.log('Step 1: Attempting to initialize database...\n');

// Import the database module
try {
  // Require the built database module
  const dbModule = require('./server/dist/db/database');

  console.log('Step 2: Calling initializeDatabase()...\n');
  const db = dbModule.initializeDatabase();

  if (db && typeof db.prepare === 'function') {
    console.log('✅ PASS: Database object created successfully');
    console.log('✅ PASS: Database has prepare method (SQLite3 API)');
    console.log('\nStep 3: Verifying database file exists...\n');

    const fs = require('fs');
    const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');

    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`✅ PASS: Database file exists at ${dbPath}`);
      console.log(`✅ PASS: Database file size: ${stats.size} bytes`);

      if (stats.size > 0) {
        console.log('\n=== ALL TESTS PASSED ===\n');
        console.log('Summary:');
        console.log('- Database connection established');
        console.log('- Database file exists and is non-empty');
        console.log('- No connection errors occurred');
        process.exit(0);
      } else {
        console.log('\n❌ FAIL: Database file is empty (0 bytes)');
        process.exit(1);
      }
    } else {
      console.log(`\n❌ FAIL: Database file not found at ${dbPath}`);
      process.exit(1);
    }
  } else {
    console.log('\n❌ FAIL: Database object is invalid');
    console.log('Expected: object with prepare method');
    console.log('Got:', db);
    process.exit(1);
  }

} catch (error) {
  console.log('\n❌ FAIL: Error initializing database');
  console.log('Error:', error.message);
  console.log('\nStack trace:');
  console.log(error.stack);
  process.exit(1);
}
