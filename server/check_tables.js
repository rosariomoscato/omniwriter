const Database = require('better-sqlite3');
const db = new Database('data/omniwriter.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables found:', tables.length);
tables.forEach(t => console.log('  -', t.name));

// Verify foreign keys are enabled
const fk = db.pragma('foreign_keys');
console.log('\nForeign keys enabled:', fk);

// Check key columns on users table
const userCols = db.prepare("PRAGMA table_info(users)").all();
console.log('\nUsers table columns:', userCols.length);
userCols.forEach(c => console.log('  -', c.name, c.type));

// Check key columns on projects table
const projectCols = db.prepare("PRAGMA table_info(projects)").all();
console.log('\nProjects table columns:', projectCols.length);

// Check key columns on chapters table
const chapterCols = db.prepare("PRAGMA table_info(chapters)").all();
console.log('\nChapters table columns:', chapterCols.length);

db.close();
