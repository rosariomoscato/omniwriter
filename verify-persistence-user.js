const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const user = db.prepare("SELECT id, email, name, role FROM users WHERE email = 'test-persistence-1772099703@example.com'").get();
console.log('User found:', user ? 'YES' : 'NO');
if (user) {
  console.log('User details:', JSON.stringify(user, null, 2));
}

db.close();
