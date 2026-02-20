const Database = require('better-sqlite3');
const db = new Database('./data/omniwriter.db');

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('Tables found:', tables.map(t => t.name).join(', '));
console.log('Total tables:', tables.length);

// Verify key columns on users table
const usersSchema = db.prepare("PRAGMA table_info(users)").all();
console.log('\nUsers table columns:', usersSchema.map(c => c.name).join(', '));

// Verify key columns on projects table
const projectsSchema = db.prepare("PRAGMA table_info(projects)").all();
console.log('\nProjects table columns:', projectsSchema.map(c => c.name).join(', '));

// Verify key columns on chapters table
const chaptersSchema = db.prepare("PRAGMA table_info(chapters)").all();
console.log('\nChapters table columns:', chaptersSchema.map(c => c.name).join(', '));

// Check foreign keys are enabled
const fkStatus = db.prepare("PRAGMA foreign_keys").get();
console.log('\nForeign keys enabled:', fkStatus);

db.close();
