const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'database.sqlite');
const db = new Database(dbPath);

const email = 'test89@example.com';
const password = 'password123';
const hashedPassword = bcrypt.hashSync(password, 10);

// Check if user exists
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log('User already exists, deleting...');
  db.prepare('DELETE FROM users WHERE email = ?').run(email);
}

// Create user
const userId = 'test-user-' + Date.now();
db.prepare(`
  INSERT INTO users (id, email, password_hash, name, role, subscription_status, preferred_language, theme_preference, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`).run(userId, email, hashedPassword, 'Feature 89 Test', 'premium', 'active', 'it', 'light');

console.log('Created user:', email, 'with password:', password);
console.log('User ID:', userId);

db.close();
