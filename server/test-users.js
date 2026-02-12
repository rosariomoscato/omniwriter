const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/omniwriter.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath, { readonly: true });

// Check for our test user
const testUser = db.prepare("SELECT id, email, name, role FROM users WHERE email = ?").get('regression-test-1739380591@example.com');
console.log('=== TEST USER CHECK ===');
if (testUser) {
  console.log('✓ Test user found in database:');
  console.log('  ID:', testUser.id);
  console.log('  Email:', testUser.email);
  console.log('  Name:', testUser.name);
  console.log('  Role:', testUser.role);
} else {
  console.log('✗ Test user NOT found in database');
}

// Check all users
const users = db.prepare('SELECT id, email, name, role FROM users').all();
console.log('\n=== ALL USERS ===');
console.log('Total users:', users.length);
users.forEach(u => console.log('  -', u.email, '(' + u.name + ')'));

// Close database
db.close();
