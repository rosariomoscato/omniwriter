const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Get a user with a known password hash
const user = db.prepare('SELECT email, name FROM users LIMIT 1').get();
console.log(JSON.stringify(user, null, 2));
