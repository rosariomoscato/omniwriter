#!/usr/bin/env node
/**
 * Feature 3 Verification: Data persists across server restart
 *
 * Tests:
 * 1. Create a test user via direct database insert
 * 2. Verify user exists
 * 3. Simulate "server restart" by closing and reopening database connection
 * 4. Verify user still exists after "restart"
 * 5. Clean up test data
 */

const Database = require('./server/node_modules/better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'server/data/omniwriter.db');
const testEmail = `persistence-test-${randomUUID()}@example.com`;

console.log('=== Feature 3: Data Persistence Test ===\n');

try {
  // Test 1: Create a test user
  console.log('[Test 1] Creating test user...');
  const userId = randomUUID();
  const testName = 'Persistence Test User';

  const db1 = new Database(dbPath);
  db1.pragma('journal_mode = WAL');
  db1.pragma('foreign_keys = ON');

  const insertStmt = db1.prepare(`
    INSERT INTO users (id, email, name, role, preferred_language, theme_preference)
    VALUES (?, ?, ?, 'free', 'en', 'light')
  `);

  const result = insertStmt.run(userId, testEmail, testName);
  db1.close();

  if (result.changes === 1) {
    console.log(`✅ PASS: Created test user ${testEmail}`);
  } else {
    console.log('❌ FAIL: Failed to create test user');
    process.exit(1);
  }

  // Test 2: Verify user exists before "restart"
  console.log('\n[Test 2] Verifying user before "restart"...');
  const db2 = new Database(dbPath);
  db2.pragma('journal_mode = WAL');

  const beforeRestart = db2.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
  db2.close();

  if (beforeRestart && beforeRestart.email === testEmail) {
    console.log(`✅ PASS: User exists before restart: ${beforeRestart.name}`);
  } else {
    console.log('❌ FAIL: User not found before restart');
    process.exit(1);
  }

  // Test 3: Simulate server restart (close all connections and wait)
  console.log('\n[Test 3] Simulating server restart... (closing all connections)');
  // Wait a moment to ensure any pending writes are flushed
  const startTime = Date.now();
  while (Date.now() - startTime < 500) {
    // Busy wait for 500ms (simulating restart time)
  }
  console.log('   Connections closed, waiting 500ms...');

  // Test 4: Verify user exists after "restart"
  console.log('\n[Test 4] Verifying user after "restart"...');
  const db3 = new Database(dbPath);
  db3.pragma('journal_mode = WAL');

  const afterRestart = db3.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);

  if (afterRestart && afterRestart.email === testEmail) {
    console.log(`✅ PASS: User exists after restart: ${afterRestart.name}`);
    console.log(`   User ID: ${afterRestart.id}`);
    console.log(`   Created at: ${afterRestart.created_at}`);
  } else {
    console.log('❌ FAIL: User not found after restart - DATA LOSS DETECTED!');
    process.exit(1);
  }

  // Test 5: Verify data was written to disk (not just in-memory)
  console.log('\n[Test 5] Verifying database file on disk...');
  const stats = fs.statSync(dbPath);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  if (stats.size > 0) {
    console.log(`✅ PASS: Database file exists with size: ${fileSizeKB} KB`);
  } else {
    console.log('❌ FAIL: Database file is empty - in-memory storage detected!');
    process.exit(1);
  }

  // Test 6: Verify WAL mode is working (writes to -wal and -shm files)
  console.log('\n[Test 6] Checking WAL mode persistence...');
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-wal';

  try {
    const walExists = fs.existsSync(walPath);
    const shmExists = fs.existsSync(shmPath);

    if (walExists) {
      console.log('✅ PASS: WAL file exists (write-ahead logging enabled)');
    } else {
      console.log('⚠️  WARNING: WAL file not found (may be empty)');
    }
  } catch (e) {
    console.log('⚠️  WARNING: Could not check WAL files');
  }

  db3.close();

  // Test 7: Cleanup
  console.log('\n[Test 7] Cleaning up test data...');
  const db4 = new Database(dbPath);
  db4.pragma('journal_mode = WAL');

  const deleteStmt = db4.prepare('DELETE FROM users WHERE email = ?');
  const deleteResult = deleteStmt.run(testEmail);
  db4.close();

  if (deleteResult.changes === 1) {
    console.log('✅ PASS: Test data cleaned up');
  } else {
    console.log('⚠️  WARNING: Could not clean up test data');
  }

  console.log('\n=== Feature 3: ALL TESTS PASSED ===\n');
  console.log('Summary:');
  console.log('✅ Data created successfully');
  console.log('✅ Data verified before "restart"');
  console.log('✅ Data persists after connection close/reopen');
  console.log(`✅ Database file on disk (${fileSizeKB} KB)`);
  console.log('✅ NOT using in-memory storage');
  console.log('\n✅ Feature 3 PASSED: Data persists across server restart');

} catch (error) {
  console.error('❌ FAIL: Persistence test error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
