const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');
const db = new Database(dbPath, { readonly: true });

// Check users
const users = db.prepare('SELECT * FROM users').all();
console.log('Users:', users.length);

// Close database
db.close();
