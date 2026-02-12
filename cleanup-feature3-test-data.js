#!/usr/bin/env node

/**
 * Cleanup test data for Feature #3
 */

const path = require('path');
const Database = require(path.join(__dirname, 'server', 'node_modules', 'better-sqlite3'));

const DB_PATH = path.join(__dirname, 'data', 'omniwriter.db');
const TEST_USER_EMAIL = 'persist_test_f3_12345@example.com';

console.log('Cleaning up test data for Feature #3...');

const db = new Database(DB_PATH);

// Find and delete test user
const userStmt = db.prepare('SELECT id FROM users WHERE email = ?');
const user = userStmt.get(TEST_USER_EMAIL);

if (user) {
  console.log(`Found test user: ${user.id}`);

  // Delete user (cascade will handle related records)
  const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = deleteStmt.run(user.id);

  if (result.changes > 0) {
    console.log('✓ Test user deleted successfully');
  }
} else {
  console.log('Test user not found (may already be deleted)');
}

db.close();
console.log('Cleanup complete');
