const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Clean up test user created during regression test
const result = db.prepare("DELETE FROM users WHERE email = 'test-persistence-1772099703@example.com'");
result.run();
console.log('Cleaned up test user:', result.changes, 'rows deleted');

db.close();
console.log('Feature 3 cleanup complete');
