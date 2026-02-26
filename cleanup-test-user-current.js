const Database = require('./server/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'omniwriter.db');
const db = new Database(dbPath);

// Clean up test user
const result = db.prepare("DELETE FROM users WHERE email = 'persistence-test-1772105490@example.com'").run();
console.log('Cleaned up test user:', result.changes, 'rows deleted');

// Also clean up any sessions for this user
db.prepare("DELETE FROM sessions WHERE user_id = 'ed180e37-f43b-4975-9d78-bf8b5f6478cb'").run();

db.close();
console.log('Cleanup complete');
