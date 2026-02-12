const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./data/omniwriter.db');

// Delete regression test users
const result = db.prepare("DELETE FROM users WHERE email LIKE 'regression-%@test.omniwriter'").run();
console.log('Cleaned up', result.changes, 'regression test users');

db.close();
