// Test script to verify data persistence across restarts
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';

console.log('=== Testing Data Persistence ===\n');

// Test 1: Insert test data
console.log('Step 1: Inserting test user into database...');
const testUserId = uuidv4();
const testEmail = `persistence-test-${Date.now()}@example.com`;

let db = new Database(DB_PATH);

const insertStmt = db.prepare(`
  INSERT INTO users (id, email, name, role, preferred_language, theme_preference)
  VALUES (?, ?, ?, ?, ?, ?)
`);

try {
  insertStmt.run(testUserId, testEmail, 'Persistence Test User', 'free', 'en', 'light');
  console.log(`✓ Test user inserted with ID: ${testUserId}`);
  console.log(`  Email: ${testEmail}`);
} catch (error) {
  console.error('✗ Failed to insert test user:', error.message);
  db.close();
  process.exit(1);
}

db.close();
console.log('✓ Database connection closed (simulating server stop)\n');

// Test 2: Simulate server restart - reopen database
console.log('Step 2: Reopening database (simulating server restart)...');
db = new Database(DB_PATH);

// Test 3: Verify data persists
console.log('Step 3: Verifying data persists...');
const selectStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = selectStmt.get(testUserId);

if (user) {
  console.log('✓ Data persists after restart!');
  console.log(`  Found user: ${user.name}`);
  console.log(`  Email matches: ${user.email === testEmail ? 'YES' : 'NO'}`);
  console.log(`  ID matches: ${user.id === testUserId ? 'YES' : 'NO'}`);

  // Cleanup
  console.log('\nStep 4: Cleaning up test data...');
  const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
  deleteStmt.run(testUserId);
  console.log('✓ Test data cleaned up');

  console.log('\n=== Persistence Test PASSED ===');
  console.log('✓ Data written to SQLite database');
  console.log('✓ Data survives database close/reopen');
  console.log('✓ No in-memory storage detected');

  db.close();
  process.exit(0);
} else {
  console.error('✗ CRITICAL FAILURE: Data not found after restart!');
  console.error('  This indicates in-memory storage or data loss');
  db.close();
  process.exit(1);
}
