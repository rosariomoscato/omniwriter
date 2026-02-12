// Make testuser47 an admin user
const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3/lib/database.js');
const dbPath = '/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db';
const db = new Database(dbPath);

// Update testuser47 to be admin
const result = db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', 'testuser47@example.com');

console.log('✅ Updated user testuser47@example.com to admin role');
console.log('   Changes:', result.changes);

// Verify
const user = db.prepare('SELECT id, email, name, role FROM users WHERE email = ?').get('testuser47@example.com');
console.log('\n=== User Details ===');
console.log('ID:', user.id);
console.log('Email:', user.email);
console.log('Name:', user.name);
console.log('Role:', user.role);

db.close();
