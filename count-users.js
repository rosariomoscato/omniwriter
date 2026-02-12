const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

const count = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('Total users in database:', count.count);

const users = db.prepare('SELECT email, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();
console.log('\nLast 5 users:');
users.forEach(u => console.log(`  - ${u.email} (${u.created_at})`));

db.close();
