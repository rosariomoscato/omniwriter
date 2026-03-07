const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@omniwriter.com');

if (admin) {
  console.log('Admin found:', admin.id, admin.email, admin.role);

  // Test password
  const isValid = bcrypt.compareSync('Admin2026!', admin.password_hash);
  console.log('Password valid:', isValid);
} else {
  console.log('Admin not found');
}

db.close();
