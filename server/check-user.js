const Database = require('better-sqlite3');

const db = new Database('./data/omniwriter.db');
const user = db.prepare('SELECT id, email, name, role FROM users WHERE email = ?').get('test@omniwriter.com');

console.log('Utente nel database:');
console.log(JSON.stringify(user, null, 2));
db.close();
