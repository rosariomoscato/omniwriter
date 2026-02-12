const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/database.sqlite');
const user = db.prepare('SELECT * FROM users WHERE email = ?').get('test@example.com');
if (user) {
  console.log(JSON.stringify(user));
} else {
  console.log('User not found - need to create one');
}
