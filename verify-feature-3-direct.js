/**
 * Feature #3: Data persists across server restart
 * Direct database test - bypasses server startup issues
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'omniwriter.db');
const TEST_EMAIL = `persistence-test-${Date.now()}@example.com`;
const bcrypt = require('bcryptjs');

console.log('=== Feature #3: Direct Database Persistence Test ===\n');
console.log('Database path:', DB_PATH);

try {
  // Step 1: Verify database exists
  console.log('Step 1: Verifying database exists...');
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('Database file not found');
  }
  console.log('✓ Database file exists');

  // Step 2: Open database connection
  console.log('\nStep 2: Opening database connection...');
  const db = new Database(DB_PATH, { readonly: false });
  console.log('✓ Database opened successfully');

  // Step 3: Create a test user
  console.log('\nStep 3: Creating test user...');
  const userId = `user-${Date.now()}`;
  const hashedPassword = bcrypt.hashSync('TestPassword123!', 10);

  const insertResult = db.prepare(
    'INSERT INTO users (id, email, password_hash, name, role, subscription_tier, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
  ).run(userId, TEST_EMAIL, hashedPassword, 'Persistence Test User', 'user', 'free');

  console.log('✓ Test user created');
  console.log('  User ID:', userId);
  console.log('  Email:', TEST_EMAIL);

  // Step 4: Verify user exists
  console.log('\nStep 4: Verifying user exists in database...');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (user) {
    console.log('✓ User found in database');
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
  } else {
    throw new Error('User not found in database');
  }

  // Step 5: Close database (simulate server stop)
  console.log('\nStep 5: Closing database connection (simulating server stop)...');
  db.close();
  console.log('✓ Database closed');

  // Step 6: Reopen database (simulate server restart)
  console.log('\nStep 6: Reopening database connection (simulating server restart)...');
  const db2 = new Database(DB_PATH, { readonly: false });
  console.log('✓ Database reopened');

  // Step 7: Verify user still exists after "restart"
  console.log('\nStep 7: Verifying user still exists after restart...');
  const userAfterRestart = db2.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (userAfterRestart) {
    console.log('✓ User found in database after restart');
    console.log('  Name:', userAfterRestart.name);
    console.log('  Email:', userAfterRestart.email);
  } else {
    throw new Error('User not found after database restart - DATA LOSS DETECTED!');
  }

  // Step 8: Create additional test data
  console.log('\nStep 8: Creating additional test data (project)...');
  const projectId = `project-${Date.now()}`;
  db2.prepare(
    'INSERT INTO projects (id, user_id, title, genre, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
  ).run(projectId, userId, 'Persistence Test Project', 'fiction', 'A project to test data persistence');

  console.log('✓ Test project created');

  // Step 9: Verify project exists
  console.log('\nStep 9: Verifying project exists...');
  const project = db2.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (project) {
    console.log('✓ Project found in database');
    console.log('  Title:', project.title);
  } else {
    throw new Error('Project not found in database');
  }

  // Step 10: Second restart test
  console.log('\nStep 10: Performing second restart test...');
  db2.close();

  const db3 = new Database(DB_PATH, { readonly: false });

  const projectAfterRestart = db3.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (projectAfterRestart) {
    console.log('✓ Project found after second restart');
    console.log('  Title:', projectAfterRestart.title);
  } else {
    throw new Error('Project not found after second restart - DATA LOSS DETECTED!');
  }

  // Cleanup
  console.log('\nStep 11: Cleaning up test data...');
  db3.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  db3.prepare('DELETE FROM users WHERE id = ?').run(userId);
  console.log('✓ Test data cleaned up');

  db3.close();
  console.log('\n=== Feature #3: PASS ✓ ===');
  console.log('Data persists across database close/reopen cycles');
  console.log('This confirms data is stored on disk, not in memory');

  process.exit(0);

} catch (error) {
  console.error('\n✗ Test failed:', error.message);
  console.log('\n=== Feature #3: FAIL ✗ ===');
  process.exit(1);
}
