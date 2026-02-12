const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3('./data/omniwriter.db');
const email = 'feature168-sidebar@test.com';

// Check if user exists
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log('User already exists:', existing.id);
  process.exit(0);
}

// Create user
const userId = uuidv4();
const hashedPassword = bcrypt.hashSync('SidebarTest123!', 10);

db.prepare(`INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
  userId,
  email,
  hashedPassword,
  'Feature 168 Test User',
  'free',
  'it',
  'light'
);

console.log('Created user:', userId, email);
