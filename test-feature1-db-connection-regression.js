#!/usr/bin/env node

/**
 * Regression test for Feature 1: Database Connection
 *
 * This test verifies the database connection directly without needing
 * the HTTP server (to avoid sandbox EPERM issues).
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('=== Feature 1 Regression Test: Database Connection ===\n');

// Get database path
const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');

// Check if database file exists
console.log('1. Checking if database file exists...');
if (!fs.existsSync(dbPath)) {
  console.error('   ❌ Database file not found at:', dbPath);
  process.exit(1);
}
console.log('   ✅ Database file exists at:', dbPath);

// Try to connect to database
console.log('\n2. Attempting to connect to database...');
let db;
try {
  db = new Database(dbPath, { readonly: true });
  console.log('   ✅ Successfully connected to SQLite database');

  // Check database is readable
  console.log('\n3. Verifying database is readable...');
  const result = db.prepare('SELECT 1 as test').get();
  if (result && result.test === 1) {
    console.log('   ✅ Database query executed successfully');
  } else {
    console.error('   ❌ Database query returned unexpected result');
    process.exit(1);
  }

  // Check schema exists
  console.log('\n4. Verifying database schema...');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `).all();

  if (tables.length === 0) {
    console.error('   ❌ No tables found in database');
    process.exit(1);
  }

  console.log(`   ✅ Found ${tables.length} tables:`);
  tables.forEach((t, i) => {
    console.log(`      ${i + 1}. ${t.name}`);
  });

  // Check users table specifically
  console.log('\n5. Verifying users table...');
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`   ✅ Users table contains ${userCount.count} records`);

  // Check projects table
  console.log('\n6. Verifying projects table...');
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  console.log(`   ✅ Projects table contains ${projectCount.count} records`);

  console.log('\n=== ALL CHECKS PASSED ✅ ===');
  console.log('\nFeature 1 Status: PASSING');
  console.log('- Database connection established');
  console.log('- Database is readable');
  console.log('- Schema is intact');
  console.log('- No connection errors');

  db.close();
  process.exit(0);

} catch (error) {
  console.error('\n   ❌ Database connection failed:', error.message);
  console.error('\nFeature 1 Status: FAILING');
  process.exit(1);
}
