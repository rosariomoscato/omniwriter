const Database = require('better-sqlite3');
const db = new Database('./data/omniwriter.db');
const users = db.prepare('SELECT id, email, name FROM users LIMIT 5').all();
console.log('Users:', JSON.stringify(users, null, 2));
