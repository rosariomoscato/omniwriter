const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

const users = db.prepare('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 10').all();
console.log('Recent users in database:');
console.log(JSON.stringify(users, null, 2));
db.close();
