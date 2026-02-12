const Database = require('better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

// List all tables
const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name').all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Check for test user
const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get('test-schema-verify@example.com');
console.log('Test user exists:', !!user, user ? user.email : 'not found');

db.close();
