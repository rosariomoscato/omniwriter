const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

// Clean up test user created during regression test
const result = db.prepare('DELETE FROM users WHERE email = ?').run('persistence-test-123@test.com');
console.log('Cleaned up test user:', result.changes, 'rows deleted');

// Also clean up sessions for this user (using the user ID from the test)
db.prepare('DELETE FROM sessions WHERE user_id = ?').run('637ecae0-26e5-4f1a-8aaf-e4b0d1bd3c3c');
console.log('Cleaned up sessions');

db.close();
console.log('Feature 3 cleanup complete');
