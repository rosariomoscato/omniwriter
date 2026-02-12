const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('./data/omniwriter.db');
const email = 'test-sources@example.com';
const password = 'Password123';
const hashed = bcrypt.hashSync(password, 10);
const userId = 'user-sources-' + Date.now();
const now = new Date().toISOString();
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log('User exists:', existing.id);
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hashed, email);
} else {
  db.prepare('INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(userId, email, hashed, 'Sources Test', 'free', 'it', 'light', now, now);
  console.log('Created:', userId);
}
db.close();
