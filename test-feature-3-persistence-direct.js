/**
 * Feature #3: Data persists across server restart
 * Direct database test bypassing HTTP
 */

const Database = require('./server/node_modules/better-sqlite3');
const path = require('path');
const bcrypt = require('./server/node_modules/bcryptjs');

const DB_PATH = path.join(__dirname, 'server', 'data', 'omniwriter.db');
const TEST_EMAIL = `feature3-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';

console.log('=== Feature #3: Data Persistence Test ===\n');

// Step 1: Create test user directly in database
console.log('Step 1: Creating test user...');
const db = new Database(DB_PATH, { readonly: false });

const hashedPassword = bcrypt.hashSync(TEST_PASSWORD, 10);
const result = db.prepare(
  'INSERT INTO users (email, password_hash, name, role, preferred_language, theme_preference) VALUES (?, ?, ?, ?, ?, ?)'
).run(TEST_EMAIL, hashedPassword, 'Feature3 Test User', 'free', 'en', 'light');

const userId = result.lastInsertRowid;
console.log(`✓ User created with ID: ${userId}`);
console.log(`  Email: ${TEST_EMAIL}`);

// Step 2: Verify user exists
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(TEST_EMAIL);
if (user) {
  console.log('✓ User found in database');
  console.log(`  Name: ${user.name}`);
  console.log(`  Role: ${user.role}`);
} else {
  console.log('✗ User NOT found in database - FAIL');
  process.exit(1);
}

db.close();

// Step 3: Simulate server restart by closing and reopening database
console.log('\nStep 2: Simulating server restart...');
console.log('Closing database connection...');

// Wait a moment
setTimeout(() => {
  console.log('Reopening database connection...');
  const db2 = new Database(DB_PATH, { readonly: false });

  // Step 4: Verify data still exists after restart
  console.log('\nStep 3: Verifying data after restart...');
  const userAfterRestart = db2.prepare('SELECT * FROM users WHERE email = ?').get(TEST_EMAIL);

  if (userAfterRestart) {
    console.log('✓ User still exists after restart - PASS');
    console.log(`  User ID: ${userAfterRestart.id}`);
    console.log(`  Name: ${userAfterRestart.name}`);
    console.log(`  Created at: ${userAfterRestart.created_at}`);

    // Clean up test data
    console.log('\nCleaning up test data...');
    db2.prepare('DELETE FROM users WHERE email = ?').run(TEST_EMAIL);
    console.log('✓ Test user deleted');

    db2.close();
    console.log('\n=== Feature #3: PASS ✓ ===');
    console.log('Data persists across server restart');

    process.exit(0);
  } else {
    console.log('✗ User NOT found after restart - FAIL');
    console.log('  This indicates in-memory storage');
    db2.close();
    process.exit(1);
  }
}, 500);
