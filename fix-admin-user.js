const bcrypt = require('/Users/rosario/CODICE/omniwriter/server/node_modules/bcryptjs/index.js');
const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3/lib/database.js');
const crypto = require('crypto');

// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

console.log('Checking users...');

// Check admin user
const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get('admin77@example.com');

if (adminUser) {
  console.log('Found admin user:', adminUser);
  if (!adminUser.id || adminUser.id === '' || adminUser.id === 'null') {
    console.log('Fixing admin user ID...');
    const newId = uuidv4();
    db.prepare('UPDATE users SET id = ? WHERE email = ?').run(newId, 'admin77@example.com');
    console.log('Admin user ID updated to:', newId);
  } else {
    console.log('Admin user ID is OK:', adminUser.id);
  }
} else {
  console.log('Creating new admin user...');
  const adminId = uuidv4();
  const passwordHash = bcrypt.hashSync('Admin77!', 10);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, subscription_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin77@example.com', passwordHash, 'Admin User 77', 'admin', 'active');
  console.log('Admin user created with ID:', adminId);
}

// Check test user
const testUser = db.prepare('SELECT * FROM users WHERE email = ?').get('testuser@omniwriter.com');

if (testUser) {
  console.log('Found test user:', testUser);
  if (!testUser.id || testUser.id === '' || testUser.id === 'null') {
    console.log('Fixing test user ID...');
    const newId = uuidv4();
    db.prepare('UPDATE users SET id = ? WHERE email = ?').run(newId, 'testuser@omniwriter.com');
    console.log('Test user ID updated to:', newId);
  }
} else {
  console.log('Creating test user...');
  const testId = uuidv4();
  const testPasswordHash = bcrypt.hashSync('TestUser123!', 10);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, subscription_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(testId, 'testuser@omniwriter.com', testPasswordHash, 'Test User', 'free', 'active');
  console.log('Test user created with ID:', testId);
}

// List all users
console.log('\n--- All Users ---');
const users = db.prepare('SELECT id, email, name, role, subscription_status FROM users ORDER BY created_at DESC LIMIT 10').all();
users.forEach(user => {
  console.log(`- ${user.email}`);
  console.log(`  ID: ${user.id}`);
  console.log(`  Role: ${user.role}, Status: ${user.subscription_status}`);
});

db.close();
