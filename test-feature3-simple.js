// Simple Feature 3 test: Create user, restart server, verify user still exists
const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Generate unique test user
const timestamp = Date.now();
const testEmail = `test_feature3_${timestamp}@example.com`;
const testPassword = 'TestPass123!';
const userId = `user_test_${timestamp}`;
const passwordHash = bcrypt.hashSync(testPassword, 10);

console.log('=== Creating Test User ===');
console.log('Email:', testEmail);
console.log('User ID:', userId);

// Create test user
try {
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, storage_used_bytes, storage_limit_bytes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(userId, testEmail, passwordHash, 'Feature3 Test User', 'free_user', 'it', 'light', 0, 104857600);

  console.log('✓ Test user created successfully');
} catch(e) {
  console.log('✗ Error:', e.message);
  process.exit(1);
}

// Verify user exists
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
if (user) {
  console.log('✓ User verified in database');
  console.log('  - Name:', user.name);
  console.log('  - Email:', user.email);
  console.log('  - Created:', user.created_at);
} else {
  console.log('✗ User not found after creation!');
  process.exit(1);
}

// Save test data for verification after restart
const testData = { email: testEmail, userId: userId, password: testPassword };
fs.writeFileSync('/tmp/feature3_test_data.json', JSON.stringify(testData, null, 2));
console.log('\n✓ Test data saved to /tmp/feature3_test_data.json');
console.log('\n=== NEXT STEPS ===');
console.log('1. Stop server: kill -9 $(lsof -ti :3001)');
console.log('2. Start server: ./server/node_modules/.bin/tsx server/src/index.ts');
console.log('3. Run verification: node verify-persistence-user.js');

db.close();
