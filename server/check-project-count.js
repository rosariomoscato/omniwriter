const Database = require('better-sqlite3');
const db = new Database('server/data/omniwriter.db');
const count = db.prepare('SELECT COUNT(*) as count FROM projects').get();
console.log('Current project count:', count.count);
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('Current user count:', userCount.count);
db.close();
