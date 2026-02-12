const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

const user = db.prepare('SELECT email, password_hash FROM users WHERE email = ?').get('regression-test-1770917643@example.com');

if (user) {
  console.log('✓ User exists in database after restart!');
  console.log('  Email:', user.email);
  console.log('  Has password hash:', !!user.password_hash);
  process.exit(0);
} else {
  console.log('✗ User NOT found in database - DATA LOSS!');
  process.exit(1);
}

db.close();
