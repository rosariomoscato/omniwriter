const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/omniwriter.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath, { readonly: true });

// Check users
const users = db.prepare('SELECT id, email, name, role FROM users').all();
console.log('Users count:', users.length);
console.log('Users:', JSON.stringify(users, null, 2));

// Close database
db.close();
