const Database = require('better-sqlite3');
const db = new Database('./data/omniwriter.db');
const users = db.prepare('SELECT id, email, role FROM users').all();
console.log('Users in database:');
console.log(JSON.stringify(users, null, 2));
db.close();
