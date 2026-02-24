const Database = require('better-sqlite3');
const db = new Database('./data/omniwriter.db');

// Check for admin users
const admins = db.prepare("SELECT id, email, name, role FROM users WHERE role = 'admin'").all();
console.log('Admin users:', JSON.stringify(admins, null, 2));

// Check total users
const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('\nTotal users:', totalUsers.count);

// Check for any user to test with
const anyUser = db.prepare('SELECT id, email, name, role FROM users LIMIT 1').get();
console.log('\nFirst user for testing:', JSON.stringify(anyUser, null, 2));
