const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./data/omniwriter.db');

const users = db.prepare('SELECT id, email, name FROM users LIMIT 5').all();
console.log(JSON.stringify(users, null, 2));

db.close();
