const Database = require('./server/node_modules/better-sqlite3');
const bcrypt = require('./server/node_modules/bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const db = new Database(dbPath);

const email = `regression-${Date.now()}@test.omniwriter`;
const password = 'Test123456!';
const hashedPassword = bcrypt.hashSync(password, 10);

// Check if user exists
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log('User already exists, deleting...');
  db.prepare('DELETE FROM users WHERE email = ?').run(email);
}

// Create user
const userId = `regression-test-${Date.now()}`;
const now = new Date().toISOString();

db.prepare(`
  INSERT INTO users (id, email, password_hash, name, role, subscription_status, preferred_language, theme_preference, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(userId, email, hashedPassword, 'Regression Test User', 'free', 'active', 'en', 'light', now, now);

console.log('Created user via DB:', email);
console.log('User ID:', userId);
console.log('Password:', password);

// Save for verification
require('fs').writeFileSync('./regression-test-user.json', JSON.stringify({ email, password, userId }));
console.log('Saved to ./regression-test-user.json');

// Verify immediately
const checkUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
console.log('\nImmediate verification:');
console.log('  User exists:', !!checkUser);
console.log('  Email matches:', checkUser?.email === email);

db.close();
