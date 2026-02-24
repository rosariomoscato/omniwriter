const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:', tables.length);
console.log('Table names:', tables.map(t => t.name).join(', '));

// Check key columns on users table
console.log('\nUsers table columns:');
const usersCols = db.prepare("PRAGMA table_info(users)").all();
usersCols.forEach(col => console.log(`  ${col.name} (${col.type})`));

// Check key columns on projects table
console.log('\nProjects table columns:');
const projectsCols = db.prepare("PRAGMA table_info(projects)").all();
projectsCols.forEach(col => console.log(`  ${col.name} (${col.type})`));

// Check key columns on chapters table
console.log('\nChapters table columns:');
const chaptersCols = db.prepare("PRAGMA table_info(chapters)").all();
chaptersCols.forEach(col => console.log(`  ${col.name} (${col.type})`));

// Check foreign keys are enabled
console.log('\nForeign keys enabled:', db.pragma('foreign_keys', { simple: true }));

db.close();
