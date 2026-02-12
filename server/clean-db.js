const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/omniwriter.db');
console.log('Cleaning database at:', dbPath);

const db = new Database(dbPath);

// Delete test users
const deleteStmt = db.prepare("DELETE FROM users WHERE email LIKE '%example.com'");
const result = deleteStmt.run();
console.log('Deleted', result.changes, 'test users');

db.close();
