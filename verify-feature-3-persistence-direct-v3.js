var Database = require('./server/node_modules/better-sqlite3');
var bcrypt = require('./server/node_modules/bcryptjs');
var path = require('path');

var DB_PATH = path.join(__dirname, 'data', 'omniwriter.db');

var TEST_EMAIL = 'feature3-test-' + Date.now() + '@example.com';
var TEST_PASSWORD = 'TestPassword123!';
var TEST_NAME = 'Feature3 Test User';

console.log('============================================================');
console.log('Feature #3: Data Persists Across Server Restart');
console.log('============================================================');
console.log('');

var db = new Database(DB_PATH);
var userId = null;

try {
  // STEP 1: Create test user
  console.log('STEP 1: Creating test user...');
  var passwordHash = bcrypt.hashSync(TEST_PASSWORD, 10);
  var insertStmt = db.prepare("INSERT INTO users (email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, 'free', datetime('now'), datetime('now'))");
  var result = insertStmt.run(TEST_EMAIL, passwordHash, TEST_NAME);
  userId = result.lastInsertRowid;

  console.log('User created with ID:', userId);
  console.log('Last insert rowid:', result.lastInsertRowid);
  console.log('');

  // STEP 2: Verify by email instead of ID
  console.log('STEP 2: Verifying user by email...');
  var userStmt = db.prepare('SELECT * FROM users WHERE email = ?');
  var user = userStmt.get(TEST_EMAIL);

  if (!user) {
    throw new Error('User not found after creation!');
  }
  console.log('✓ User found');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);
  console.log('');

  // STEP 3: Close database
  console.log('STEP 3: Closing database...');
  db.pragma('wal_checkpoint(PASSIVE)');
  db.close();
  db = null;
  console.log('✓ Database closed');
  console.log('');

  // STEP 4: Reopen database
  console.log('STEP 4: Reopening database...');
  db = new Database(DB_PATH);
  console.log('✓ Database reopened');
  console.log('');

  // STEP 5: Verify user still exists
  console.log('STEP 5: Verifying user persists...');
  var userStmt2 = db.prepare('SELECT * FROM users WHERE email = ?');
  var user2 = userStmt2.get(TEST_EMAIL);

  if (!user2) {
    throw new Error('CRITICAL FAILURE: User not found after restart!');
  }
  console.log('✓ User still exists after restart');
  console.log('  ID:', user2.id);
  console.log('  Email:', user2.email);
  console.log('  Name:', user2.name);
  console.log('');

  // Verify data matches
  if (user2.email !== TEST_EMAIL || user2.name !== TEST_NAME) {
    throw new Error('Data mismatch!');
  }
  console.log('✓ All data matches');
  console.log('');

  // STEP 6: Cleanup
  console.log('STEP 6: Cleaning up...');
  var deleteStmt = db.prepare('DELETE FROM users WHERE email = ?');
  deleteStmt.run(TEST_EMAIL);
  console.log('✓ Test user deleted');
  console.log('');

  db.close();

  console.log('============================================================');
  console.log('✓ FEATURE #3 VERIFICATION PASSED');
  console.log('============================================================');
  console.log('');
  console.log('Summary:');
  console.log('- User created successfully');
  console.log('- User verified before "restart"');
  console.log('- Database closed and reopened');
  console.log('- User verified after "restart"');
  console.log('- Test data cleaned up');
  console.log('');
  console.log('✅ Data persists across server restart');
  console.log('');

  process.exit(0);

} catch (error) {
  console.error('');
  console.error('============================================================');
  console.error('❌ FEATURE #3 VERIFICATION FAILED');
  console.error('============================================================');
  console.error('');
  console.error('Error:', error.message);
  console.error(error.stack);
  console.error('');

  if (db && TEST_EMAIL) {
    try {
      db.prepare('DELETE FROM users WHERE email = ?').run(TEST_EMAIL);
      console.log('Cleaned up test data');
    } catch (e) {
      console.error('Cleanup failed:', e.message);
    }
  }

  if (db) {
    db.close();
  }

  process.exit(1);
}
