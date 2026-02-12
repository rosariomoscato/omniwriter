const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data', 'omniwriter.db'));
console.log('Before:', db.pragma('foreign_keys'));
db.pragma('foreign_keys = ON');
console.log('After:', db.pragma('foreign_keys'));
db.close();
