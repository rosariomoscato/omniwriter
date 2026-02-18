const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

try {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Generate unique test email
  const testEmail = `test-persistence-${Date.now()}@example.com`;
  const testUserId = uuidv4();
  const timestamp = new Date().toISOString();

  console.log('=== CREATING TEST USER ===');
  console.log(`Email: ${testEmail}`);
  console.log(`User ID: ${testUserId}`);

  // Create test user
  const insert = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    testUserId,
    testEmail,
    '$2a$10$testhash',
    'Persistence Test User',
    'free',
    timestamp,
    timestamp
  );

  console.log('✅ Test user created');

  // Verify user exists
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
  if (user) {
    console.log('✅ User verified in database');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Created: ${user.created_at}`);
  } else {
    console.log('❌ USER NOT FOUND - CRITICAL FAILURE');
    process.exit(1);
  }

  console.log('\n=== PERSISTENCE TEST PART 1 COMPLETE ===');
  console.log('User created and verified. Database file:', dbPath);
  console.log('\nNext steps for manual verification:');
  console.log('1. Stop all node processes');
  console.log('2. Run this script again');
  console.log('3. Verify the test user still exists');

} catch (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
} finally {
  db.close();
}
