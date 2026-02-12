const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE email LIKE ?').get('persistence_test%@test.com');

if (user) {
  console.log('✓ TEST USER FOUND IN DATABASE:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);
  console.log('  Created at:', user.created_at);
  process.exit(0);
} else {
  console.log('✗ TEST USER NOT FOUND IN DATABASE');
  process.exit(1);
}

db.close();
