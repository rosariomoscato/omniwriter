#!/usr/bin/env node

/**
 * Feature #3: Data persists across server restart
 *
 * This script verifies data persistence by:
 * 1. Creating test data directly in the database
 * 2. Reading it back to verify it exists
 * 3. Simulating "server restart" by closing and reopening the database connection
 * 4. Reading the data again to verify it persists
 * 5. Cleaning up test data
 */

const path = require('path');

// Require modules from server/node_modules
const Database = require(path.join(__dirname, 'server', 'node_modules', 'better-sqlite3'));
const bcrypt = require(path.join(__dirname, 'server', 'node_modules', 'bcryptjs'));
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'omniwriter.db');

// Generate unique test data
const TEST_EMAIL = `feature3-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'Feature3 Test User';

console.log('='.repeat(60));
console.log('Feature #3: Data Persists Across Server Restart');
console.log('='.repeat(60));
console.log('');

let db = null;
let userId = null;

try {
  // STEP 1: Connect to database and create test data
  console.log('STEP 1: Creating test user in database...');
  db = new Database(DB_PATH, { readonly: false });

  // Check if user table exists
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!tableCheck) {
    throw new Error('Users table does not exist!');
  }
  console.log('✓ Users table exists');

  // Hash password
  const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 10);

  // Insert test user with explicit transaction
  const insert = db.transaction(() => {
    const insertStmt = db.prepare(`
      INSERT INTO users (email, password_hash, name, role, created_at, updated_at)
      VALUES (?, ?, ?, 'free', datetime('now'), datetime('now'))
    `);
    return insertStmt.run(TEST_EMAIL, passwordHash, TEST_NAME);
  });
  const result = insert();
  userId = result.lastInsertRowid;

  // Force WAL checkpoint to ensure data is written to disk
  db.pragma('wal_checkpoint(PASSIVE)');

  console.log(`✓ Test user created with ID: ${userId}`);
  console.log(`  Email: ${TEST_EMAIL}`);
  console.log(`  Name: ${TEST_NAME}`);
  console.log('');

  // STEP 2: Verify user exists in database
  console.log('STEP 2: Verifying user exists...');
  const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = userStmt.get(userId);

  if (!user) {
    throw new Error('User not found immediately after creation!');
  }
  console.log('✓ User found in database');
  console.log(`  ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name: ${user.name}`);
  console.log(`  Role: ${user.role}`);
  console.log('');

  // STEP 3: Close database connection (simulating server shutdown)
  console.log('STEP 3: Closing database connection (simulating server shutdown)...');
  db.close();
  db = null;
  console.log('✓ Database connection closed');
  console.log('');

  // STEP 4: Reopen database (simulating server restart)
  console.log('STEP 4: Reopening database connection (simulating server restart)...');
  db = new Database(DB_PATH, { readonly: false });
  console.log('✓ Database connection reopened');
  console.log('');

  // STEP 5: Verify user still exists after "restart"
  console.log('STEP 5: Verifying user persists after "restart"...');
  const userStmt2 = db.prepare('SELECT * FROM users WHERE id = ?');
  const user2 = userStmt2.get(userId);

  if (!user2) {
    throw new Error('CRITICAL FAILURE: User not found after database restart! Data did not persist.');
  }
  console.log('✓ User still exists after database restart');
  console.log(`  ID: ${user2.id}`);
  console.log(`  Email: ${user2.email}`);
  console.log(`  Name: ${user2.name}`);
  console.log(`  Role: ${user2.role}`);
  console.log(`  Created: ${user2.created_at}`);
  console.log('');

  // Verify all fields match
  if (user2.email !== TEST_EMAIL) {
    throw new Error('Email mismatch!');
  }
  if (user2.name !== TEST_NAME) {
    throw new Error('Name mismatch!');
  }
  console.log('✓ All fields match perfectly');
  console.log('');

  // STEP 6: Clean up test data
  console.log('STEP 6: Cleaning up test data...');
  const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
  deleteStmt.run(userId);
  console.log('✓ Test user deleted');
  console.log('');

  // Verify deletion
  const verifyDelete = db.prepare('SELECT COUNT(*) as count FROM users WHERE id = ?').get(userId);
  if (verifyDelete.count !== 0) {
    throw new Error('Failed to delete test user!');
  }
  console.log('✓ Verified test user was deleted');
  console.log('');

  // Close database
  db.close();
  db = null;

  // SUCCESS!
  console.log('='.repeat(60));
  console.log('✓ FEATURE #3 VERIFICATION PASSED');
  console.log('='.repeat(60));
  console.log('');
  console.log('Summary:');
  console.log('- User created successfully');
  console.log('- User verified before "restart"');
  console.log('- Database connection closed and reopened');
  console.log('- User verified after "restart" with identical data');
  console.log('- Test data cleaned up');
  console.log('');
  console.log('✅ Data persists across server/database restart');
  console.log('');

  process.exit(0);

} catch (error) {
  console.error('');
  console.error('='.repeat(60));
  console.error('❌ FEATURE #3 VERIFICATION FAILED');
  console.error('='.repeat(60));
  console.error('');
  console.error(`Error: ${error.message}`);
  console.error(error.stack);
  console.error('');

  // Clean up on error
  if (db && userId) {
    try {
      const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
      deleteStmt.run(userId);
      console.log('Cleaned up test data after failure');
    } catch (cleanupError) {
      console.error('Failed to clean up:', cleanupError.message);
    }
  }

  if (db) {
    db.close();
  }

  process.exit(1);
}
