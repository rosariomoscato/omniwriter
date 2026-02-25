var Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
var db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Update the test user to premium
var result = db.prepare("UPDATE users SET role='premium' WHERE email='free-tier-test-384@example.com'").run();
console.log('Updated rows:', result.changes);

// Verify the update
var user = db.prepare("SELECT id, email, name, role FROM users WHERE email='free-tier-test-384@example.com'").get();
console.log('User after update:', user);

db.close();
