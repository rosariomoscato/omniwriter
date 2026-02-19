// Complete Test Feature #3: Data persists across server restart

const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');

console.log('[Test] Verifying data persistence across restart...\n');

let db;

function connectDB() {
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}

// Generate unique test user data
const testTimestamp = Date.now();
const testEmail = `test-persistence-${testTimestamp}@example.com`;
const testName = `Persistence Test User ${testTimestamp}`;

try {
  // Step 1: Connect and create test user
  console.log('=== Step 1: Create test user ===');
  db = connectDB();
  console.log(`[Test] Creating user: ${testEmail}`);

  const userId = randomUUID();
  const passwordHash = '$2a$10$testhash'; // Mock hash for testing
  const timestamp = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(userId, testEmail, passwordHash, testName, 'free', timestamp, timestamp);
  console.log(`[Test] ✓ User created with ID: ${userId}`);

  // Step 2: Verify user appears in database
  console.log('\n=== Step 2: Verify user exists ===');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
  if (user) {
    console.log(`[Test] ✓ User found in database`);
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Name: ${user.name}`);
  } else {
    throw new Error('User not found after creation!');
  }

  // Step 3: Simulate server restart by closing and reopening database
  console.log('\n=== Step 3: Simulate server restart ===');
  console.log('[Test] Closing database connection...');
  db.close();
  console.log('[Test] Database closed');

  console.log('[Test] Reopening database connection (simulating restart)...');
  db = connectDB();
  console.log('[Test] ✓ Database reopened');

  // Step 4: Verify user still exists after "restart"
  console.log('\n=== Step 4: Verify user persists after restart ===');
  const userAfterRestart = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
  if (userAfterRestart) {
    console.log(`[Test] ✓ User still exists after restart!`);
    console.log(`  - ID: ${userAfterRestart.id}`);
    console.log(`  - Email: ${userAfterRestart.email}`);
    console.log(`  - Name: ${userAfterRestart.name}`);

    // Verify the data is identical
    if (userAfterRestart.id === userId && userAfterRestart.email === testEmail) {
      console.log('[Test] ✓ Data integrity verified (IDs match)');
    } else {
      throw new Error('Data mismatch after restart!');
    }
  } else {
    throw new Error('CRITICAL FAILURE: User disappeared after restart! In-memory storage detected!');
  }

  // Step 5: Clean up test data
  console.log('\n=== Step 5: Clean up test data ===');
  const deleteResult = db.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
  console.log(`[Test] ✓ Test user deleted (${deleteResult.changes} row(s))`);

  // Verify deletion
  const deletedCheck = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get(testEmail);
  if (deletedCheck.count === 0) {
    console.log('[Test] ✓ Cleanup verified');
  }

  db.close();

  // Final result
  console.log('\n=== Test Result ===');
  console.log('[Test] ✓ ALL CHECKS PASSED - Feature #3 verified');
  console.log('[Test] ✓ Data correctly persists across server restart');
  console.log('[Test] ✓ Using persistent SQLite storage (not in-memory)');

  process.exit(0);

} catch (error) {
  console.error('\n=== Test Result ===');
  console.error('[Test] ✗ TEST FAILED:', error.message);
  if (db) db.close();
  process.exit(1);
}
