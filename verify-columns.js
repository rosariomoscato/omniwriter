const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

console.log('=== Users table columns ===');
const usersCols = db.prepare('PRAGMA table_info(users)').all();
usersCols.forEach(c => console.log(' -', c.name, ':', c.type));

console.log('\n=== Projects table columns ===');
const projectsCols = db.prepare('PRAGMA table_info(projects)').all();
projectsCols.forEach(c => console.log(' -', c.name, ':', c.type));

console.log('\n=== Chapters table columns ===');
const chaptersCols = db.prepare('PRAGMA table_info(chapters)').all();
chaptersCols.forEach(c => console.log(' -', c.name, ':', c.type));

db.close();
