const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');
const result = db.prepare("DELETE FROM users WHERE email = ?").run("regression-test-12345@example.com");
console.log("Deleted", result.changes, "test user(s)");
db.close();
