/**
 * Check if test user exists and create if not
 */
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('crypto');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');
const db = new Database(dbPath);

console.log('Checking for test user...');

const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get('test@example.com');

if (existingUser) {
  console.log('✅ Test user exists:', existingUser.email);
  console.log('   Role:', existingUser.role);
  console.log('   Theme preference:', existingUser.theme_preference);
} else {
  console.log('Creating test user...');

  const userId = uuidv4();
  const hashedPassword = bcrypt.hashSync('Password123!', 10);

  const insert = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(userId, 'test@example.com', hashedPassword, 'Test User', 'free', 'it', 'light');

  console.log('✅ Test user created:');
  console.log('   Email: test@example.com');
  console.log('   Password: Password123!');
  console.log('   Role: free');
  console.log('   Theme preference: light');
}

db.close();
