const Database = require('better-sqlite3');
const db = new Database('data/omniwriter.db');

// Check if test user already exists
const existing = db.prepare("SELECT * FROM users WHERE email = 'regression-test-$(date +%s)@example.com'").get();
console.log('Existing test user:', existing);

// Clean up any old test users
const result = db.prepare("DELETE FROM users WHERE email LIKE 'regression-test-%@example.com'").run();
console.log('Cleaned up', result.changes, 'old test users');

db.close();
