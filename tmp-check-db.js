const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'database.sqlite');
const Database = require('./server/node_modules/better-sqlite3');
const db = new Database(dbPath, { readonly: true });

// Check if database file exists
console.log('Database file exists:', fs.existsSync(dbPath) ? 'YES' : 'NO');
console.log('Database path:', dbPath);

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

db.close();
