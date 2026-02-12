const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('server/data/omniwriter.db', { readonly: true });
const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE email = ?').get('test-db-schema@example.com');
if (user) {
  console.log('USER_FOUND:' + JSON.stringify(user));
} else {
  console.log('USER_NOT_FOUND');
}
db.close();
