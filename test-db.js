const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');
const db = new Database(dbPath);

// Check users
const users = db.prepare('SELECT * FROM users').all();
console.log('Users:', users.length);
users.forEach(u => console.log('  -', u.email));

// Clean test users
const stmt = db.prepare('DELETE FROM users WHERE email LIKE ?');
const info = stmt.run('test-%');
console.log('Deleted test users:', info.changes);

// Also clean test@example.com
const stmt2 = db.prepare('DELETE FROM users WHERE email = ?');
const info2 = stmt2.run('test@example.com');
console.log('Deleted test@example.com:', info2.changes);

// Check remaining
const remaining = db.prepare('SELECT * FROM users').all();
console.log('Remaining users:', remaining.length);

// Close database
db.close();
