// Create a new admin user with known password
const bcrypt = require('/Users/rosario/CODICE/omniwriter/server/node_modules/bcryptjs/index.js');
const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3/lib/database.js');
const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

const email = 'admin77@example.com';
const password = 'Admin77!';
const name = 'Admin User 77';
const hashedPassword = bcrypt.hashSync(password, 10);

try {
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, role, subscription_status, preferred_language, theme_preference)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(email, hashedPassword, name, 'admin', 'active', 'it', 'light');

  console.log('✅ Created admin user:');
  console.log('   Email:', email);
  console.log('   Password:', password);
  console.log('   Role: admin');
  console.log('   User ID:', result.lastInsertRowid);
} catch (error) {
  if (error.message.includes('UNIQUE')) {
    console.log('User already exists, updating to admin...');
    db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', email);
    console.log('✅ Updated user to admin role:', email);
  } else {
    console.error('Error:', error.message);
  }
}

db.close();
