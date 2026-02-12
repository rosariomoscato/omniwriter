const Database = require('./server/node_modules/better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'omniwriter.db');
const db = new Database(dbPath);

// Delete test users if they exist
db.prepare('DELETE FROM users WHERE email LIKE ?').run('%test158%@example.com');

// Create free user
const freeUserId = 'free-test-158-' + Date.now();
const freeHash = bcrypt.hashSync('Test1234!', 10);
db.prepare('INSERT INTO users (id, email, password_hash, name, role, subscription_status, preferred_language, theme_preference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
  .run(freeUserId, 'free-test-158@example.com', freeHash, 'Free Test User 158', 'free', 'active', 'it', 'light');

// Create premium user
const premUserId = 'prem-test-158-' + Date.now();
const premHash = bcrypt.hashSync('Test1234!', 10);
db.prepare('INSERT INTO users (id, email, password_hash, name, role, subscription_status, preferred_language, theme_preference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
  .run(premUserId, 'prem-test-158@example.com', premHash, 'Premium Test User 158', 'premium', 'active', 'it', 'light');

console.log('Created test users:');
console.log('Free user: free-test-158@example.com / Test1234!');
console.log('Premium user: prem-test-158@example.com / Test1234!');
db.close();
