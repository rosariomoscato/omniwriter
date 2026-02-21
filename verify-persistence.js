const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE email = ?').get('persistence-test-20260221@example.com');
if (user) {
  console.log('SUCCESS: User found in database');
  console.log(JSON.stringify(user, null, 2));
} else {
  console.log('FAILURE: User NOT found in database');
}
db.close();
