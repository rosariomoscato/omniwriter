const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

const users = db.prepare("SELECT id, email, name FROM users LIMIT 10").all();
console.log(JSON.stringify(users, null, 2));

db.close();
