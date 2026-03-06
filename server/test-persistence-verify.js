const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

console.log('Testing data persistence...\n');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

// Generate a unique test user
const testUserId = uuidv4();
const testEmail = `persistence_test_${Date.now()}@test.com`;
const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync('TestPassword123!', salt);

console.log('Step 1: Creating test user...');
console.log(`  User ID: ${testUserId}`);
console.log(`  Email: ${testEmail}`);

try {
  const insertStmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'user', 'it', 'light', datetime('now'), datetime('now'))
  `);

  insertStmt.run(testUserId, testEmail, passwordHash, 'Persistence Test User');
  console.log('  ✓ Test user created successfully');
} catch (error) {
  console.error('  ✗ Failed to create test user:', error.message);
  process.exit(1);
}

// Verify the user was written
console.log('\nStep 2: Verifying user in database...');
const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = userStmt.get(testUserId);

if (user) {
  console.log('  ✓ User found in database');
  console.log(`    Email: ${user.email}`);
  console.log(`    Name: ${user.name}`);
} else {
  console.log('  ✗ User NOT found in database - CRITICAL FAILURE!');
  process.exit(1);
}

db.close();

// Simulate "server restart" by reopening database
console.log('\nStep 3: Reopening database (simulating server restart)...');
const db2 = new Database(dbPath);

console.log('Step 4: Verifying user persists after reopen...');
const userStmt2 = db2.prepare('SELECT * FROM users WHERE id = ?');
const user2 = userStmt2.get(testUserId);

if (user2) {
  console.log('  ✓ User persists after database reopen');
  console.log(`    Email: ${user2.email}`);
  console.log(`    Name: ${user2.name}`);
} else {
  console.log('  ✗ User NOT found after reopen - DATA PERSISTENCE FAILURE!');
  db2.close();
  process.exit(1);
}

// Cleanup
console.log('\nStep 5: Cleaning up test data...');
const deleteStmt = db2.prepare('DELETE FROM users WHERE id = ?');
const result = deleteStmt.run(testUserId);
console.log(`  ✓ Deleted ${result.changes} test user record(s)`);

db2.close();

console.log('\n✓ Data persistence verification PASSED!');
console.log('  - Data written to SQLite database');
console.log('  - Data persists after database close/reopen');
console.log('  - Confirmed: Database is NOT in-memory storage');
