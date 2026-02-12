const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const bcrypt = require('/Users/rosario/CODICE/omniwriter/server/node_modules/bcryptjs');
const { v4: uuidv4 } = require('/Users/rosario/CODICE/omniwriter/server/node_modules/uuid');

const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

console.log('=== Testing Data Persistence ===\n');

// Generate unique test user email
const testTimestamp = Date.now();
const testEmail = `regression-test-${testTimestamp}@example.com`;
const testUserId = uuidv4();
const hashedPassword = bcrypt.hashSync('TestPassword123!', 10);

// Create test user
const insertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, name)
  VALUES (?, ?, ?, ?)
`);

try {
  const result = insertUser.run(testUserId, testEmail, hashedPassword, 'Regression Test User');
  console.log('✓ Test user created:', result.changes > 0 ? 'SUCCESS' : 'FAILED');
  console.log('  User ID:', testUserId);
  console.log('  Email:', testEmail);
} catch (error) {
  console.log('✗ Failed to create test user:', error.message);
  db.close();
  process.exit(1);
}

// Verify user exists in database
const findUser = db.prepare('SELECT * FROM users WHERE id = ?');
const user = findUser.get(testUserId);
if (user) {
  console.log('✓ User immediately retrievable from database');
  console.log('  Found:', user.email);
} else {
  console.log('✗ User NOT found immediately after creation');
  db.close();
  process.exit(1);
}

// Simulate "server restart" by reopening database connection
console.log('\n--- Simulating Server Restart ---');
db.close();

const db2 = new Database(dbPath);
const findUser2 = db2.prepare('SELECT * FROM users WHERE id = ?');
const userAfterRestart = findUser2.get(testUserId);

if (userAfterRestart) {
  console.log('✓ User still exists after "restart"');
  console.log('  Found:', userAfterRestart.email);
  console.log('  Created at:', userAfterRestart.created_at);

  // Clean up test data
  const deleteUser = db2.prepare('DELETE FROM users WHERE id = ?');
  deleteUser.run(testUserId);
  console.log('\n✓ Test data cleaned up');

  db2.close();
  console.log('\n=== Feature 3: DATA PERSISTS - PASS ===');
  process.exit(0);
} else {
  console.log('✗ USER LOST after "restart" - CRITICAL FAILURE');
  console.log('  This indicates in-memory storage instead of persistent database');
  db2.close();
  console.log('\n=== Feature 3: DATA PERSISTS - FAIL ===');
  process.exit(1);
}
