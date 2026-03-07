const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const adminEmail = 'admin@omniwriter.com';
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);

if (!existingAdmin) {
  console.log('Creating admin user...');
  const adminId = uuidv4();
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Admin2026!', salt);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, preferred_language, theme_preference, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'admin', 'it', 'light', datetime('now'), datetime('now'))`
  ).run(adminId, adminEmail, passwordHash, 'Admin');

  console.log('Admin user created: admin@omniwriter.com / Admin2026!');
} else {
  console.log('Admin user already exists');
}

db.close();
