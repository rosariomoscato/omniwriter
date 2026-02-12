const Database = require('better-sqlite3');
const db = new Database('./server/data/omniwriter.db', { readonly: true });
console.log('✓ Database connection successful');

const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table"').all();
console.log('✓ Tables found:', tables.length);
console.log('  Tables:', tables.map(t => t.name).join(', '));

db.close();
