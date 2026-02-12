const Database = require('better-sqlite3');

// The database file that the server on port 5000 is actually using
const db = new Database('/Users/rosario/CODICE/omniwriter/data/omniwriter.db', { readonly: true });

const testEmail = 'test-1770918268924@example.com';
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);

if (user) {
  console.log('✓ Test user EXISTS in database that server is using');
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);
  console.log('  Created:', user.created_at);
  console.log('\n✓ Feature 3 PASSES: Data persists in the database');
  console.log('  (The user is stored in /Users/rosario/CODICE/omniwriter/data/omniwriter.db)');
  process.exit(0);
} else {
  console.log('✗ Test user NOT found in database');
  process.exit(1);
}

db.close();
