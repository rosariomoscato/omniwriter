const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'omniwriter.db');
const Database = require('./server/node_modules/better-sqlite3');
const db = new Database(dbPath, { readonly: true });

// Check for admin user
const user = db.prepare('SELECT id, email, name, role FROM users WHERE email = ?').get('admin@omniwriter.ai');
console.log('User found:', user ? 'YES' : 'NO');
if (user) {
  console.log('User details:', JSON.stringify(user, null, 2));
} else {
  // Get all users
  const users = db.prepare('SELECT id, email, name, role FROM users LIMIT 5').all();
  console.log('Existing users:', users.length);
  if (users.length > 0) {
    console.log('First user:', JSON.stringify(users[0], null, 2));
  }
}

db.close();
