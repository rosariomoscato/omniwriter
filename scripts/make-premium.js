// Script to update user role to premium
const Database = require('../server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/data/omniwriter.db');
const db = new Database(dbPath);

const email = process.argv[2] || 'premium257@test.com';

try {
  const result = db.prepare('UPDATE users SET role = ? WHERE email = ?').run('premium', email);
  console.log(`Updated ${result.changes} user(s) to premium`);

  const user = db.prepare('SELECT id, email, name, role FROM users WHERE email = ?').get(email);
  console.log('User:', user);
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
