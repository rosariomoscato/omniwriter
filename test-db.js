const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');
const db = new Database(dbPath);

// Check users with test-18 in email
const users = db.prepare('SELECT email FROM users WHERE email LIKE ?').all('%test-18%');
console.log('Users with test-18 in email:');
users.forEach(u => console.log('  -', u.email));

// Check all users
const allUsers = db.prepare('SELECT email FROM users').all();
console.log('\nAll users in database:');
allUsers.forEach(u => console.log('  -', u.email));

// Close database
db.close();
