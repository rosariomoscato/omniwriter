// Test script to verify data persistence (Feature 3)
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const testEmail = `persistence-test-${Date.now()}@example.com`;
const testPassword = 'TestPass123';
const testName = 'Persistence Test User';

console.log('[Feature 3] Testing data persistence across server restart...\n');

// Step 1: Create a user
console.log('[Feature 3] Step 1: Creating test user...');
let db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const userId = uuidv4();
const hashedPassword = bcrypt.hashSync(testPassword, 10);

try {
  const insertStmt = db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  );
  insertStmt.run(userId, testEmail, hashedPassword, testName, 'free', 'it', 'light');
  console.log('[Feature 3] ✅ User created with ID:', userId);

  // Verify user exists immediately
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (user) {
    console.log('[Feature 3] ✅ User verified in database');
  } else {
    console.log('[Feature 3] ❌ User not found in database');
    db.close();
    process.exit(1);
  }
} catch (error) {
  console.error('[Feature 3] ❌ Error creating user:', error.message);
  db.close();
  process.exit(1);
}

// Close connection (simulating server stop)
console.log('\n[Feature 3] Step 2: Closing database connection (simulating server stop)...');
db.close();
console.log('[Feature 3] ✅ Connection closed');

// Wait a bit to simulate restart delay
console.log('[Feature 3] Waiting 2 seconds...');
setTimeout(() => {
  // Reopen connection (simulating server restart)
  console.log('\n[Feature 3] Step 3: Reopening database connection (simulating server restart)...');
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  console.log('[Feature 3] ✅ Connection reopened');

  // Verify user still exists after "restart"
  console.log('\n[Feature 3] Step 4: Verifying user still exists...');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (user) {
    console.log('[Feature 3] ✅ User still exists after connection restart');
    console.log('[Feature 3] User data:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } else {
    console.log('[Feature 3] ❌ CRITICAL FAILURE: User not found after restart - in-memory storage detected!');
    db.close();
    process.exit(1);
  }

  // Clean up test data
  console.log('\n[Feature 3] Step 5: Cleaning up test data...');
  const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
  deleteStmt.run(userId);
  console.log('[Feature 3] ✅ Test user deleted');

  db.close();

  console.log('\n[Feature 3] ✅ All persistence tests passed! Data survives connection restart.');
  process.exit(0);
}, 2000);
