const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const email = 'test-persistence-1739369647@example.com';
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

if (user) {
  console.log('✅ User found in database:', user.email, user.name);
  console.log('User ID:', user.id);
  console.log('Created at:', user.created_at);
  db.close();
  process.exit(0);
} else {
  console.log('❌ User NOT found in database');
  db.close();
  process.exit(1);
}
