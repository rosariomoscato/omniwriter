const Database = require('better-sqlite3');
const db = new Database('data/omniwriter.db');

// Check if test user exists
const user = db.prepare("SELECT id, email, name, role FROM users WHERE email = 'regression-test-1739367872@example.com'").get();

if (user) {
  console.log('✓ Test user found in database BEFORE restart:');
  console.log('  - ID:', user.id);
  console.log('  - Email:', user.email);
  console.log('  - Name:', user.name);
  console.log('  - Role:', user.role);
} else {
  console.log('✗ Test user NOT found in database');
}

db.close();
