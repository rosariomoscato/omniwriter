const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3('./data/omniwriter.db');

// Check if user exists
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('formdefaults@test.com');
if (existing) {
  console.log('User already exists:', existing.id);
  process.exit(0);
}

// Create user
const userId = uuidv4();
const hashedPassword = bcrypt.hashSync('Password123!', 10);

db.prepare(`INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
  userId,
  'formdefaults@test.com',
  hashedPassword,
  'Form Defaults Test User',
  'free_user',
  'it',
  'light'
);

console.log('Created user:', userId);
