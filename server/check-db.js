const Database = require('better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db', { readonly: true });

console.log('=== DATABASE TABLES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log('-', t.name));

console.log('\n=== USERS TABLE COLUMNS ===');
const usersColumns = db.prepare('PRAGMA table_info(users)').all();
usersColumns.forEach(c => console.log('-', c.name, c.type));

console.log('\n=== PROJECTS TABLE COLUMNS ===');
const projectsColumns = db.prepare('PRAGMA table_info(projects)').all();
projectsColumns.forEach(c => console.log('-', c.name, c.type));

console.log('\n=== CHAPTERS TABLE COLUMNS ===');
const chaptersColumns = db.prepare('PRAGMA table_info(chapters)').all();
chaptersColumns.forEach(c => console.log('-', c.name, c.type));

console.log('\n=== FOREIGN KEYS ENABLED ===');
const fk = db.prepare('PRAGMA foreign_keys').get();
console.log('Foreign keys:', fk.foreign_keys);

db.close();
