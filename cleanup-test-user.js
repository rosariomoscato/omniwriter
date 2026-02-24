const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

// Clean up test user created during regression test
const result = db.prepare('DELETE FROM users WHERE email = ?').run('persist-test-2026@example.com');
console.log('Cleaned up test user:', result.changes, 'rows deleted');

db.close();
