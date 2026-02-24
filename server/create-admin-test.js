const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./data/omniwriter.db');

// Generate a UUID for the admin
const adminId = 'admin-test-' + Date.now();
const email = 'admin-test-351@example.com';
const password = 'Admin123!';
const hashedPassword = bcrypt.hashSync(password, 10);

// Check if admin already exists
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
if (existing) {
  console.log('Admin user already exists:', email);
  console.log('Password: Admin123!');
} else {
  // Insert admin user
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, subscription_status, preferred_language, theme_preference, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(adminId, email, hashedPassword, 'Admin Test User', 'admin', 'active', 'it', 'dark');

  console.log('Admin user created successfully!');
  console.log('Email:', email);
  console.log('Password: Admin123!');
  console.log('ID:', adminId);
}

// Verify the admin was created
const verifyUser = db.prepare("SELECT id, email, name, role FROM users WHERE email = ?").get(email);
console.log('\nVerification:', JSON.stringify(verifyUser, null, 2));
