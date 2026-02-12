// Test script for Feature 3: Data Persistence Regression Test
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

console.log('[Test] Testing Feature 3: Data persists across server restart\n');

try {
  const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
  const db = new Database(dbPath);

  // Generate unique test email
  const testEmail = `regression-test-${Date.now()}@omniwriter.test`;
  const testPassword = 'TestPassword123!';
  const testName = 'Regression Test User';

  // Step 1: Create a test user
  console.log('[Step 1] Creating test user...');
  const passwordHash = crypto.createHash('sha256').update(testPassword).digest('hex');

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, ?, 'free', datetime('now'), datetime('now'))
  `);

  const result = insertUser.run(testEmail, passwordHash, testName);
  console.log(`[Step 1] ✓ Test user created with ID: ${result.lastInsertRowid}`);

  // Step 2: Verify user exists in database
  console.log('[Step 2] Verifying user exists in database...');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);

  if (!user) {
    console.log('[Step 2] ✗ User not found in database!');
    process.exit(1);
  }
  console.log(`[Step 2] ✓ User found: ${user.name} (${user.email})`);

  // Step 3: Simulate "server restart" by reopening database connection
  console.log('[Step 3] Simulating server restart (closing and reopening database)...');
  db.close();

  // Wait a moment to simulate restart time
  const startTime = Date.now();
  while (Date.now() - startTime < 100) {
    // Small delay
  }

  // Reopen database (simulating fresh server start)
  const db2 = new Database(dbPath);
  console.log('[Step 3] ✓ Database reopened');

  // Step 4: Verify user still exists after "restart"
  console.log('[Step 4] Verifying user still exists after restart...');
  const userAfterRestart = db2.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);

  if (!userAfterRestart) {
    console.log('[Step 4] ✗ CRITICAL FAILURE: User not found after restart!');
    console.log('[Step 4] ✗ This indicates in-memory storage or data loss!');
    process.exit(1);
  }
  console.log(`[Step 4] ✓ User still exists after restart: ${userAfterRestart.name} (${userAfterRestart.email})`);

  // Step 5: Verify user data integrity
  console.log('[Step 5] Verifying user data integrity...');
  if (userAfterRestart.name !== testName || userAfterRestart.email !== testEmail) {
    console.log('[Step 5] ✗ User data corrupted!');
    process.exit(1);
  }
  console.log('[Step 5] ✓ User data integrity verified');

  // Step 6: Clean up test data
  console.log('[Step 6] Cleaning up test data...');
  const deleteResult = db2.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
  console.log(`[Step 6] ✓ Test data cleaned up (${deleteResult.changes} row(s) deleted)`);

  db2.close();

  console.log('\n[Summary] All Feature 3 verification steps PASSED ✓');
  console.log('- User creation works');
  console.log('- User persists across database connection restart');
  console.log('- Data integrity maintained');
  console.log('- Database file storage confirmed (NOT in-memory)');

  process.exit(0);

} catch (error) {
  console.error('[Error] Persistence test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
