const Database = require('./server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');
const db = new Database(dbPath);

// Clean up test user
const result = db.prepare("DELETE FROM users WHERE email = 'persistence-test-2026@example.com'").run();
console.log('Cleaned up test user:', result.changes, 'rows deleted');

// Also clean up any sessions for this user
db.prepare("DELETE FROM sessions WHERE user_id = 'f6508b9f-64d6-415d-8162-4e9b123deb67'").run();

db.close();
console.log('Cleanup complete');
