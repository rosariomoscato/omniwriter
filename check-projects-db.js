const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('server/data/omniwriter.db');

// Check projects
const projects = db.prepare('SELECT * FROM projects LIMIT 10').all();
console.log('=== PROJECTS IN DATABASE ===');
console.log(JSON.stringify(projects, null, 2));

// Check users
const users = db.prepare('SELECT id, email, name FROM users LIMIT 5').all();
console.log('\n=== USERS IN DATABASE ===');
console.log(JSON.stringify(users, null, 2));

db.close();
