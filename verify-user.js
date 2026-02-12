const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

const user = db.prepare('SELECT email, name FROM users WHERE email = ?').get('persistence-test-final@example.com');

if (user) {
  console.log('✓ User exists BEFORE restart');
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);
} else {
  console.log('✗ User NOT found');
}

db.close();
