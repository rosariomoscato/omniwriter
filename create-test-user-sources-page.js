const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');
const db = new Database(dbPath);

// Create a test user for sources page testing
const email = 'test-sources@example.com';
const password = 'Password123';
const hashedPassword = bcrypt.hashSync(password, 10);
const userId = `user-${Date.now()}`;

// Check if user exists
const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existingUser) {
  console.log('User already exists:', existingUser.id);
  // Update password
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hashedPassword, email);
  console.log('Password updated');
} else {
  // Insert new user
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(userId, email, hashedPassword, 'Sources Test User', 'free', 'it', 'light');
  console.log('Test user created:', userId);
}

db.close();
console.log('Done!');
