const Database = require('better-sqlite3');

const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Promote test user to admin
db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run('marketplacetest@example.com');

const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get('marketplacetest@example.com');
console.log('User promoted to admin:', user);

db.close();
