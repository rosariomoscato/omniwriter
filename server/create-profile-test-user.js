const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'data/omniwriter.db');
const db = new Database(dbPath);

// Create test user
const userId = uuidv4();
const email = 'profile-test-37-38@example.com';
const password = 'Test1234';
const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync(password, salt);

// Check if user exists
const existing = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
if (existing) {
  console.log('User already exists:', existing.email);
  console.log('Login with:', email, '/', password);
} else {
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, bio, avatar_url, role, preferred_language, theme_preference, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(userId, email, passwordHash, 'Profile Test User', 'Test bio for feature #37 and #38', 'https://via.placeholder.com/150', 'free', 'it', 'light');

  console.log('Test user created:');
  console.log('  Email:', email);
  console.log('  Password:', password);
  console.log('  User ID:', userId);
}

db.close();
