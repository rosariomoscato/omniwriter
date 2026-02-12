const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');
const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE email = ?').get('regression-test-20260212-2224@example.com');
console.log(JSON.stringify(user || null, null, 2));
db.close();
