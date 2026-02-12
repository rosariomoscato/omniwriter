#!/usr/bin/env node

// Simple script to verify database connection for Feature #1
const path = require('path');

// Require from server/node_modules
const Database = require(path.join(__dirname, 'server', 'node_modules', 'better-sqlite3'));
const fs = require('fs');

const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');

console.log('=== Feature #1: Database Connection Verification ===\n');

// Check if database file exists
if (fs.existsSync(dbPath)) {
  console.log('✅ Database file exists:', dbPath);
} else {
  console.log('❌ Database file NOT found:', dbPath);
  process.exit(1);
}

// Try to connect to database
try {
  const db = new Database(dbPath, { readonly: true });
  console.log('✅ Successfully connected to database');

  // Test a simple query
  const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(`✅ Database query successful - found ${result.length} tables`);

  // List tables
  console.log('\nTables in database:');
  result.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.name}`);
  });

  // Test health endpoint format (what the API should return)
  console.log('\n=== Expected Health Endpoint Response ===');
  console.log(JSON.stringify({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString()
  }, null, 2));

  db.close();
  console.log('\n✅ Database connection test PASSED');
  process.exit(0);
} catch (error) {
  console.log('❌ Database connection FAILED:', error.message);
  process.exit(1);
}
