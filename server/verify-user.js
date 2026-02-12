const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

// Check for our test user
const user = db.prepare('SELECT * FROM users WHERE email = ?').get('test-1770918268924@example.com');

if (user) {
  console.log('✓ Test user found in database:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);
  console.log('  Created at:', user.created_at);
  process.exit(0);
} else {
  console.log('✗ Test user NOT found in database');
  process.exit(1);
}

db.close();
