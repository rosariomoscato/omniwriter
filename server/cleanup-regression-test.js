const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');
// Delete test user
const result = db.prepare('DELETE FROM users WHERE email = ?').run('regression-test-20260212-2224@example.com');
console.log('Deleted test user:', result.changes, 'rows affected');
db.close();
